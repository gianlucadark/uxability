import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

function clamp(v: number): number {
    return Math.min(100, Math.max(0, Math.round(v)));
}

export interface AEOResult {
    aeo: number;
    structureScore: number;
    contentScore: number;
    authorityScore: number;
    signals: {
        schema: number;
        headings: number;
        semantic: number;
        metaDesc: number;
        qa: number;
        chunks: number;
        definitions: number;
        answerFirst: number;
        author: number;
        datePublished: number;
        citations: number;
        llmsTxt: number;
        faqSchema: number;
    };
    error?: string;
}

async function computeAEO(url: string): Promise<AEOResult> {
    const origin = new URL(url).origin;

    const zeroResult = (error: string): AEOResult => ({
        aeo: 0, structureScore: 0, contentScore: 0, authorityScore: 0,
        signals: { schema: 0, headings: 0, semantic: 0, metaDesc: 0, qa: 0, chunks: 0, definitions: 0, answerFirst: 0, author: 0, datePublished: 0, citations: 0, llmsTxt: 0, faqSchema: 0 },
        error,
    });

    const [htmlResult, llmsResult] = await Promise.allSettled([
        fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; UXAbility/1.0; +https://uxability.vercel.app)" },
            signal: AbortSignal.timeout(12000),
        }),
        fetch(`${origin}/llms.txt`, { signal: AbortSignal.timeout(5000) }),
    ]);

    if (htmlResult.status === "rejected" || !htmlResult.value.ok) {
        return zeroResult("fetch_failed");
    }

    const html = await htmlResult.value.text();
    const $ = cheerio.load(html);
    const llmsTxtScore = llmsResult.status === "fulfilled" && llmsResult.value.ok ? 100 : 0;

    // ── STRUCTURE signals ───────────────────────────────────────────────────

    // schema: any valid JSON-LD present
    let schemaScore = 0;
    $('script[type="application/ld+json"]').each((_, el) => {
        try { JSON.parse($(el).html() || ""); schemaScore = 100; } catch {}
    });

    // headings: exactly one H1, no level skips (e.g. H1→H3 without H2)
    const h1Count = $("h1").length;
    let headingViolations = h1Count === 1 ? 0 : Math.abs(h1Count - 1);
    let lastLevel = 0;
    $("h1,h2,h3,h4,h5,h6").each((_, el) => {
        const level = parseInt((el as any).tagName.replace("h", ""), 10);
        if (level > lastLevel + 1) headingViolations++;
        lastLevel = level;
    });
    const headingsScore = clamp(Math.max(0, 100 - headingViolations * 20));

    // semantic: article / section / main / nav / aside / header / footer
    const semanticCount = $("article, section, main, nav, aside, header, footer").length;
    const semanticScore = clamp((semanticCount / 4) * 100);

    // metaDesc: present and ≥ 50 chars
    const metaDescContent = $('meta[name="description"]').attr("content") || "";
    const metaDescScore = metaDescContent.length >= 50 ? 100 : metaDescContent.length > 0 ? 50 : 0;

    // ── CONTENT signals ─────────────────────────────────────────────────────

    // qa: ratio of interrogative H2/H3 headings
    const interrogRe = /^(come|perch[eé]|cosa|quando|dove|chi|what|how|why|is|does|can|are|which|who|where|when)\b/i;
    let interrogCount = 0, totalH23 = 0;
    $("h2, h3").each((_, el) => {
        totalH23++;
        if (interrogRe.test($(el).text().trim())) interrogCount++;
    });
    const qaScore = totalH23 > 0 ? clamp((interrogCount / totalH23) * 100) : 0;

    // chunks: average paragraph word-count should be 40-80
    const pLengths = $("p").toArray()
        .map(el => $(el).text().trim().split(/\s+/).filter(Boolean).length)
        .filter(l => l > 5);
    let chunksScore = 0;
    if (pLengths.length > 0) {
        const avg = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
        chunksScore = avg >= 40 && avg <= 80 ? 100
            : avg < 40 ? clamp((avg / 40) * 100)
            : clamp((80 / avg) * 100);
    }

    // definitions: "X è/is/are/defined as" patterns + <dl> elements
    const bodyText = $.text();
    const defPatterns = (bodyText.match(/\b\w+\s+(è|is|are|defined as|means|refers to)\s/gi) || []).length;
    const definitionsScore = clamp(Math.min(100, ((defPatterns + $("dl").length) / 3) * 100));

    // answerFirst: first <p> after each H2/H3 ≤ 100 words
    let afRespected = 0, afTotal = 0;
    $("h2, h3").each((_, el) => {
        afTotal++;
        const firstP = $(el).nextAll("p").first();
        if (firstP.length && firstP.text().trim().split(/\s+/).filter(Boolean).length <= 100) {
            afRespected++;
        }
    });
    const answerFirstScore = afTotal > 0 ? clamp((afRespected / afTotal) * 100) : 0;

    // ── AUTHORITY signals ───────────────────────────────────────────────────

    // author: meta author, rel=author, schema Person, .author/.byline classes
    const authorScore = (
        $('meta[name="author"]').length > 0 ||
        $('[rel="author"]').length > 0 ||
        $('[itemprop="author"], [class*="author"], [class*="byline"]').length > 0 ||
        bodyText.includes('"author"')
    ) ? 100 : 0;

    // datePublished: article:published_time, datePublished schema, <time datetime>
    const datePublishedScore = (
        $('meta[property="article:published_time"]').length > 0 ||
        $('[itemprop="datePublished"]').length > 0 ||
        $("time[datetime]").length > 0 ||
        bodyText.includes('"datePublished"')
    ) ? 100 : 0;

    // citations: external outbound links (≥ 5 = 100)
    const externalLinks = $("a[href]").toArray().filter(el => {
        const href = $(el).attr("href") || "";
        try { return new URL(href).origin !== origin; } catch { return false; }
    }).length;
    const citationsScore = clamp((externalLinks / 5) * 100);

    // faqSchema: JSON-LD @type FAQPage or HowTo
    let faqScore = 0;
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const parsed = JSON.parse($(el).html() || "");
            const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
            if (items.some(j => j["@type"] === "FAQPage" || j["@type"] === "HowTo")) faqScore = 100;
        } catch {}
    });

    // ── Weighted aggregation ────────────────────────────────────────────────
    // Pillar weights: Structure 35%, Content 40%, Authority 25%
    // Signal weights within pillars (as described in spec):
    //   Structure: schema 15, headings 10, semantic 8, metaDesc 7  → total 40
    //   Content:   qa 15, chunks 12, definitions 10, answerFirst 8 → total 45
    //   Authority: author 6, datePublished 5, citations 7, llmsTxt 5, faqSchema 8 → total 31

    const structure  = (schemaScore * 15 + headingsScore * 10 + semanticScore * 8 + metaDescScore * 7) / 40;
    const content    = (qaScore * 15 + chunksScore * 12 + definitionsScore * 10 + answerFirstScore * 8) / 45;
    const authority  = (authorScore * 6 + datePublishedScore * 5 + citationsScore * 7 + llmsTxtScore * 5 + faqScore * 8) / 31;

    const aeo = clamp(structure * 0.35 + content * 0.40 + authority * 0.25);

    return {
        aeo,
        structureScore: clamp(structure),
        contentScore: clamp(content),
        authorityScore: clamp(authority),
        signals: {
            schema: schemaScore,
            headings: headingsScore,
            semantic: semanticScore,
            metaDesc: metaDescScore,
            qa: qaScore,
            chunks: chunksScore,
            definitions: definitionsScore,
            answerFirst: answerFirstScore,
            author: authorScore,
            datePublished: datePublishedScore,
            citations: citationsScore,
            llmsTxt: llmsTxtScore,
            faqSchema: faqScore,
        },
    };
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
        const result = await computeAEO(url);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("AEO analysis error:", error);
        return NextResponse.json({ error: error.message || "AEO analysis failed" }, { status: 500 });
    }
}
