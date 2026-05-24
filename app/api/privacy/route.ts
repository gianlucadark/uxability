import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const TRACKER_DB: Record<string, { name: string; category: "advertising" | "analytics" | "functional" | "consent" | "cdn" }> = {
  "doubleclick.net": { name: "Google DoubleClick", category: "advertising" },
  "googlesyndication.com": { name: "Google AdSense", category: "advertising" },
  "adservice.google.com": { name: "Google Ad Service", category: "advertising" },
  "facebook.net": { name: "Facebook Pixel", category: "advertising" },
  "connect.facebook.net": { name: "Facebook SDK", category: "advertising" },
  "ads.twitter.com": { name: "Twitter Ads", category: "advertising" },
  "static.ads-twitter.com": { name: "Twitter Ads", category: "advertising" },
  "ads.linkedin.com": { name: "LinkedIn Ads", category: "advertising" },
  "snap.licdn.com": { name: "LinkedIn Insight", category: "advertising" },
  "platform.linkedin.com": { name: "LinkedIn Widget", category: "advertising" },
  "mc.yandex.ru": { name: "Yandex Metrica", category: "advertising" },
  "ads.pubmatic.com": { name: "PubMatic", category: "advertising" },
  "criteo.com": { name: "Criteo", category: "advertising" },
  "criteo.net": { name: "Criteo", category: "advertising" },
  "outbrain.com": { name: "Outbrain", category: "advertising" },
  "taboola.com": { name: "Taboola", category: "advertising" },
  "scorecardresearch.com": { name: "Scorecard Research", category: "advertising" },
  "quantserve.com": { name: "Quantserve", category: "advertising" },
  "rubiconproject.com": { name: "Rubicon Project", category: "advertising" },
  "casalemedia.com": { name: "Casale Media", category: "advertising" },
  "adsymptotic.com": { name: "Adsymptotic", category: "advertising" },
  "google-analytics.com": { name: "Google Analytics", category: "analytics" },
  "analytics.google.com": { name: "Google Analytics 4", category: "analytics" },
  "googletagmanager.com": { name: "Google Tag Manager", category: "analytics" },
  "googletagservices.com": { name: "Google Tag Services", category: "analytics" },
  "hotjar.com": { name: "Hotjar", category: "analytics" },
  "clarity.ms": { name: "Microsoft Clarity", category: "analytics" },
  "mixpanel.com": { name: "Mixpanel", category: "analytics" },
  "segment.io": { name: "Segment", category: "analytics" },
  "segment.com": { name: "Segment", category: "analytics" },
  "heap.io": { name: "Heap Analytics", category: "analytics" },
  "fullstory.com": { name: "FullStory", category: "analytics" },
  "logrocket.com": { name: "LogRocket", category: "analytics" },
  "amplitude.com": { name: "Amplitude", category: "analytics" },
  "mouseflow.com": { name: "Mouseflow", category: "analytics" },
  "smartlook.com": { name: "Smartlook", category: "analytics" },
  "cdn.cookielaw.org": { name: "OneTrust", category: "consent" },
  "optanon.net": { name: "OneTrust", category: "consent" },
  "cookiebot.com": { name: "Cookiebot", category: "consent" },
  "usercentrics.eu": { name: "Usercentrics", category: "consent" },
  "trustarc.com": { name: "TrustArc", category: "consent" },
  "iubenda.com": { name: "Iubenda", category: "consent" },
  "axeptio.eu": { name: "Axeptio", category: "consent" },
  "cookiehub.com": { name: "CookieHub", category: "consent" },
  "intercom.io": { name: "Intercom", category: "functional" },
  "intercomcdn.com": { name: "Intercom CDN", category: "functional" },
  "crisp.chat": { name: "Crisp Chat", category: "functional" },
  "tawk.to": { name: "Tawk.to", category: "functional" },
  "zopim.com": { name: "Zendesk Chat", category: "functional" },
  "zendesk.com": { name: "Zendesk", category: "functional" },
  "hubspot.com": { name: "HubSpot", category: "functional" },
  "hs-scripts.com": { name: "HubSpot Scripts", category: "functional" },
  "freshdesk.com": { name: "Freshdesk", category: "functional" },
  "drift.com": { name: "Drift", category: "functional" },
  "cdnjs.cloudflare.com": { name: "Cloudflare CDN", category: "cdn" },
  "ajax.googleapis.com": { name: "Google APIs CDN", category: "cdn" },
  "fonts.googleapis.com": { name: "Google Fonts CSS", category: "cdn" },
  "fonts.gstatic.com": { name: "Google Fonts Files", category: "cdn" },
  "use.fontawesome.com": { name: "Font Awesome", category: "cdn" },
  "bootstrapcdn.com": { name: "Bootstrap CDN", category: "cdn" },
  "unpkg.com": { name: "unpkg CDN", category: "cdn" },
  "jsdelivr.net": { name: "jsDelivr CDN", category: "cdn" },
};

const CONSENT_SIGNALS = [
  "cookielaw", "cookiebot", "usercentrics", "trustarc", "iubenda",
  "axeptio", "cookiehub", "onetrust", "gdpr", "consent", "cookie-notice",
  "cookie-banner", "cookie-consent", "tarteaucitron", "klaro",
];

function extractDomain(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchTracker(domain: string): (typeof TRACKER_DB)[string] | null {
  if (TRACKER_DB[domain]) return TRACKER_DB[domain];
  for (const [key, val] of Object.entries(TRACKER_DB)) {
    if (domain.endsWith(`.${key}`) || domain === key) return val;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UXAbilityBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!pageRes.ok) {
      return NextResponse.json({ error: "fetch_failed", privacyScore: 50, trackers: [], thirdPartyDomains: 0, consentDetected: false, grade: "C" });
    }

    const html = await pageRes.text();
    const $ = cheerio.load(html);
    const baseDomain = extractDomain(url) || "";

    const externalUrls = new Set<string>();

    // Collect external resource URLs
    $("script[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src && (src.startsWith("http") || src.startsWith("//"))) {
        externalUrls.add(src.startsWith("//") ? `https:${src}` : src);
      }
    });
    $("iframe[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src && (src.startsWith("http") || src.startsWith("//"))) {
        externalUrls.add(src.startsWith("//") ? `https:${src}` : src);
      }
    });
    $("link[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.startsWith("http") || href.startsWith("//"))) {
        externalUrls.add(href.startsWith("//") ? `https:${href}` : href);
      }
    });
    // Tracking pixels (1x1 images)
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src") || "";
      const w = parseInt($(el).attr("width") || "99", 10);
      const h = parseInt($(el).attr("height") || "99", 10);
      if ((w <= 2 || h <= 2) && (src.startsWith("http") || src.startsWith("//"))) {
        externalUrls.add(src.startsWith("//") ? `https:${src}` : src);
      }
    });

    // Check consent signals in HTML text
    const htmlLower = html.toLowerCase();
    const consentDetected = CONSENT_SIGNALS.some((s) => htmlLower.includes(s));

    // Classify detected external resources
    const trackerMap = new Map<string, { name: string; category: string; domain: string }>();
    const thirdPartyDomains = new Set<string>();

    for (const extUrl of externalUrls) {
      const domain = extractDomain(extUrl);
      if (!domain || domain === baseDomain || domain.endsWith(`.${baseDomain}`)) continue;
      thirdPartyDomains.add(domain);
      const tracker = matchTracker(domain);
      if (tracker && !trackerMap.has(domain)) {
        trackerMap.set(domain, { ...tracker, domain });
      }
    }

    const trackers = Array.from(trackerMap.values());

    // Score calculation
    let score = 100;
    const adTrackers = trackers.filter((t) => t.category === "advertising");
    const analyticsTrackers = trackers.filter((t) => t.category === "analytics");
    const functionalTrackers = trackers.filter((t) => t.category === "functional");

    score -= Math.min(adTrackers.length * 18, 54);
    score -= Math.min(analyticsTrackers.length * 8, 24);
    score -= Math.min(functionalTrackers.length * 3, 9);

    if (consentDetected) score = Math.min(score + 12, 100);

    score = Math.max(0, Math.min(100, score));

    const grade =
      score >= 85 ? "A" :
      score >= 70 ? "B" :
      score >= 50 ? "C" :
      score >= 30 ? "D" : "F";

    return NextResponse.json({
      privacyScore: score,
      grade,
      trackers,
      thirdPartyDomains: thirdPartyDomains.size,
      consentDetected,
      adCount: adTrackers.length,
      analyticsCount: analyticsTrackers.length,
      functionalCount: functionalTrackers.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "fetch_failed", privacyScore: 50, trackers: [], thirdPartyDomains: 0, consentDetected: false, grade: "C" });
  }
}
