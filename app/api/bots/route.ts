import { NextResponse } from "next/server";

export type BotPurpose = "training" | "search" | "answers" | "crawler";
export type BotStatus = "allow" | "block" | "partial" | "not_specified";
export type BotSource = "explicit" | "wildcard" | "none";

export interface BotEntry {
    name: string;
    provider: string;
    purpose: BotPurpose;
    status: BotStatus;
    source: BotSource;
    disallowedPaths: string[];
}

export interface BotPolicyResult {
    fetched: boolean;
    robotsUrl: string;
    hasRobotsTxt: boolean;
    wildcardStatus: BotStatus;
    wildcardDisallowedPaths: string[];
    bots: BotEntry[];
    summary: { allow: number; block: number; partial: number; not_specified: number };
    suggestedFix: string | null;
    error?: string;
}

const KNOWN_AI_BOTS: Array<{ name: string; provider: string; purpose: BotPurpose }> = [
    { name: "GPTBot", provider: "OpenAI", purpose: "training" },
    { name: "OAI-SearchBot", provider: "OpenAI", purpose: "search" },
    { name: "ChatGPT-User", provider: "OpenAI", purpose: "answers" },
    { name: "ClaudeBot", provider: "Anthropic", purpose: "training" },
    { name: "Claude-Web", provider: "Anthropic", purpose: "answers" },
    { name: "anthropic-ai", provider: "Anthropic", purpose: "training" },
    { name: "Google-Extended", provider: "Google", purpose: "training" },
    { name: "PerplexityBot", provider: "Perplexity", purpose: "search" },
    { name: "Perplexity-User", provider: "Perplexity", purpose: "answers" },
    { name: "Applebot-Extended", provider: "Apple", purpose: "training" },
    { name: "Meta-ExternalAgent", provider: "Meta", purpose: "training" },
    { name: "FacebookBot", provider: "Meta", purpose: "crawler" },
    { name: "CCBot", provider: "Common Crawl", purpose: "training" },
    { name: "Bytespider", provider: "ByteDance", purpose: "training" },
    { name: "Amazonbot", provider: "Amazon", purpose: "training" },
    { name: "DuckAssistBot", provider: "DuckDuckGo", purpose: "answers" },
    { name: "cohere-ai", provider: "Cohere", purpose: "training" },
];

interface RobotsGroup {
    agents: string[];
    allow: string[];
    disallow: string[];
}

function parseRobotsTxt(raw: string): RobotsGroup[] {
    const groups: RobotsGroup[] = [];
    let current: RobotsGroup | null = null;
    let lastDirectiveWasAgent = false;

    const lines = raw.split(/\r?\n/);

    for (const rawLine of lines) {
        // Strip inline comments and trim
        const line = rawLine.replace(/#.*$/, "").trim();
        if (!line) continue;

        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;

        const directive = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();
        if (!value && directive !== "disallow") continue; // Disallow: (empty) is valid → allow all

        if (directive === "user-agent") {
            // Consecutive User-agent lines extend the current group; once any allow/disallow
            // appears, the next User-agent starts a fresh group.
            if (!current || !lastDirectiveWasAgent) {
                current = { agents: [], allow: [], disallow: [] };
                groups.push(current);
            }
            current.agents.push(value.toLowerCase());
            lastDirectiveWasAgent = true;
        } else if (directive === "allow" && current) {
            current.allow.push(value);
            lastDirectiveWasAgent = false;
        } else if (directive === "disallow" && current) {
            current.disallow.push(value);
            lastDirectiveWasAgent = false;
        } else {
            // Other directives (Sitemap, Crawl-delay…) don't affect bot grouping.
            lastDirectiveWasAgent = false;
        }
    }

    return groups;
}

function evaluateGroup(group: RobotsGroup): { status: BotStatus; disallowedPaths: string[] } {
    const meaningfulDisallows = group.disallow.filter((d) => d.length > 0);
    if (meaningfulDisallows.length === 0) {
        return { status: "allow", disallowedPaths: [] };
    }

    // "Disallow: /" with no overriding "Allow: /" means full block.
    const fullBlock = meaningfulDisallows.includes("/");
    const fullAllow = group.allow.includes("/");
    if (fullBlock && !fullAllow) {
        return { status: "block", disallowedPaths: ["/"] };
    }

    // Partial: some paths blocked but not the whole site.
    return { status: "partial", disallowedPaths: Array.from(new Set(meaningfulDisallows)).slice(0, 6) };
}

function findGroupForAgent(groups: RobotsGroup[], agent: string): RobotsGroup | null {
    const lower = agent.toLowerCase();
    for (const group of groups) {
        if (group.agents.some((a) => a === lower)) return group;
    }
    return null;
}

function findWildcardGroup(groups: RobotsGroup[]): RobotsGroup | null {
    for (const group of groups) {
        if (group.agents.includes("*")) return group;
    }
    return null;
}

function evaluateBots(groups: RobotsGroup[]): {
    bots: BotEntry[];
    wildcardStatus: BotStatus;
    wildcardDisallowedPaths: string[];
} {
    const wildcard = findWildcardGroup(groups);
    const wildcardEval = wildcard ? evaluateGroup(wildcard) : null;

    const bots: BotEntry[] = KNOWN_AI_BOTS.map(({ name, provider, purpose }) => {
        const explicit = findGroupForAgent(groups, name);
        if (explicit) {
            const evaluated = evaluateGroup(explicit);
            return { name, provider, purpose, status: evaluated.status, source: "explicit", disallowedPaths: evaluated.disallowedPaths };
        }
        if (wildcardEval) {
            return { name, provider, purpose, status: wildcardEval.status, source: "wildcard", disallowedPaths: wildcardEval.disallowedPaths };
        }
        return { name, provider, purpose, status: "not_specified", source: "none", disallowedPaths: [] };
    });

    return {
        bots,
        wildcardStatus: wildcardEval?.status ?? "not_specified",
        wildcardDisallowedPaths: wildcardEval?.disallowedPaths ?? [],
    };
}

function buildSuggestedFix(bots: BotEntry[], wildcardStatus: BotStatus): string | null {
    // Only suggest a fix when the wildcard blocks AI bots that aren't explicitly allowed —
    // that's the silent-block case users almost always want to fix.
    if (wildcardStatus !== "block" && wildcardStatus !== "partial") return null;

    const inheritedBlocked = bots.filter(
        (b) => b.source === "wildcard" && (b.status === "block" || b.status === "partial"),
    );
    if (inheritedBlocked.length === 0) return null;

    const lines = [
        "# Explicitly allow AI bots you want to be cited by:",
        ...inheritedBlocked.flatMap((b) => [
            `User-agent: ${b.name}`,
            "Allow: /",
            "",
        ]),
    ];
    return lines.join("\n").trim();
}

async function fetchRobotsTxt(origin: string): Promise<{ ok: boolean; raw: string; url: string }> {
    const url = `${origin}/robots.txt`;
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; UXAbility/1.0; +https://uxability.vercel.app)" },
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return { ok: false, raw: "", url };

        const raw = await response.text();
        // Reject soft-404 HTML responses served as robots.txt.
        const looksLikeHtml = /<\s*html[\s>]/i.test(raw) || raw.trimStart().startsWith("<!doctype");
        if (looksLikeHtml) return { ok: false, raw: "", url };

        return { ok: true, raw, url };
    } catch {
        return { ok: false, raw: "", url };
    }
}

async function computeBotPolicy(targetUrl: string): Promise<BotPolicyResult> {
    const origin = new URL(targetUrl).origin;
    const { ok, raw, url } = await fetchRobotsTxt(origin);

    if (!ok) {
        // No robots.txt → every bot is allowed by default (RFC 9309).
        const bots: BotEntry[] = KNOWN_AI_BOTS.map(({ name, provider, purpose }) => ({
            name,
            provider,
            purpose,
            status: "allow",
            source: "none",
            disallowedPaths: [],
        }));
        return {
            fetched: false,
            robotsUrl: url,
            hasRobotsTxt: false,
            wildcardStatus: "not_specified",
            wildcardDisallowedPaths: [],
            bots,
            summary: { allow: bots.length, block: 0, partial: 0, not_specified: 0 },
            suggestedFix: null,
        };
    }

    const groups = parseRobotsTxt(raw);
    const { bots, wildcardStatus, wildcardDisallowedPaths } = evaluateBots(groups);

    const summary = bots.reduce(
        (acc, bot) => {
            acc[bot.status]++;
            return acc;
        },
        { allow: 0, block: 0, partial: 0, not_specified: 0 },
    );

    return {
        fetched: true,
        robotsUrl: url,
        hasRobotsTxt: true,
        wildcardStatus,
        wildcardDisallowedPaths,
        bots,
        summary,
        suggestedFix: buildSuggestedFix(bots, wildcardStatus),
    };
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

        const result = await computeBotPolicy(url);
        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Bot policy analysis failed";
        console.error("Bot policy error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
