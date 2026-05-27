import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { assertPublicHttpUrl, getClientIp, isPublicUrlError } from "@/lib/server/publicApi";

const AI_SCAN_LIMIT_PER_IP = 3;
const AI_SCAN_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// In-memory shared cache to dedupe identical AEO requests across IPs.
// TTL matches the client-side cache so callers see a consistent freshness window
// without burning Gemini quota when many users analyze the same popular URL.
const AEO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AEO_CACHE_MAX_ENTRIES = 500;

type CachedAEO = { result: AEOResult; expiresAt: number };
const aeoCache = new Map<string, CachedAEO>();

function getCachedAeo(key: string): AEOResult | null {
    const entry = aeoCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        aeoCache.delete(key);
        return null;
    }
    return entry.result;
}

function setCachedAeo(key: string, result: AEOResult) {
    // Only cache successful, AI-enhanced runs — fallbacks shouldn't be served
    // to the next caller who might be eligible for a real AI evaluation.
    if (result.error || !result.aiEnhanced) return;
    if (aeoCache.size >= AEO_CACHE_MAX_ENTRIES) {
        const oldestKey = aeoCache.keys().next().value;
        if (oldestKey) aeoCache.delete(oldestKey);
    }
    aeoCache.set(key, { result, expiresAt: Date.now() + AEO_CACHE_TTL_MS });
}

type IpAIScanBucket = {
    count: number;
    resetAt: number;
};

const ipAIScanBuckets = new Map<string, IpAIScanBucket>();

function consumeAIScan(ip: string) {
    const now = Date.now();
    const current = ipAIScanBuckets.get(ip);

    if (!current || current.resetAt <= now) {
        const resetAt = now + AI_SCAN_LIMIT_WINDOW_MS;
        ipAIScanBuckets.set(ip, { count: 1, resetAt });
        return { aiAllowed: true, remaining: AI_SCAN_LIMIT_PER_IP - 1, resetAt };
    }

    if (current.count >= AI_SCAN_LIMIT_PER_IP) {
        return { aiAllowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    return { aiAllowed: true, remaining: AI_SCAN_LIMIT_PER_IP - current.count, resetAt: current.resetAt };
}

function getAIRateLimitHeaders(remaining: number, resetAt: number, aiAllowed: boolean) {
    return {
        "X-AI-RateLimit-Limit": String(AI_SCAN_LIMIT_PER_IP),
        "X-AI-RateLimit-Remaining": String(remaining),
        "X-AI-RateLimit-Reset": new Date(resetAt).toISOString(),
        "X-AI-Enhanced": String(aiAllowed),
    };
}

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

export type AIFallbackReason = "no_api_key" | "fetch_error" | "blocked" | "invalid_response" | "model_error";

export interface AEOResult {
    aeo: number;
    structureScore: number;
    contentScore: number;
    authorityScore: number;
    aiScore?: number;
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
    aiEnhanced?: boolean;
    aiFallbackReason?: AIFallbackReason;
    error?: string;
}

type AEOSignals = AEOResult["signals"];

interface GeminiAEOAssessment {
    signals?: Partial<AEOSignals>;
}

function calculateScores(signals: AEOSignals) {
    const structure = (signals.schema * 15 + signals.headings * 10 + signals.semantic * 8 + signals.metaDesc * 7) / 40;
    const content = (signals.qa * 15 + signals.chunks * 12 + signals.definitions * 10 + signals.answerFirst * 8) / 45;

    // Authority: base pillar uses signals every quality page can satisfy (author, date,
    // citations). llms.txt and FAQ schema are rare extras — score them as bonuses on top,
    // so their absence doesn't drag a well-built page to zero authority.
    const baseAuthority = (signals.author * 6 + signals.datePublished * 5 + signals.citations * 7) / 18;
    const llmsBonus = (signals.llmsTxt / 100) * 10;
    const faqBonus = (signals.faqSchema / 100) * 12;
    const authority = baseAuthority + llmsBonus + faqBonus;

    return {
        aeo: clamp(structure * 0.35 + content * 0.40 + authority * 0.25),
        structureScore: clamp(structure),
        contentScore: clamp(content),
        authorityScore: clamp(authority),
    };
}

function calculateAIEnhancedTotal(
    deterministicScores: Pick<AEOResult, "structureScore" | "contentScore" | "authorityScore">,
    aiScore: number,
) {
    // When the AI has actually evaluated the page, trust it as the primary signal.
    // Deterministic values stay as a safety floor (40% combined) so a hallucinated AI
    // response can't push a clearly broken page to 100.
    return clamp(
        deterministicScores.structureScore * 0.15 +
        deterministicScores.contentScore * 0.15 +
        deterministicScores.authorityScore * 0.10 +
        aiScore * 0.60,
    );
}

function boundedSignal(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return clamp(value);
}

function stripCodeFence(value: string): string {
    return value
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function extractJsonObject(value: string): unknown | null {
    const clean = stripCodeFence(value);

    try {
        return JSON.parse(clean);
    } catch {
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) return null;

        try {
            return JSON.parse(clean.slice(start, end + 1));
        } catch {
            return null;
        }
    }
}

function firstNonEmpty(values: Array<string | undefined>): string {
    return values.find((value) => value && value.trim())?.trim() || "";
}

function buildGeminiContext(
    $: cheerio.CheerioAPI,
    url: string,
    origin: string,
    signals: AEOSignals,
    jsonLdTypes: string[],
) {
    const headings = $("h1,h2,h3").toArray()
        .slice(0, 35)
        .map((el) => `${String($(el).prop("tagName") || "").toLowerCase()}: ${$(el).text().trim().replace(/\s+/g, " ")}`)
        .filter((text) => text.length > 4);

    const paragraphs = $("p").toArray()
        .map((el) => $(el).text().trim().replace(/\s+/g, " "))
        .filter((text) => text.length >= 40)
        .slice(0, 18);

    const internalLinks = $("a[href]").toArray().filter((el) => {
        const href = $(el).attr("href") || "";
        try {
            return new URL(href, origin).origin === origin;
        } catch {
            return false;
        }
    }).length;

    const externalLinks = $("a[href]").toArray().filter((el) => {
        const href = $(el).attr("href") || "";
        try {
            return new URL(href, origin).origin !== origin;
        } catch {
            return false;
        }
    }).slice(0, 12).map((el) => {
        const href = $(el).attr("href") || "";
        const label = $(el).text().trim().replace(/\s+/g, " ").slice(0, 120);
        return `${label || "external link"} -> ${href}`;
    });

    return {
        url,
        title: firstNonEmpty([
            $("title").text(),
            $('meta[property="og:title"]').attr("content"),
        ]),
        description: firstNonEmpty([
            $('meta[name="description"]').attr("content"),
            $('meta[property="og:description"]').attr("content"),
        ]),
        canonical: $('link[rel="canonical"]').attr("href") || "",
        language: $("html").attr("lang") || "",
        jsonLdTypes: Array.from(new Set(jsonLdTypes)).slice(0, 20),
        headings,
        paragraphs,
        externalLinks,
        counts: {
            words: $("body").text().trim().split(/\s+/).filter(Boolean).length,
            h1: $("h1").length,
            h2: $("h2").length,
            h3: $("h3").length,
            paragraphs: $("p").length,
            lists: $("ul,ol").length,
            tables: $("table").length,
            images: $("img").length,
            internalLinks,
            externalLinks: externalLinks.length,
        },
        deterministicSignals: signals,
    };
}

async function enhanceAEOWithGemini(
    base: AEOResult,
    context: ReturnType<typeof buildGeminiContext>,
): Promise<AEOResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return { ...base, aiFallbackReason: "no_api_key" };

    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = [
        "You are scoring Answer Engine Optimization (AEO) for a real web page.",
        "Return JSON only. Score each signal from 0 to 100 based on the real page content provided.",
        "",
        "Important: the `deterministicSignals` block contains regex/HTML heuristics. They are *baselines*, not constraints. Override them when the page quality differs from what a regex can see. In particular:",
        "  - multiple H1s in separate sectioning roots are valid HTML5; don't punish them as the regex does",
        "  - lists, tables, definition lists and short paragraphs can all be valid 'answer blocks' — give credit even when the heading isn't a literal question",
        "  - corporate landing or product pages can be highly answerable without Q&A-style headings; score by clarity of answers, not by heading form",
        "  - long paragraphs (80-150 words) are fine for editorial content; only penalize bloat",
        "",
        "Reward: clear direct answers near the top of sections, concise definitions, structured data that matches content, trustworthy authorship cues, freshness signals, links to authoritative sources.",
        "Penalize: thin content, vague marketing claims, unclear authorship, broken hierarchy, content that doesn't actually answer likely user questions, missing or stale information.",
        "",
        "Factual binary signals — `schema`, `llmsTxt`, `faqSchema` — require explicit page markup. If `deterministicSignals` reports 0 for these, keep them at 0 (they cannot be inferred from prose).",
        "",
        "SCORING CALIBRATION — anchor each signal to this scale (avoid hugging the middle out of caution):",
        "  90-100  Exemplary: matches the best pages on the open web for this signal.",
        "          Examples: a Wikipedia article (qa/chunks/citations), MDN docs (definitions/answerFirst), a New York Times byline (author).",
        "  75-89   Strong: a typical well-built professional site clearly satisfies the signal.",
        "          Examples: Stripe docs, Apple product page hero copy, a polished SaaS landing with FAQ section, a corporate About page with named author.",
        "  60-74   Adequate: the signal is present and usable, but with notable gaps or weak execution.",
        "  40-59   Weak: partial or shallow — the signal is hinted at but not delivered.",
        "  20-39   Poor: barely present, mostly missing.",
        "  0-19    Absent or broken.",
        "",
        "Per-signal guidance:",
        "  - `qa`: high if the page clearly answers identifiable user questions (any heading form, any answer format). A great product page answering 'what is X / how does X work / why X' scores 80+, not 30.",
        "  - `answerFirst`: high if sections lead with the answer (paragraph, list, table, definition, headline number) before context/marketing fluff.",
        "  - `chunks`: high if the page reads in well-sized digestible blocks — 40-150 word paragraphs, bullet lists, scannable structure. Don't punish editorial prose.",
        "  - `definitions`: high if key concepts are explicitly defined or have inline glossaries; medium if defined implicitly through clear examples.",
        "  - `headings`: high if the outline is logical and the H1 conveys the page's primary subject; don't penalize multiple H1s in sectioning roots.",
        "  - `semantic`: high if main/article/section/nav/header/footer are used purposefully, not just `div` soup.",
        "  - `metaDesc`: high if 50-160 chars and accurately summarizes the page; partial credit for shorter but on-topic.",
        "  - `citations`: high for pages with several outbound links to authoritative sources OR strong internal linking to canonical references; corporate sites with intentionally few outlinks can still score 70 if internal linking is excellent.",
        "  - `author`/`datePublished`: high when explicit; partial credit for inferred (org byline, copyright year on a frequently-updated page).",
        "",
        "Do NOT center-clamp around 50. A great Wikipedia-like page should land 85-95 overall, a strong corporate page 70-85, a thin landing 40-55. Be willing to use the full 0-100 range.",
        "",
        "Page context:",
        JSON.stringify(context),
    ].join("\n");

    try {
        const signalSchema = {
            type: "OBJECT",
            properties: Object.fromEntries(
                (Object.keys(base.signals) as Array<keyof AEOSignals>).map((key) => [
                    key,
                    {
                        type: "INTEGER",
                        minimum: 0,
                        maximum: 100,
                    },
                ]),
            ),
            required: Object.keys(base.signals),
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.15,
                    topP: 0.8,
                    maxOutputTokens: 1200,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            signals: signalSchema,
                        },
                        required: ["signals"],
                    },
                },
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.warn("AI AEO enhancement failed:", response.status, await response.text());
            return { ...base, aiFallbackReason: "model_error" };
        }

        const payload = await response.json();
        const candidate = payload?.candidates?.[0];
        const text = payload?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text || "")
            .join("")
            .trim();

        if (!text) {
            const blockReason = candidate?.finishReason || payload?.promptFeedback?.blockReason || "unknown";
            console.warn("AI AEO enhancement returned no text:", blockReason);
            return { ...base, aiFallbackReason: blockReason.toString().toLowerCase().includes("block") ? "blocked" : "invalid_response" };
        }

        const parsed = extractJsonObject(text) as GeminiAEOAssessment | null;
        if (!parsed?.signals) {
            console.warn("AI AEO enhancement returned invalid JSON:", text.slice(0, 240));
            return { ...base, aiFallbackReason: "invalid_response" };
        }

        const aiSignals = parsed.signals || {};
        const refinedSignals = { ...base.signals };
        const aiOnlySignals = { ...base.signals };

        // AI gets primary weight on judgement signals AND on structural signals where the
        // regex only sees presence/absence (the AI can tell good schema from boilerplate).
        // Pure-factual binaries (schema, llmsTxt, faqSchema) stay at 25% so the AI can't
        // hallucinate markup that isn't there.
        const aiPrimaryKeys = new Set<keyof AEOSignals>([
            "qa", "chunks", "definitions", "answerFirst",
            "citations", "author", "datePublished",
            "headings", "semantic", "metaDesc",
        ]);

        (Object.keys(refinedSignals) as Array<keyof AEOSignals>).forEach((key) => {
            const aiValue = boundedSignal(aiSignals[key]);
            if (aiValue === null) return;

            const baseValue = refinedSignals[key];
            const aiWeight = aiPrimaryKeys.has(key) ? 0.65 : 0.25;

            aiOnlySignals[key] = aiValue;
            refinedSignals[key] = clamp(baseValue * (1 - aiWeight) + aiValue * aiWeight);
        });

        const aiScore = calculateScores(aiOnlySignals).aeo;
        // Pillars shown in the UI use REFINED signals (AI+deterministic blend) when AI ran.
        // Showing raw deterministic pillars next to a high AI score is misleading — e.g.
        // Wikipedia's "History" H2s get qa=0 deterministically but the AI correctly sees
        // them as answerable. The refined blend reflects what the analyzer actually believes.
        const refinedScores = calculateScores(refinedSignals);

        return {
            ...base,
            ...refinedScores,
            aeo: calculateAIEnhancedTotal(refinedScores, aiScore),
            aiScore,
            signals: refinedSignals,
            aiEnhanced: true,
        };
    } catch (error) {
        console.warn("AI AEO enhancement error:", error);
        return { ...base, aiFallbackReason: "fetch_error" };
    }
}

async function computeAEO(url: string, options: { enhanceWithAI?: boolean } = {}): Promise<AEOResult> {
    const { enhanceWithAI = true } = options;
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
        aiEnhanced: false,
        error,
    });

    const [htmlResult, llmsResult] = await Promise.allSettled([
        fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; UXAbility/1.0; +https://uxability.vercel.app)" },
            signal: AbortSignal.timeout(12000),
        }),
        fetch(`${origin}/llms.txt`, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; UXAbility/1.0; +https://uxability.vercel.app)" },
            signal: AbortSignal.timeout(5000),
        }),
    ]);

    if (htmlResult.status === "rejected" || !htmlResult.value.ok) {
        return zeroResult("fetch_failed");
    }

    const html = await htmlResult.value.text();
    const $ = cheerio.load(html);
    const htmlLower = html.toLowerCase();
    const bodyText = normalizeText($.text());

    let llmsTxtScore = 0;
    if (llmsResult.status === "fulfilled" && llmsResult.value.ok) {
        const llmsBody = await llmsResult.value.text();
        // Reject soft-404s: must not be HTML and must contain meaningful text content
        const isHtml = llmsBody.trimStart().startsWith("<") || /<html[\s>]/i.test(llmsBody);
        const hasContent = llmsBody.trim().length > 20;
        if (!isHtml && hasContent) llmsTxtScore = 100;
    }

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
    // Schema scored by richness, not mere presence — boilerplate Organization shouldn't
    // tie with a page that ships Article + Product + FAQPage.
    const richSchemaTypes = new Set(["article", "newsarticle", "blogposting", "product", "recipe", "howto", "faqpage", "question", "course", "event", "review"]);
    const richHits = jsonLdTypes.filter((t) => richSchemaTypes.has(t)).length;
    const schemaScore = parsedJsonLd.length === 0
        ? 0
        : richHits > 0
            ? clamp(70 + Math.min(richHits, 3) * 10)
            : 60;

    const h1Count = $("h1").length;
    // HTML5 allows multiple H1s in distinct sectioning roots. Only flag the clear failures:
    // no H1 at all (severe) or >3 H1s (likely abuse).
    let headingViolations = 0;
    if (h1Count === 0) headingViolations += 2;
    else if (h1Count > 3) headingViolations += 1;

    let lastLevel = 0;
    $("h1,h2,h3,h4,h5,h6").each((_, el) => {
        const tagName = String($(el).prop("tagName") || "");
        const level = parseInt(tagName.replace("H", ""), 10);
        if (level > lastLevel + 1) headingViolations++;
        lastLevel = level;
    });
    const headingsScore = clamp(Math.max(0, 100 - headingViolations * 15));

    const semanticCount = $("article, section, main, nav, aside, header, footer").length;
    const semanticScore = clamp((semanticCount / 4) * 100);

    const metaDescContent = $('meta[name="description"]').attr("content") || "";
    const metaDescLen = metaDescContent.length;
    // Google guideline: ~50-160 chars. Reward the sweet spot, penalize too short or too long.
    const metaDescScore = metaDescLen === 0
        ? 0
        : metaDescLen < 50
            ? clamp((metaDescLen / 50) * 60)
            : metaDescLen <= 160
                ? 100
                : metaDescLen <= 300
                    ? clamp(100 - ((metaDescLen - 160) / 140) * 30)
                    : 60;

    // Content signals
    // qa: a section is "answerable" if its heading is a question OR it's immediately
    // followed by a concise answer block (short paragraph, list, table, definition list).
    // The original logic punished any non-Q&A page; in reality landing/product pages
    // can be highly answerable without literal question headings.
    const interrogRe = /^(come|perche|cosa|quando|dove|chi|what|how|why|is|does|can|are|which|who|where|when)\b/i;
    const answerBlockTags = new Set(["ul", "ol", "dl", "table"]);
    let answerableCount = 0;
    let totalH23 = 0;
    $("h2, h3").each((_, el) => {
        totalH23++;
        const text = normalizeText($(el).text());
        if (interrogRe.test(text)) {
            answerableCount++;
            return;
        }
        const next = $(el).next();
        if (!next.length) return;
        const tag = String(next.prop("tagName") || "").toLowerCase();
        if (answerBlockTags.has(tag)) {
            answerableCount++;
            return;
        }
        if (tag === "p") {
            const txt = next.text().trim();
            const sentenceCount = txt.split(/[.!?]+\s+/).filter((s) => s.length > 5).length;
            if (txt.length <= 400 && sentenceCount <= 3 && txt.length > 0) answerableCount++;
        }
    });
    const qaScore = totalH23 > 0 ? clamp((answerableCount / totalH23) * 100) : 0;

    const pLengths = $("p").toArray()
        .map((el) => $(el).text().trim().split(/\s+/).filter(Boolean).length)
        .filter((length) => length > 5);
    let chunksScore = 0;
    if (pLengths.length > 0) {
        const avg = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
        // Wider sweet-spot (40-140 words) — editorial prose is fine. Only real bloat hurts.
        chunksScore = avg >= 40 && avg <= 140
            ? 100
            : avg < 40
                ? clamp((avg / 40) * 100)
                : clamp((140 / avg) * 100);
    }

    // Definitions: avoid Italian "e" (conjunction) — match only English "is/are/means/…"
    // or explicit Italian "è/sono/significa/si definisce".
    const defEnglish = (bodyText.match(/\b[\w-]+\s+(is|are|defined as|means|refers to)\s/gi) || []).length;
    const defItalian = (bodyText.match(/\b[\w-]+\s+(e' |e |sono |significa |si definisce |si intende )/gi) || []).length;
    // Body text was normalized so "è" became "e" with a trailing space. To avoid matching
    // the conjunction "e", require it to be preceded by a noun-like token and followed by
    // an adjective/article — approximated by lookahead for common Italian copula patterns:
    const defItalianStrict = (bodyText.match(/\b[\w-]+\s+e\s+(un|una|uno|il|la|lo|i|gli|le|definito|definita)\b/gi) || []).length;
    const defTotal = defEnglish + defItalian + defItalianStrict + $("dl").length;
    const definitionsScore = clamp(Math.min(100, (defTotal / 4) * 100));

    // answerFirst: section opens with a concise paragraph OR an answer block (list/table/dl).
    let afRespected = 0;
    let afTotal = 0;
    $("h2, h3").each((_, el) => {
        afTotal++;
        const firstBlock = $(el).nextUntil("h1, h2, h3").first();
        if (!firstBlock.length) return;
        const tag = String(firstBlock.prop("tagName") || "").toLowerCase();
        if (answerBlockTags.has(tag)) {
            afRespected++;
            return;
        }
        if (tag === "p") {
            const wordCount = firstBlock.text().trim().split(/\s+/).filter(Boolean).length;
            if (wordCount > 0 && wordCount <= 120) afRespected++;
        }
    });
    const answerFirstScore = afTotal > 0 ? clamp((afRespected / afTotal) * 100) : 0;

    // Authority signals — graded, not binary. A site with byline class but no schema
    // shouldn't score the same zero as a site with no authorship cue at all.
    const authorExplicit = $('meta[name="author"]').length > 0 ||
        $('[rel="author"]').length > 0 ||
        $('[itemprop="author"]').length > 0 ||
        htmlLower.includes('"author"') ||
        jsonLdTypes.includes("person");
    const authorWeak = $('[class*="author"], [class*="byline"]').length > 0;
    const authorScore = authorExplicit ? 100 : authorWeak ? 60 : 0;

    const dateExplicit = $('meta[property="article:published_time"]').length > 0 ||
        $('[itemprop="datePublished"]').length > 0 ||
        htmlLower.includes('"datepublished"');
    const dateTimeTag = $("time[datetime]").length > 0;
    const dateCopyright = /\b(©|copyright|\(c\))\s*\d{4}/i.test(html);
    const datePublishedScore = dateExplicit ? 100 : dateTimeTag ? 70 : dateCopyright ? 40 : 0;

    const externalLinks = $("a[href]").toArray().filter((el) => {
        const href = $(el).attr("href") || "";
        try {
            return new URL(href, origin).origin !== origin;
        } catch {
            return false;
        }
    }).length;
    // Log-saturated: 4 links ≈ 63, 8 ≈ 86, 12 ≈ 95. Forgiving for sites with a handful
    // of curated outbound links instead of demanding 5+ to start scoring.
    const citationsScore = clamp(Math.round(100 * (1 - Math.exp(-externalLinks / 4))));

    const faqScore = jsonLdTypes.includes("faqpage") || jsonLdTypes.includes("howto") ? 100 : 0;

    const signals = {
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
    };

    const baseResult = {
        ...calculateScores(signals),
        signals,
        aiEnhanced: false,
    };

    if (!enhanceWithAI) {
        return { ...baseResult, aiFallbackReason: "blocked" };
    }

    return enhanceAEOWithGemini(
        baseResult,
        buildGeminiContext($, url, origin, signals, jsonLdTypes),
    );
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
        const safeUrl = await assertPublicHttpUrl(url);

        // Serve from shared cache when available — same TTL as the client-side cache
        // so quota-eligible IPs still get a fresh AI run after expiry.
        const cached = getCachedAeo(safeUrl);
        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    "X-AEO-Cache": "hit",
                    "X-AI-Enhanced": String(Boolean(cached.aiEnhanced)),
                },
            });
        }

        const aiRateLimit = consumeAIScan(getClientIp(req));
        const result = await computeAEO(safeUrl, { enhanceWithAI: aiRateLimit.aiAllowed });
        setCachedAeo(safeUrl, result);

        return NextResponse.json(
            result,
            {
                headers: {
                    ...getAIRateLimitHeaders(aiRateLimit.remaining, aiRateLimit.resetAt, aiRateLimit.aiAllowed),
                    "X-AEO-Cache": "miss",
                },
            },
        );
    } catch (error: unknown) {
        if (isPublicUrlError(error)) {
            return NextResponse.json({ error: "URL must be public http(s)", code: "invalid_url" }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : "AEO analysis failed";
        console.error("AEO analysis error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
