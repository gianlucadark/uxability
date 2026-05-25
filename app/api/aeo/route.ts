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
    error?: string;
}

type AEOSignals = AEOResult["signals"];

interface GeminiAEOAssessment {
    signals?: Partial<AEOSignals>;
}

function calculateScores(signals: AEOSignals) {
    const structure = (signals.schema * 15 + signals.headings * 10 + signals.semantic * 8 + signals.metaDesc * 7) / 40;
    const content = (signals.qa * 15 + signals.chunks * 12 + signals.definitions * 10 + signals.answerFirst * 8) / 45;
    const authority = (signals.author * 6 + signals.datePublished * 5 + signals.citations * 7 + signals.llmsTxt * 5 + signals.faqSchema * 8) / 31;

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
    return clamp(
        deterministicScores.structureScore * 0.25 +
        deterministicScores.contentScore * 0.25 +
        deterministicScores.authorityScore * 0.15 +
        aiScore * 0.35,
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
    if (!apiKey) return base;

    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = [
        "You are scoring Answer Engine Optimization for a web page.",
        "Return JSON only. Score each signal from 0 to 100.",
        "Evaluate whether the page is likely to be quoted by AI answer engines: clear direct answers, question coverage, concise chunks, definitions, trustworthy authorship, publication freshness, and useful citations.",
        "Do not reward generic SEO filler. Penalize thin content, vague claims, unclear authorship, poor source quality, or content that does not answer likely user questions.",
        "Keep deterministic technical signals close to the provided values unless the page context proves they are misleading.",
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
            return base;
        }

        const payload = await response.json();
        const candidate = payload?.candidates?.[0];
        const text = payload?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text || "")
            .join("")
            .trim();

        if (!text) {
            console.warn("AI AEO enhancement returned no text:", candidate?.finishReason || payload?.promptFeedback?.blockReason || "unknown");
            return base;
        }

        const parsed = extractJsonObject(text) as GeminiAEOAssessment | null;
        if (!parsed?.signals) {
            console.warn("AI AEO enhancement returned invalid JSON:", text.slice(0, 240));
            return base;
        }

        const aiSignals = parsed.signals || {};
        const refinedSignals = { ...base.signals };
        const aiOnlySignals = { ...base.signals };
        const baseScores = calculateScores(base.signals);

        (Object.keys(refinedSignals) as Array<keyof AEOSignals>).forEach((key) => {
            const aiValue = boundedSignal(aiSignals[key]);
            if (aiValue === null) return;

            const baseValue = refinedSignals[key];
            const aiWeight = ["qa", "chunks", "definitions", "answerFirst", "citations", "author", "datePublished"].includes(key)
                ? 0.65
                : 0.25;

            aiOnlySignals[key] = aiValue;
            refinedSignals[key] = clamp(baseValue * (1 - aiWeight) + aiValue * aiWeight);
        });

        const aiScore = calculateScores(aiOnlySignals).aeo;

        return {
            ...base,
            ...baseScores,
            aeo: calculateAIEnhancedTotal(baseScores, aiScore),
            aiScore,
            signals: refinedSignals,
            aiEnhanced: true,
        };
    } catch (error) {
        console.warn("AI AEO enhancement error:", error);
        return base;
    }
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
        aiEnhanced: false,
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

    return enhanceAEOWithGemini(
        baseResult,
        buildGeminiContext($, url, origin, signals, jsonLdTypes),
    );
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
