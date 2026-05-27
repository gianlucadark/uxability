import { applyRateLimit, assertPublicHttpUrl, rateLimitResponse } from "@/lib/server/publicApi";
import { SITE_URL } from "@/lib/site";

// Keep Node runtime: assertPublicHttpUrl relies on node:dns / node:net to block
// SSRF against private ranges, which isn't available on edge.
const BADGE_RATE_LIMIT = { limit: 120, windowMs: 60 * 60 * 1000 };
const BADGE_CACHE_TTL = 60 * 60 * 6; // 6h shared cache — score doesn't change minute-to-minute

type ScoreColor = { fill: string; label: string };

function scoreToBand(score: number): ScoreColor {
    if (score >= 85) return { fill: "#0f8f68", label: "excellent" };
    if (score >= 70) return { fill: "#3f6f8f", label: "good" };
    if (score >= 50) return { fill: "#b7791f", label: "fair" };
    return { fill: "#bd3150", label: "poor" };
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderBadge(opts: {
    metricLabel: string;
    score: number;
    siteLabel: string;
}): string {
    const { metricLabel, score, siteLabel } = opts;
    const band = scoreToBand(score);
    const leftText = escapeXml(metricLabel.toUpperCase());
    const rightText = `${score}/100`;
    const subText = escapeXml(siteLabel);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="64" viewBox="0 0 260 64" role="img" aria-label="${leftText}: ${rightText}">
  <title>UXAbility ${leftText} ${rightText}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffdf4"/>
      <stop offset="100%" stop-color="#f1ece1"/>
    </linearGradient>
  </defs>
  <rect width="260" height="64" rx="8" fill="url(#bg)" stroke="#e2dccf"/>
  <rect x="0" y="0" width="6" height="64" rx="3" fill="${band.fill}"/>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
    <text x="18" y="22" font-size="10" font-weight="700" fill="#756d64" letter-spacing="1.2">${leftText}</text>
    <text x="18" y="46" font-size="22" font-weight="800" fill="#201c18">${rightText}</text>
    <text x="18" y="58" font-size="9" fill="#756d64">${subText}</text>
    <text x="248" y="20" text-anchor="end" font-size="9" font-weight="700" fill="${band.fill}" letter-spacing="1">${band.label.toUpperCase()}</text>
    <text x="248" y="58" text-anchor="end" font-size="9" font-weight="600" fill="#a59c8e">UXABILITY</text>
  </g>
</svg>`;
}

function errorBadge(message: string): Response {
    const svg = renderBadge({ metricLabel: "AEO", score: 0, siteLabel: message });
    return new Response(svg, {
        status: 400,
        headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

async function fetchAeoScore(targetUrl: string): Promise<number | null> {
    try {
        const res = await fetch(`${SITE_URL}/api/aeo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl }),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.aeo === "number" ? data.aeo : null;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const rateLimit = applyRateLimit(req, "badge", BADGE_RATE_LIMIT);
    if (!rateLimit.allowed) return rateLimitResponse();

    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");
    if (!target) return errorBadge("missing url param");

    let safeUrl: string;
    try {
        safeUrl = await assertPublicHttpUrl(target);
    } catch {
        return errorBadge("invalid url");
    }

    const score = await fetchAeoScore(safeUrl);
    if (score === null) return errorBadge("score unavailable");

    const host = (() => {
        try { return new URL(safeUrl).hostname.replace(/^www\./, ""); } catch { return safeUrl; }
    })();

    const svg = renderBadge({
        metricLabel: "AEO Score",
        score,
        siteLabel: host.length > 32 ? host.slice(0, 31) + "…" : host,
    });

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": `public, max-age=${BADGE_CACHE_TTL}, s-maxage=${BADGE_CACHE_TTL}, stale-while-revalidate=86400`,
        },
    });
}
