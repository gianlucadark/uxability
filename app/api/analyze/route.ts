import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

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
        const response = await fetch(startUrl);
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
                    const res = await fetch(link);
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
    options: { metadataFallback?: boolean } = {},
) {
    const { metadataFallback = true } = options;
    const locale = lang === 'en' ? 'en-US' : 'it';
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        url
    )}&category=performance&category=accessibility&category=best-practices&category=seo&locale=${locale}${apiKey ? `&key=${apiKey}` : ""}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "Failed to analyze " + url);
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

    const seoScore = Math.round(categoriesData.seo.score * 100);
    const accessibilityScore = Math.round(categoriesData.accessibility.score * 100);

    // AEO (Answer Engine Optimization) score — deterministic calculation from PageSpeed signals.
    // Measures how well the page is structured for AI-driven answer engines (SGE, Perplexity, etc.).
    // Three weighted pillars:
    //   40% Structure:      structured-data, heading-order, meta-description, document-title
    //   30% Content clarity: link-text, image-alt, crawlable-anchors
    //   30% Discoverability: SEO score + canonical
    const aeo = (() => {
        const a = (id: string) => audits[id]?.score ?? 0;

        const structuredData  = a("structured-data");
        const headingOrder    = a("heading-order");
        const metaDesc        = a("meta-description");
        const docTitle        = a("document-title");
        const linkText        = a("link-text");
        const imageAlt        = a("image-alt");
        const crawlable       = a("crawlable-anchors");
        const canonical       = a("canonical");

        const structure      = structuredData * 0.40 + headingOrder * 0.25 + metaDesc * 0.20 + docTitle * 0.15;
        const clarity        = linkText * 0.40 + imageAlt * 0.40 + crawlable * 0.20;
        const discoverability = (seoScore / 100) * 0.70 + canonical * 0.30;

        const raw = structure * 0.40 + clarity * 0.30 + discoverability * 0.30;
        return Math.round(raw * 100);
    })();

    const aeoBreakdown = {
        structuredData:  audits["structured-data"]?.score ?? 0,
        headingOrder:    audits["heading-order"]?.score ?? 0,
        metaDescription: audits["meta-description"]?.score ?? 0,
        documentTitle:   audits["document-title"]?.score ?? 0,
        linkText:        audits["link-text"]?.score ?? 0,
        imageAlt:        audits["image-alt"]?.score ?? 0,
        crawlableAnchors: audits["crawlable-anchors"]?.score ?? 0,
        canonical:       audits["canonical"]?.score ?? 1,
    };

    const scores = {
        performance: Math.round(categoriesData.performance.score * 100),
        accessibility: accessibilityScore,
        bestPractices: Math.round(categoriesData["best-practices"].score * 100),
        seo: seoScore,
        aeo,
    };

    const getDetailedAudits = (categoryKey: string) => {
        const category = categoriesData[categoryKey];
        return category.auditRefs.map((ref: any) => {
            const audit = audits[ref.id];
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
                    "User-Agent": "Mozilla/5.0 (compatible; SiteAnalyzer/1.0; +https://example.com/bot)",
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
        aeoBreakdown,
    };
}

export async function POST(req: Request) {
    try {
        const { url, lang, fast = false, maxPages } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const apiKey = process.env.PAGESPEED_API_KEY;
        const requestedMaxPages = fast
            ? 1
            : Math.min(4, Math.max(1, Number.isFinite(Number(maxPages)) ? Number(maxPages) : 4));
        // Always run the metadata fallback (single GET) — without it the llms.txt
        // generator and social preview render empty placeholders for every page.
        const analyzeOptions = { metadataFallback: true };

        // 1. Analyze main URL first
        const mainResult = await analyzeUrl(url, apiKey, lang, analyzeOptions);
        const allResults = [mainResult];
        const analyzedUrls = new Set<string>([normalizeUrl(mainResult.url)]);

        if (requestedMaxPages <= 1) {
            return NextResponse.json({ results: allResults });
        }

        // 2. Discover potential candidates recursively to ensure we hit 5
        const potentialLinks = await recursiveCrawl(url, requestedMaxPages);

        // 3. Analyze sequentially until we reach 5 successful results
        for (const link of potentialLinks) {
            if (allResults.length >= requestedMaxPages) break;

            const normLink = normalizeUrl(link);
            if (analyzedUrls.has(normLink)) continue;

            try {
                const result = await analyzeUrl(link, apiKey, lang, analyzeOptions);
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
    } catch (error: any) {
        console.error("Analysis error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze URL" }, { status: 500 });
    }
}
