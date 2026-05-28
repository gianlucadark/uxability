import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { applyRateLimit, assertPublicHttpUrl, rateLimitResponse } from "@/lib/server/publicApi";
import { SITE_URL } from "@/lib/site";

// Vercel Hobby cap is 60s. We give PageSpeed 55s and let the client retry
// automatically on timeout so each attempt gets a fresh 60s window.
export const maxDuration = 60;

const PAGESPEED_TIMEOUT_MS = 55_000;
const PAGESPEED_RETRY_TIMEOUT_MS = 55_000;
const ANALYZE_RATE_LIMIT = { limit: 30, windowMs: 24 * 60 * 60 * 1000 };

type AnalyzeErrorCode =
    | "invalid_url"
    | "timeout"
    | "network"
    | "quota"
    | "blocked"
    | "unavailable"
    | "no_result"
    | "generic";

class PublicAnalyzeError extends Error {
    code: AnalyzeErrorCode;
    status: number;
    cause?: unknown;

    constructor(code: AnalyzeErrorCode, message: string, status = 500, cause?: unknown) {
        super(message);
        this.name = "PublicAnalyzeError";
        this.code = code;
        this.status = status;
        this.cause = cause;
    }
}

function publicAnalyzeMessage(code: AnalyzeErrorCode, lang: string = "it") {
    const messages = {
        it: {
            invalid_url: "Inserisci un URL valido e completo, ad esempio https://example.com.",
            timeout: "L'analisi sta impiegando troppo tempo. La pagina potrebbe essere molto pesante: riprova tra poco o analizza una pagina più leggera.",
            network: "Non siamo riusciti a raggiungere la pagina. Controlla che il sito sia online e riprova.",
            quota: "Il servizio di analisi è temporaneamente molto richiesto. Riprova tra qualche minuto.",
            blocked: "Questa pagina non può essere analizzata in questo momento. Potrebbe bloccare gli strumenti automatici o richiedere accesso.",
            unavailable: "Il servizio di analisi non è disponibile al momento. Riprova tra qualche minuto.",
            no_result: "L'analisi non ha restituito dati utilizzabili per questa pagina. Prova con un altro URL o riprova più tardi.",
            generic: "Non siamo riusciti a completare l'analisi. Riprova tra poco.",
        },
        en: {
            invalid_url: "Enter a valid full URL, for example https://example.com.",
            timeout: "The analysis is taking too long. The page may be very heavy: try again shortly or analyze a lighter page.",
            network: "We could not reach the page. Check that the site is online and try again.",
            quota: "The analysis service is temporarily busy. Please try again in a few minutes.",
            blocked: "This page cannot be analyzed right now. It may block automated tools or require access.",
            unavailable: "The analysis service is unavailable right now. Please try again in a few minutes.",
            no_result: "The analysis did not return usable data for this page. Try another URL or come back later.",
            generic: "We could not complete the analysis. Please try again shortly.",
        },
    };

    return messages[lang === "en" ? "en" : "it"][code];
}

function createPublicAnalyzeError(code: AnalyzeErrorCode, lang: string, status = 500, cause?: unknown) {
    return new PublicAnalyzeError(code, publicAnalyzeMessage(code, lang), status, cause);
}

function errorName(error: unknown) {
    return error instanceof Error ? error.name : "";
}

function pageSpeedErrorCode(status: number, detail: string): AnalyzeErrorCode {
    const lowerDetail = detail.toLowerCase();

    if (status === 429 || lowerDetail.includes("quota")) return "quota";
    if (status === 400 || lowerDetail.includes("invalid") || lowerDetail.includes("not a valid")) return "invalid_url";
    if (status === 401 || status === 403 || lowerDetail.includes("forbidden") || lowerDetail.includes("blocked")) return "blocked";
    if (status >= 500) return "unavailable";
    return "generic";
}

function normalizeUrl(urlStr: string) {
    try {
        const url = new URL(urlStr);
        const host = url.hostname.replace(/^www\./, "");
        let path = url.pathname.replace(/\/$/, "").replace(/\/(index\.(html|php|asp|aspx))$/i, "");
        if (!path) path = "/";
        return `${url.protocol}//${host}${path}`;
    } catch (e) {
        return urlStr;
    }
}

async function getLinksFromHtml(html: string, baseUrl: string) {
    const $ = cheerio.load(html);
    const linksSet = new Set<string>();
    const normalizedBase = normalizeUrl(baseUrl);
    const baseHost = new URL(normalizedBase).hostname;

    $("a").each((_, element) => {
        const href = $(element).attr("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        try {
            const url = new URL(href, baseUrl);
            const normalizedLink = normalizeUrl(url.toString());
            const linkHost = new URL(normalizedLink).hostname;

            if (
                linkHost === baseHost &&
                normalizedLink !== normalizedBase &&
                !normalizedLink.match(/\.(pdf|jpg|jpeg|png|gif|zip|gz|xml|txt|css|js|svg|webp|ico)$/i)
            ) {
                linksSet.add(normalizedLink);
            }
        } catch (e) { }
    });
    return Array.from(linksSet);
}

async function recursiveCrawl(startUrl: string, targetCount: number) {
    const normalizedStart = normalizeUrl(startUrl);
    const candidates = new Set<string>();
    const visitedForLinks = new Set<string>([normalizedStart]);

    try {
        // First pass: Main URL
        const response = await fetch(startUrl, {
            headers: {
                "User-Agent": `Mozilla/5.0 (compatible; UXAbility/1.0; +${SITE_URL})`,
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
        });
        if (!response.ok) return [];
        const html = await response.text();
        const firstLevelLinks = await getLinksFromHtml(html, startUrl);

        for (const link of firstLevelLinks) {
            candidates.add(link);
        }

        // Second pass: If not enough (less than 10 candidates), crawl the first few to find more
        if (candidates.size < targetCount) {
            const candidateArray = Array.from(candidates);
            for (const link of candidateArray) {
                if (candidates.size >= targetCount) break;
                if (visitedForLinks.has(link)) continue;

                visitedForLinks.add(link);
                try {
                    const res = await fetch(link, {
                        headers: {
                            "User-Agent": `Mozilla/5.0 (compatible; UXAbility/1.0; +${SITE_URL})`,
                            "Accept": "text/html,application/xhtml+xml",
                        },
                        redirect: "follow",
                    });
                    if (!res.ok) continue;
                    const subHtml = await res.text();
                    const secondLevelLinks = await getLinksFromHtml(subHtml, link);
                    for (const subLink of secondLevelLinks) {
                        if (subLink !== normalizedStart && !candidates.has(subLink)) {
                            candidates.add(subLink);
                        }
                        if (candidates.size >= targetCount) break;
                    }
                } catch (e) {
                    console.error(`Recursive crawl failed for ${link}`);
                }
            }
        }
    } catch (error) {
        console.error("Discovery error:", error);
    }

    return Array.from(candidates).slice(0, targetCount);
}

async function analyzeUrl(
    url: string,
    apiKey?: string,
    lang: string = 'it',
    options: { metadataFallback?: boolean; isRetry?: boolean } = {},
) {
    const { metadataFallback = true, isRetry = false } = options;
    const locale = lang === 'en' ? 'en-US' : 'it';
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        url
    )}&category=performance&category=accessibility&category=best-practices&category=seo&locale=${locale}${apiKey ? `&key=${apiKey}` : ""}`;
    const fetchTimeout = isRetry ? PAGESPEED_RETRY_TIMEOUT_MS : PAGESPEED_TIMEOUT_MS;

    let response: Response;
    try {
        response = await fetch(apiUrl, { signal: AbortSignal.timeout(fetchTimeout) });
    } catch (err: unknown) {
        const name = errorName(err);
        if (name === "TimeoutError" || name === "AbortError") {
            throw createPublicAnalyzeError("timeout", lang, 504, err);
        }
        throw createPublicAnalyzeError("network", lang, 502, err);
    }

    if (!response.ok) {
        // Try to read PageSpeed's structured error before failing.
        let detail = "";
        try {
            const payload = await response.json();
            detail = payload?.error?.message || JSON.stringify(payload?.error || {});
        } catch {
            try { detail = (await response.text()).slice(0, 240); } catch { /* ignore */ }
        }
        console.error("PageSpeed API error:", {
            url,
            status: response.status,
            detail: detail || "no detail",
        });
        const code = pageSpeedErrorCode(response.status, detail);
        throw createPublicAnalyzeError(code, lang, code === "invalid_url" ? 400 : 502);
    }

    const data = await response.json();

    if (data.error) {
        const detail = data.error.message || "Unknown PageSpeed error";
        console.error("PageSpeed payload error:", { url, detail });
        throw createPublicAnalyzeError(pageSpeedErrorCode(data.error.code || 500, detail), lang, 502);
    }

    if (!data.lighthouseResult) {
        console.error("PageSpeed returned no lighthouseResult:", { url });
        throw createPublicAnalyzeError("no_result", lang, 502);
    }

    const lighthouse = data.lighthouseResult;
    const categoriesData = lighthouse.categories;
    const audits = lighthouse.audits;
    const screenshot = lighthouse.audits["final-screenshot"]?.details?.data;
    const thumbnails = lighthouse.audits["screenshot-thumbnails"]?.details?.items || [];
    const fieldData = data.loadingExperience || null;

    const resourceSummary = lighthouse.audits["resource-summary"]?.details?.items || [];
    const mainThreadWork = lighthouse.audits["mainthread-work-breakdown"]?.details?.items || [];

    // Key Metrics extraction
    const keyMetrics = {
        lcp: audits["largest-contentful-paint"]?.displayValue,
        fid: audits["max-potential-fid"]?.displayValue,
        cls: audits["cumulative-layout-shift"]?.displayValue,
        tbt: audits["total-blocking-time"]?.displayValue,
        si: audits["speed-index"]?.displayValue,
        tti: audits["interactive"]?.displayValue,
        fcp: audits["first-contentful-paint"]?.displayValue,
        // Numeric values for calculations
        lcp_v: audits["largest-contentful-paint"]?.numericValue,
        cls_v: audits["cumulative-layout-shift"]?.numericValue,
        tbt_v: audits["total-blocking-time"]?.numericValue,
    };

    // PageSpeed's audit displayValue is a label, not the real title/description.
    // Start empty and let the HTML scrape below populate properly.
    const seoMetadata: {
        title: string;
        description: string;
        ogImage: string | null;
        favicon: string | null;
    } = {
        title: "",
        description: "",
        ogImage: audits["og-image"]?.details?.data || null,
        favicon: audits["favicon"]?.details?.data || null,
    };

    // Categories may be missing on the lightweight retry pass (performance-only).
    const safeScore = (key: string) => {
        const c = categoriesData?.[key];
        return c && typeof c.score === "number" ? Math.round(c.score * 100) : 0;
    };
    const scores = {
        performance: safeScore("performance"),
        accessibility: safeScore("accessibility"),
        bestPractices: safeScore("best-practices"),
        seo: safeScore("seo"),
    };

    const getDetailedAudits = (categoryKey: string) => {
        const category = categoriesData?.[categoryKey];
        if (!category?.auditRefs) return [];
        return category.auditRefs.map((ref: any) => {
            const audit = audits[ref.id];
            if (!audit) return { id: ref.id, title: ref.id, description: "", score: null, displayValue: "" };
            return {
                id: ref.id,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                displayValue: audit.displayValue,
            };
        });
    };

    const details = {
        performance: getDetailedAudits("performance"),
        accessibility: getDetailedAudits("accessibility"),
        bestPractices: getDetailedAudits("best-practices"),
        seo: getDetailedAudits("seo"),
    };

    const opportunities = Object.values(audits)
        // @ts-ignore
        .filter((audit: any) => audit.details?.type === "opportunity" && audit.score < 1)
        // @ts-ignore
        .sort((a: any, b: any) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
        .slice(0, 3)
        .map((audit: any) => ({
            title: audit.title,
            description: audit.description,
            score: audit.score,
            impact: audit.displayValue || (audit.details?.overallSavingsMs ? `${audit.details.overallSavingsMs}ms` : ""),
            level: audit.score < 0.5 ? "High" : audit.score < 0.9 ? "Medium" : "Low",
        }));

    // Always scrape the rendered HTML for meta tags — PageSpeed audits don't expose
    // the actual <title>/description text reliably (and they're empty for SPA shells anyway).
    // A single GET is cheap compared to the PageSpeed call we just made.
    if (metadataFallback) {
        try {
            const pageRes = await fetch(url, {
                headers: {
                    // Some sites return a generic shell without metadata to non-browser UAs.
                    "User-Agent": `Mozilla/5.0 (compatible; UXAbility/1.0; +${SITE_URL})`,
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": lang === "en" ? "en-US,en;q=0.9" : "it-IT,it;q=0.9,en;q=0.5",
                },
                redirect: "follow",
            });
            const html = await pageRes.text();
            const $ = cheerio.load(html);

            const pick = (...candidates: (string | undefined | null)[]) => {
                for (const c of candidates) {
                    const v = (c || "").trim().replace(/\s+/g, " ");
                    if (v) return v;
                }
                return "";
            };

            // Walk JSON-LD blocks looking for a "description" field on any node
            // (Organization, WebSite, Article, Product, etc.).
            const jsonLdDescription = (() => {
                const visit = (node: any): string | null => {
                    if (!node) return null;
                    if (Array.isArray(node)) {
                        for (const n of node) {
                            const v = visit(n);
                            if (v) return v;
                        }
                        return null;
                    }
                    if (typeof node === "object") {
                        if (typeof node.description === "string" && node.description.trim()) {
                            return node.description.trim();
                        }
                        if (Array.isArray(node["@graph"])) return visit(node["@graph"]);
                    }
                    return null;
                };
                const blocks = $('script[type="application/ld+json"]').toArray();
                for (const el of blocks) {
                    try {
                        const found = visit(JSON.parse($(el).text()));
                        if (found) return found;
                    } catch { /* malformed JSON-LD — skip */ }
                }
                return null;
            })();

            // Trim a free-text snippet to a clean sentence boundary, ~max chars.
            const sentenceTrim = (text: string, max = 200): string => {
                const clean = text.trim().replace(/\s+/g, " ");
                if (clean.length <= max) return clean;
                const slice = clean.slice(0, max);
                const lastStop = Math.max(
                    slice.lastIndexOf(". "),
                    slice.lastIndexOf("! "),
                    slice.lastIndexOf("? "),
                );
                if (lastStop > max * 0.5) return slice.slice(0, lastStop + 1);
                const lastSpace = slice.lastIndexOf(" ");
                return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + "…";
            };

            seoMetadata.title = pick(
                $('meta[property="og:title"]').attr("content"),
                $('meta[name="twitter:title"]').attr("content"),
                $('meta[itemprop="name"]').attr("content"),
                $("title").first().text(),
                $("h1").first().text(),
            );

            seoMetadata.description = pick(
                $('meta[name="description"]').attr("content"),
                $('meta[property="og:description"]').attr("content"),
                $('meta[name="twitter:description"]').attr("content"),
                $('meta[itemprop="description"]').attr("content"),
                $('meta[name="dc.description"], meta[name="DC.description"]').attr("content"),
                jsonLdDescription,
                // First paragraph in main content that's substantial enough
                (() => {
                    const candidates = $("article p, main p, [role='main'] p, section p, p")
                        .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
                        .get()
                        .filter(t => t.length > 60 && t.length < 600);
                    return candidates[0] ? sentenceTrim(candidates[0]) : "";
                })(),
                // Last resort: H1 + first short paragraph stitched together
                (() => {
                    const h1 = $("h1").first().text().trim().replace(/\s+/g, " ");
                    const lead = $("article p, main p, p")
                        .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
                        .get()
                        .find(t => t.length > 20);
                    if (h1 && lead) return sentenceTrim(`${h1} — ${lead}`);
                    return "";
                })(),
                // Very last resort: clean text from main/article, truncated.
                (() => {
                    const body = $("main, article, [role='main']").first().text()
                        || $("body").text();
                    const clean = body.replace(/\s+/g, " ").trim();
                    return clean.length > 60 ? sentenceTrim(clean) : "";
                })(),
            );

            // Reject obviously-junk descriptions (single word, only digits, page title repeated).
            if (
                seoMetadata.description &&
                (seoMetadata.description.length < 20 ||
                    seoMetadata.description.toLowerCase() === seoMetadata.title.toLowerCase())
            ) {
                seoMetadata.description = "";
            }

            if (!seoMetadata.ogImage) {
                seoMetadata.ogImage = pick(
                    $('meta[property="og:image"]').attr("content"),
                    $('meta[name="twitter:image"]').attr("content"),
                ) || null;
            }

            if (!seoMetadata.favicon) {
                seoMetadata.favicon = pick(
                    $('link[rel="icon"]').attr("href"),
                    $('link[rel="shortcut icon"]').attr("href"),
                    $('link[rel="apple-touch-icon"]').attr("href"),
                ) || new URL("/favicon.ico", url).toString();
            }
        } catch (e) {
            console.error("Manual meta extraction failed", e);
        }
    }

    return {
        scores,
        details,
        opportunities,
        url: lighthouse.finalUrl,
        screenshot,
        thumbnails,
        fieldData,
        resourceSummary,
        mainThreadWork,
        keyMetrics,
        seoMetadata,
    };
}

// Alias kept for call-site consistency. On Hobby (60s cap) there is no time
// for a server-side retry — the client handles retries instead.
const analyzeUrlResilient = analyzeUrl;

export async function POST(req: Request) {
    let responseLang = "it";

    const rateLimit = applyRateLimit(req, "analyze", ANALYZE_RATE_LIMIT);
    if (!rateLimit.allowed) {
        return rateLimitResponse(publicAnalyzeMessage("quota", responseLang));
    }

    let body: { url?: string; lang?: string; fast?: boolean; maxPages?: number; stream?: boolean };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: publicAnalyzeMessage("invalid_url", responseLang), code: "invalid_url" },
            { status: 400 },
        );
    }

    const { url, lang, fast = false, maxPages, stream = false } = body;
    responseLang = lang === "en" ? "en" : "it";

    if (!url) {
        return NextResponse.json(
            { error: publicAnalyzeMessage("invalid_url", responseLang), code: "invalid_url" },
            { status: 400 },
        );
    }

    let safeUrl: string;
    try {
        safeUrl = await assertPublicHttpUrl(url);
    } catch (safeUrlError) {
        const code = safeUrlError instanceof Error && safeUrlError.message === "invalid_url" ? "invalid_url" : "blocked";
        return NextResponse.json(
            { error: publicAnalyzeMessage(code, responseLang), code },
            { status: 400 },
        );
    }

    const apiKey = process.env.PAGESPEED_API_KEY;
    const requestedMaxPages = fast
        ? 1
        : Math.min(4, Math.max(1, Number.isFinite(Number(maxPages)) ? Number(maxPages) : 4));
    const analyzeOptions = { metadataFallback: true };

    // Streaming path — emit NDJSON so the UI can render the first page immediately
    // instead of waiting up to 4 × 55s for the full batch.
    if (stream) {
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                let closed = false;
                const send = (event: object) => {
                    if (closed) return;
                    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
                };
                const close = () => {
                    if (closed) return;
                    closed = true;
                    controller.close();
                };

                try {
                    send({ type: "start", total: requestedMaxPages });

                    let mainResult;
                    try {
                        mainResult = await analyzeUrlResilient(safeUrl, apiKey, responseLang, analyzeOptions);
                    } catch (error) {
                        const code = error instanceof PublicAnalyzeError ? error.code : "generic";
                        send({ type: "error", code, error: publicAnalyzeMessage(code, responseLang) });
                        return;
                    }

                    send({ type: "result", index: 0, result: mainResult });

                    if (requestedMaxPages <= 1) {
                        send({ type: "done" });
                        return;
                    }

                    const analyzedUrls = new Set<string>([normalizeUrl(mainResult.url)]);
                    const potentialLinks = await recursiveCrawl(safeUrl, requestedMaxPages);
                    console.log(`[analyze] crawl found ${potentialLinks.length} candidate(s) for ${safeUrl}`);
                    let emitted = 1;
                    let failedSubpages = 0;

                    for (const link of potentialLinks) {
                        if (emitted >= requestedMaxPages) break;
                        const normLink = normalizeUrl(link);
                        if (analyzedUrls.has(normLink)) continue;

                        try {
                            const result = await analyzeUrlResilient(link, apiKey, responseLang, analyzeOptions);
                            const normFinalUrl = normalizeUrl(result.url);
                            if (analyzedUrls.has(normFinalUrl)) continue;
                            analyzedUrls.add(normFinalUrl);
                            send({ type: "result", index: emitted, result });
                            emitted += 1;
                        } catch (e) {
                            failedSubpages += 1;
                            console.error(`[analyze] subpage ${link} failed:`, e instanceof Error ? e.message : e);
                        }
                    }

                    console.log(`[analyze] emitted ${emitted}/${requestedMaxPages} results (${failedSubpages} failures)`);
                    send({ type: "done" });
                } catch (error) {
                    console.error("Streaming analysis error:", error);
                    send({ type: "error", code: "generic", error: publicAnalyzeMessage("generic", responseLang) });
                } finally {
                    close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    }

    // Non-streaming path (kept for callers that still expect a single JSON payload).
    try {
        const mainResult = await analyzeUrlResilient(safeUrl, apiKey, responseLang, analyzeOptions);
        const allResults = [mainResult];
        const analyzedUrls = new Set<string>([normalizeUrl(mainResult.url)]);

        if (requestedMaxPages <= 1) {
            return NextResponse.json({ results: allResults });
        }

        const potentialLinks = await recursiveCrawl(safeUrl, requestedMaxPages);
        for (const link of potentialLinks) {
            if (allResults.length >= requestedMaxPages) break;
            const normLink = normalizeUrl(link);
            if (analyzedUrls.has(normLink)) continue;

            try {
                const result = await analyzeUrlResilient(link, apiKey, responseLang, analyzeOptions);
                const normFinalUrl = normalizeUrl(result.url);
                if (!analyzedUrls.has(normFinalUrl)) {
                    allResults.push(result);
                    analyzedUrls.add(normFinalUrl);
                }
            } catch (e) {
                console.error(`Page ${link} failed PageSpeed, trying next...`);
            }
        }

        return NextResponse.json({ results: allResults });
    } catch (error: unknown) {
        console.error("Analysis error:", error);
        if (error instanceof PublicAnalyzeError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: error.status },
            );
        }
        return NextResponse.json(
            { error: publicAnalyzeMessage("generic", responseLang), code: "generic" },
            { status: 500 },
        );
    }
}
