import { SITE_URL } from "@/lib/site";

type Lang = "it" | "en";

interface AnyResult {
    url: string;
    scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
    keyMetrics?: Record<string, string | number | undefined>;
    fieldData?: { metrics?: Record<string, { percentile: number; category: string }> } | null;
    resourceSummary?: Array<{ resourceType: string; transferSize: number; requestCount: number; label?: string }>;
    opportunities?: Array<{ title: string; description?: string; level?: string; impact?: string }>;
    seoMetadata?: { title?: string; description?: string };
}

interface AnyAEO {
    aeo?: number;
    aiScore?: number;
    aiEnhanced?: boolean;
    structureScore?: number;
    contentScore?: number;
    authorityScore?: number;
}

interface AnyPrivacy {
    privacyScore?: number;
    grade?: string;
    trackers?: Array<{ name: string; category: string; domain: string }>;
    thirdPartyDomains?: number;
    consentDetected?: boolean;
}

function fmtBytes(bytes: number) {
    if (!bytes) return "0 KB";
    return bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(bytes / 1024).toFixed(2)} KB`;
}

function scoreEmoji(score: number) {
    if (score >= 85) return "🟢";
    if (score >= 50) return "🟡";
    return "🔴";
}

export function buildMarkdownReport(opts: {
    results: AnyResult[];
    aeoResult: AnyAEO | null;
    privacyResult: AnyPrivacy | null;
    language: Lang;
}): string {
    const { results, aeoResult, privacyResult, language: lang } = opts;
    if (!results.length) return "";

    const labels = lang === "it"
        ? {
            title: "UXAbility — Audit",
            url: "URL",
            generated: "Generato il",
            scores: "Punteggi",
            perf: "Performance",
            a11y: "Accessibilità",
            best: "Best Practices",
            seo: "SEO",
            aeo: "AEO",
            aiAeo: "AEO (AI)",
            privacy: "Privacy",
            structure: "Struttura",
            content: "Contenuto",
            authority: "Autorevolezza",
            crux: "Core Web Vitals (utenti reali)",
            weight: "Composizione pagina",
            type: "Tipo",
            req: "Richieste",
            size: "Dimensione",
            actions: "Azioni prioritarie",
            severity: "Gravità",
            impact: "Impatto",
            trackers: "Tracker rilevati",
            consent: "Consent manager",
            yes: "rilevato",
            no: "non rilevato",
            page: "Pagina",
            poweredBy: "Generato con UXAbility",
        }
        : {
            title: "UXAbility — Audit",
            url: "URL",
            generated: "Generated on",
            scores: "Scores",
            perf: "Performance",
            a11y: "Accessibility",
            best: "Best Practices",
            seo: "SEO",
            aeo: "AEO",
            aiAeo: "AEO (AI)",
            privacy: "Privacy",
            structure: "Structure",
            content: "Content",
            authority: "Authority",
            crux: "Core Web Vitals (real users)",
            weight: "Page composition",
            type: "Type",
            req: "Requests",
            size: "Size",
            actions: "Priority actions",
            severity: "Severity",
            impact: "Impact",
            trackers: "Detected trackers",
            consent: "Consent manager",
            yes: "detected",
            no: "not detected",
            page: "Page",
            poweredBy: "Generated with UXAbility",
        };

    const lines: string[] = [];
    const mainUrl = results[0].url;

    lines.push(`# ${labels.title}`);
    lines.push("");
    lines.push(`**${labels.url}:** ${mainUrl}`);
    lines.push(`**${labels.generated}:** ${new Date().toLocaleString(lang === "it" ? "it-IT" : "en-US")}`);
    lines.push("");

    // Top-level dashboard for the main URL
    const main = results[0];
    lines.push(`## ${labels.scores}`);
    lines.push("");
    lines.push(`| ${labels.scores} | ${main.scores.performance} | ${main.scores.accessibility} | ${main.scores.bestPractices} | ${main.scores.seo} |`);
    lines.push(`|---|---|---|---|---|`);
    lines.push(`|   | ${scoreEmoji(main.scores.performance)} ${labels.perf} | ${scoreEmoji(main.scores.accessibility)} ${labels.a11y} | ${scoreEmoji(main.scores.bestPractices)} ${labels.best} | ${scoreEmoji(main.scores.seo)} ${labels.seo} |`);
    lines.push("");

    if (aeoResult && typeof aeoResult.aeo === "number") {
        lines.push(`### ${labels.aeo}: ${scoreEmoji(aeoResult.aeo)} **${aeoResult.aeo}/100**`);
        if (aeoResult.aiEnhanced && typeof aeoResult.aiScore === "number") {
            lines.push(`- ${labels.aiAeo}: **${aeoResult.aiScore}/100**`);
        }
        if (typeof aeoResult.structureScore === "number") lines.push(`- ${labels.structure}: ${aeoResult.structureScore}/100`);
        if (typeof aeoResult.contentScore === "number") lines.push(`- ${labels.content}: ${aeoResult.contentScore}/100`);
        if (typeof aeoResult.authorityScore === "number") lines.push(`- ${labels.authority}: ${aeoResult.authorityScore}/100`);
        lines.push("");
    }

    if (privacyResult && typeof privacyResult.privacyScore === "number") {
        lines.push(`### ${labels.privacy}: ${scoreEmoji(privacyResult.privacyScore)} **${privacyResult.privacyScore}/100** (${privacyResult.grade || "—"})`);
        lines.push(`- ${labels.consent}: ${privacyResult.consentDetected ? labels.yes : labels.no}`);
        if (privacyResult.trackers && privacyResult.trackers.length > 0) {
            lines.push(`- ${labels.trackers}: ${privacyResult.trackers.length}`);
            for (const t of privacyResult.trackers.slice(0, 10)) {
                lines.push(`  - ${t.name} (${t.category}) — \`${t.domain}\``);
            }
        }
        lines.push("");
    }

    // Per-page detail
    results.forEach((res, i) => {
        if (i > 0) lines.push("---");
        lines.push(`## ${labels.page} ${i + 1}: ${res.url}`);
        lines.push("");
        if (res.seoMetadata?.title) lines.push(`> ${res.seoMetadata.title}`);
        if (res.seoMetadata?.description) lines.push(`> ${res.seoMetadata.description}`);
        lines.push("");

        lines.push(`- ${scoreEmoji(res.scores.performance)} ${labels.perf}: **${res.scores.performance}/100**`);
        lines.push(`- ${scoreEmoji(res.scores.accessibility)} ${labels.a11y}: **${res.scores.accessibility}/100**`);
        lines.push(`- ${scoreEmoji(res.scores.bestPractices)} ${labels.best}: **${res.scores.bestPractices}/100**`);
        lines.push(`- ${scoreEmoji(res.scores.seo)} ${labels.seo}: **${res.scores.seo}/100**`);
        lines.push("");

        if (res.fieldData?.metrics && Object.keys(res.fieldData.metrics).length > 0) {
            lines.push(`### ${labels.crux}`);
            lines.push("");
            for (const [metric, val] of Object.entries(res.fieldData.metrics)) {
                const value = metric.includes("SCORE")
                    ? (val.percentile / 100).toFixed(2)
                    : `${(val.percentile / 1000).toFixed(2)}s`;
                lines.push(`- **${metric.replace(/_/g, " ")}**: ${value} (${val.category})`);
            }
            lines.push("");
        }

        if (res.resourceSummary && res.resourceSummary.length > 0) {
            lines.push(`### ${labels.weight}`);
            lines.push("");
            lines.push(`| ${labels.type} | ${labels.req} | ${labels.size} |`);
            lines.push(`|---|---|---|`);
            for (const r of res.resourceSummary) {
                if (r.resourceType === "total") continue;
                lines.push(`| ${r.label || r.resourceType} | ${r.requestCount} | ${fmtBytes(r.transferSize)} |`);
            }
            lines.push("");
        }

        if (res.opportunities && res.opportunities.length > 0) {
            lines.push(`### ${labels.actions}`);
            lines.push("");
            for (const o of res.opportunities) {
                const sev = o.level ? ` _(${o.level})_` : "";
                const imp = o.impact ? ` — ${o.impact}` : "";
                lines.push(`- **${o.title}**${sev}${imp}`);
                if (o.description) lines.push(`  ${o.description.replace(/\s+/g, " ").trim()}`);
            }
            lines.push("");
        }
    });

    lines.push("---");
    lines.push(`_${labels.poweredBy} — ${SITE_URL}_`);

    return lines.join("\n");
}
