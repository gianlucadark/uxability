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
        if (candidates.size < 10) {
            const candidateArray = Array.from(candidates);
            for (const link of candidateArray) {
                if (candidates.size >= 10) break;
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
                        if (candidates.size >= 10) break;
                    }
                } catch (e) {
                    console.error(`Recursive crawl failed for ${link}`);
                }
            }
        }
    } catch (error) {
        console.error("Discovery error:", error);
    }

    return Array.from(candidates).slice(0, 10);
}

async function analyzeUrl(url: string, apiKey?: string, lang: string = 'it') {
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
    console.log("RESULT", lighthouse);

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

    const seoMetadata = {
        title: audits["document-title"]?.displayValue || "Nessun Titolo",
        description: audits["meta-description"]?.displayValue || "Nessuna descrizione trovata per questo sito.",
        ogImage: audits["og-image"]?.displayValue || null,
        favicon: audits["favicon"]?.displayValue || null
    };

    // Try to extract more SEO data if available in audits or by a quick fetch if needed
    // But PageSpeed usually has some of this in its audits if enabled. 
    // Let's check some common audit IDs for images.
    const ogImageAudit = audits["og-image"];
    if (ogImageAudit && ogImageAudit.details && ogImageAudit.details.data) {
        seoMetadata.ogImage = ogImageAudit.details.data;
    }

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

    // Fallback: Fetch HTML to get meta tags that PageSpeed might miss
    try {
        const pageRes = await fetch(url);
        const html = await pageRes.text();
        const $ = cheerio.load(html);

        if (!seoMetadata.ogImage) {
            seoMetadata.ogImage = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content') || null;
        }

        if (!seoMetadata.favicon) {
            seoMetadata.favicon = $('link[rel="icon"]').attr('href') ||
                $('link[rel="shortcut icon"]').attr('href') ||
                new URL('/favicon.ico', url).toString();
        }

        // If title/desc are still missing or very short, try to get them from HTML
        if (seoMetadata.title === "Nessun Titolo") {
            seoMetadata.title = $('title').text() || $('meta[property="og:title"]').attr('content') || "Nessun Titolo";
        }
        if (seoMetadata.description.includes("Nessuna descrizione")) {
            seoMetadata.description = $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content') ||
                seoMetadata.description;
        }
    } catch (e) {
        console.error("Manual meta extraction failed", e);
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
        const { url, lang } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const apiKey = process.env.PAGESPEED_API_KEY;

        // 1. Analyze main URL first
        const mainResult = await analyzeUrl(url, apiKey, lang);
        const allResults = [mainResult];
        const analyzedUrls = new Set<string>([normalizeUrl(mainResult.url)]);

        // 2. Discover potential candidates recursively to ensure we hit 5
        const potentialLinks = await recursiveCrawl(url, 5);

        // 3. Analyze sequentially until we reach 5 successful results
        for (const link of potentialLinks) {
            if (allResults.length >= 5) break;

            const normLink = normalizeUrl(link);
            if (analyzedUrls.has(normLink)) continue;

            try {
                const result = await analyzeUrl(link, apiKey, lang);
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
