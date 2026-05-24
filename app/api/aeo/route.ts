import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

function clamp(v: number): number {
    return Math.min(100, Math.max(0, Math.round(v)));
}

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function collectJsonLdTypes(value: unknown): string[] {
    if (!value || typeof value !== "object") return [];

    const jsonLd = value as Record<string, unknown>;
    const typeValue = jsonLd["@type"];
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    const ownTypes = types.filter(Boolean).map((type) => String(type).toLowerCase());
    const graph = jsonLd["@graph"];
    const graphTypes = Array.isArray(graph)
        ? graph.flatMap(collectJsonLdTypes)
        : [];

    return [...ownTypes, ...graphTypes];
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
        aeo: 0,
        structureScore: 0,
        contentScore: 0,
        authorityScore: 0,
        signals: {
            schema: 0,
            headings: 0,
            semantic: 0,
            metaDesc: 0,
            qa: 0,
            chunks: 0,
            definitions: 0,
            answerFirst: 0,
            author: 0,
            datePublished: 0,
            citations: 0,
            llmsTxt: 0,
            faqSchema: 0,
        },
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
    const htmlLower = html.toLowerCase();
    const bodyText = normalizeText($.text());
    const llmsTxtScore = llmsResult.status === "fulfilled" && llmsResult.value.ok ? 100 : 0;

    const parsedJsonLd = $('script[type="application/ld+json"]').toArray().flatMap((el) => {
        try {
            const parsed = JSON.parse($(el).html() || "");
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [];
        }
    });
    const jsonLdTypes = parsedJsonLd.flatMap(collectJsonLdTypes);

    // Structure signals
    const schemaScore = parsedJsonLd.length > 0 ? 100 : 0;

    const h1Count = $("h1").length;
    let headingViolations = h1Count === 1 ? 0 : Math.abs(h1Count - 1);
    let lastLevel = 0;
    $("h1,h2,h3,h4,h5,h6").each((_, el) => {
        const tagName = String($(el).prop("tagName") || "");
        const level = parseInt(tagName.replace("H", ""), 10);
        if (level > lastLevel + 1) headingViolations++;
        lastLevel = level;
    });
    const headingsScore = clamp(Math.max(0, 100 - headingViolations * 20));

    const semanticCount = $("article, section, main, nav, aside, header, footer").length;
    const semanticScore = clamp((semanticCount / 4) * 100);

    const metaDescContent = $('meta[name="description"]').attr("content") || "";
    const metaDescScore = metaDescContent.length >= 50 ? 100 : metaDescContent.length > 0 ? 50 : 0;

    // Content signals
    const interrogRe = /^(come|perche|cosa|quando|dove|chi|what|how|why|is|does|can|are|which|who|where|when)\b/i;
    let interrogCount = 0;
    let totalH23 = 0;
    $("h2, h3").each((_, el) => {
        totalH23++;
        if (interrogRe.test(normalizeText($(el).text()))) interrogCount++;
    });
    const qaScore = totalH23 > 0 ? clamp((interrogCount / totalH23) * 100) : 0;

    const pLengths = $("p").toArray()
        .map((el) => $(el).text().trim().split(/\s+/).filter(Boolean).length)
        .filter((length) => length > 5);
    let chunksScore = 0;
    if (pLengths.length > 0) {
        const avg = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
        chunksScore = avg >= 40 && avg <= 80
            ? 100
            : avg < 40
                ? clamp((avg / 40) * 100)
                : clamp((80 / avg) * 100);
    }

    const defPatterns = (bodyText.match(/\b[\w-]+\s+(e|is|are|defined as|means|refers to)\s/gi) || []).length;
    const definitionsScore = clamp(Math.min(100, ((defPatterns + $("dl").length) / 3) * 100));

    let afRespected = 0;
    let afTotal = 0;
    $("h2, h3").each((_, el) => {
        afTotal++;
        const firstP = $(el).nextAll("p").first();
        const wordCount = firstP.text().trim().split(/\s+/).filter(Boolean).length;
        if (firstP.length && wordCount <= 100) afRespected++;
    });
    const answerFirstScore = afTotal > 0 ? clamp((afRespected / afTotal) * 100) : 0;

    // Authority signals
    const authorScore = (
        $('meta[name="author"]').length > 0 ||
        $('[rel="author"]').length > 0 ||
        $('[itemprop="author"], [class*="author"], [class*="byline"]').length > 0 ||
        htmlLower.includes('"author"') ||
        jsonLdTypes.includes("person")
    ) ? 100 : 0;

    const datePublishedScore = (
        $('meta[property="article:published_time"]').length > 0 ||
        $('[itemprop="datePublished"]').length > 0 ||
        $("time[datetime]").length > 0 ||
        htmlLower.includes('"datepublished"')
    ) ? 100 : 0;

    const externalLinks = $("a[href]").toArray().filter((el) => {
        const href = $(el).attr("href") || "";
        try {
            return new URL(href, origin).origin !== origin;
        } catch {
            return false;
        }
    }).length;
    const citationsScore = clamp((externalLinks / 5) * 100);

    const faqScore = jsonLdTypes.includes("faqpage") || jsonLdTypes.includes("howto") ? 100 : 0;

    const structure = (schemaScore * 15 + headingsScore * 10 + semanticScore * 8 + metaDescScore * 7) / 40;
    const content = (qaScore * 15 + chunksScore * 12 + definitionsScore * 10 + answerFirstScore * 8) / 45;
    const authority = (authorScore * 6 + datePublishedScore * 5 + citationsScore * 7 + llmsTxtScore * 5 + faqScore * 8) / 31;
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "AEO analysis failed";
        console.error("AEO analysis error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
