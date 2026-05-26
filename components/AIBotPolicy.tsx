"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ShieldCheck, ShieldAlert, AlertTriangle, Copy, Check, ChevronDown, ChevronUp, GraduationCap, Search as SearchIcon, MessageSquare, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

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

interface AIBotPolicyProps {
    result: BotPolicyResult | null;
}

const STATUS_STYLE: Record<BotStatus, { color: string; bg: string; border: string }> = {
    allow:          { color: "#0f8f68", bg: "#dff3ea", border: "#0f8f6840" },
    block:          { color: "#bd3150", bg: "#f4dde3", border: "#bd315040" },
    partial:        { color: "#b7791f", bg: "#f6ead2", border: "#b7791f40" },
    not_specified:  { color: "#756d64", bg: "#efebe4", border: "#756d6440" },
};

const PURPOSE_ICON: Record<BotPurpose, React.ElementType> = {
    training: GraduationCap,
    search:   SearchIcon,
    answers:  MessageSquare,
    crawler:  Globe,
};

function AIBotPolicySkeleton() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card p-4 md:p-5 relative overflow-hidden"
            aria-label="Loading AI bot policy"
        >
            <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-stone-200/80" />
                    <div className="space-y-2">
                        <div className="h-5 w-40 rounded-full bg-stone-200/80" />
                        <div className="h-3 w-60 max-w-[58vw] rounded-full bg-stone-200/80" />
                    </div>
                </div>
                <div className="h-16 rounded-xl bg-stone-200/60 mb-4" />
                <div className="flex flex-wrap gap-2 mb-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-7 w-24 rounded-full bg-stone-200/80" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 rounded-lg bg-stone-200/60" />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function StatusBadge({ status, t }: { status: BotStatus; t: (k: string) => string }) {
    const style = STATUS_STYLE[status];
    const label =
        status === "allow" ? t("aiBotStatusAllow") :
        status === "block" ? t("aiBotStatusBlock") :
        status === "partial" ? t("aiBotStatusPartial") :
        t("aiBotStatusNotSpecified");

    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
            style={{ color: style.color, background: style.bg, borderColor: style.border }}
        >
            {label}
        </span>
    );
}

function BotRow({ bot, t }: { bot: BotEntry; t: (k: string) => string }) {
    const PurposeIcon = PURPOSE_ICON[bot.purpose];
    const sourceLabel =
        bot.source === "explicit" ? t("aiBotSourceExplicit") :
        bot.source === "wildcard" ? t("aiBotSourceWildcard") :
        t("aiBotSourceNone");
    const purposeLabel =
        bot.purpose === "training" ? t("aiBotPurposeTraining") :
        bot.purpose === "search" ? t("aiBotPurposeSearch") :
        bot.purpose === "answers" ? t("aiBotPurposeAnswers") :
        t("aiBotPurposeCrawler");
    const purposeTip =
        bot.purpose === "training" ? t("aiBotPurposeTrainingTip") :
        bot.purpose === "search" ? t("aiBotPurposeSearchTip") :
        bot.purpose === "answers" ? t("aiBotPurposeAnswersTip") :
        t("aiBotPurposeCrawlerTip");

    return (
        <div className="flex items-center gap-3 p-2.5 rounded-lg premium-surface">
            <div className="flex min-w-0 items-center gap-2 flex-1">
                <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 px-1.5 py-0.5 rounded border border-stone-200 bg-white/60 shrink-0"
                    title={purposeTip}
                >
                    <PurposeIcon size={10} />
                    {purposeLabel}
                </span>
                <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-900 font-mono leading-tight truncate">{bot.name}</div>
                    <div className="text-[10px] text-stone-500 truncate">{bot.provider} · {sourceLabel}</div>
                </div>
            </div>
            <StatusBadge status={bot.status} t={t} />
        </div>
    );
}

export default function AIBotPolicy({ result }: AIBotPolicyProps) {
    const { t } = useLanguage();
    const [showAll, setShowAll] = useState(false);
    const [copied, setCopied] = useState(false);

    const grouped = useMemo(() => {
        if (!result) return [] as Array<[string, BotEntry[]]>;
        const map = new Map<string, BotEntry[]>();
        for (const bot of result.bots) {
            const arr = map.get(bot.provider) ?? [];
            arr.push(bot);
            map.set(bot.provider, arr);
        }
        return Array.from(map.entries());
    }, [result]);

    if (!result) return <AIBotPolicySkeleton />;

    const isFetchError = result.error && result.error !== "fetch_failed_robots_optional";
    const wildcardStyle = STATUS_STYLE[result.wildcardStatus];
    const wildcardLabel =
        result.wildcardStatus === "allow" ? t("aiBotWildcardAllow") :
        result.wildcardStatus === "block" ? t("aiBotWildcardBlock") :
        result.wildcardStatus === "partial" ? t("aiBotWildcardPartial") :
        t("aiBotWildcardNotSpecified");

    const problematicBots = result.bots.filter((b) => b.status === "block" || b.status === "partial");
    const hasProblems = problematicBots.length > 0;

    const copySnippet = async () => {
        if (!result.suggestedFix) return;
        try {
            await navigator.clipboard.writeText(result.suggestedFix);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* ignore — copy is best-effort */
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card p-4 md:p-5 relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg icon-tile">
                    {hasProblems ? <ShieldAlert className="w-5 h-5 text-[#bd3150]" /> : <ShieldCheck className="w-5 h-5 text-[#0f8f68]" />}
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-stone-900">{t("aiBotTitle")}</h3>
                    <p className="text-sm leading-snug text-stone-600 truncate">{t("aiBotSubtitle")}</p>
                </div>
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full border bg-stone-900/8 text-stone-700 border-stone-900/15">
                    NEW
                </span>
            </div>

            {/* What is */}
            <div className="p-4 rounded-xl premium-surface space-y-1.5 mb-4">
                <p className="text-stone-600 text-sm leading-relaxed">{t("aiBotWhatIsBody")}</p>
                <p className="text-stone-500 text-xs leading-relaxed italic">{t("aiBotWhatIsNote")}</p>
            </div>

            {isFetchError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700">
                    <AlertTriangle size={12} className="inline mr-1.5" />
                    {t("aiBotErrorFetch")}
                </div>
            )}

            {/* No robots.txt found */}
            {!result.hasRobotsTxt && !isFetchError && (
                <div className="mb-4 p-4 rounded-xl bg-stone-100 border border-stone-200">
                    <div className="flex items-center gap-2 mb-1 text-sm font-bold text-stone-800">
                        <AlertTriangle size={14} className="text-stone-500" />
                        {t("aiBotNoRobots")}
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{t("aiBotNoRobotsDesc")}</p>
                </div>
            )}

            {/* Wildcard default policy banner */}
            {result.hasRobotsTxt && (
                <div
                    className="mb-4 p-3 rounded-xl border flex items-center gap-3 flex-wrap"
                    style={{ background: wildcardStyle.bg, borderColor: wildcardStyle.border }}
                >
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                            {t("aiBotWildcardLabel")}
                        </div>
                        <div className="text-sm font-bold" style={{ color: wildcardStyle.color }}>
                            {wildcardLabel}
                        </div>
                        {result.wildcardStatus === "block" && (
                            <div className="text-xs text-stone-700 mt-1 leading-snug">
                                {t("aiBotWildcardBlockWarning")}
                            </div>
                        )}
                        {result.wildcardStatus === "partial" && result.wildcardDisallowedPaths.length > 0 && (
                            <div className="text-[11px] text-stone-600 mt-1 font-mono leading-snug truncate">
                                {t("aiBotDisallowedPaths")}: {result.wildcardDisallowedPaths.join(", ")}
                            </div>
                        )}
                    </div>
                    <StatusBadge status={result.wildcardStatus} t={t} />
                </div>
            )}

            {/* Summary pills */}
            <div className="flex flex-wrap gap-2 mb-4">
                {([
                    { key: "allow",         count: result.summary.allow,         label: t("aiBotSummaryAllowed") },
                    { key: "block",         count: result.summary.block,         label: t("aiBotSummaryBlocked") },
                    { key: "partial",       count: result.summary.partial,       label: t("aiBotSummaryPartial") },
                    { key: "not_specified", count: result.summary.not_specified, label: t("aiBotSummaryNotSpecified") },
                ] as Array<{ key: BotStatus; count: number; label: string }>).map(({ key, count, label }) => {
                    const style = STATUS_STYLE[key];
                    const muted = count === 0;
                    return (
                        <div
                            key={key}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
                            style={{
                                color: muted ? "#a8a29e" : style.color,
                                borderColor: muted ? "#e7e5e4" : style.border,
                                background: muted ? "#fafaf9" : style.bg,
                            }}
                        >
                            <span className="font-mono font-black">{count}</span>
                            {label}
                        </div>
                    );
                })}
            </div>

            {/* Suggested fix snippet */}
            {result.suggestedFix && (
                <div className="mb-4 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/25">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                            <div className="text-sm font-bold text-emerald-800">{t("aiBotSuggestedFixTitle")}</div>
                            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                                {t("aiBotSuggestedFixDesc")}
                            </p>
                        </div>
                        <button
                            onClick={copySnippet}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-500/30 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? t("aiBotCopied") : t("aiBotCopySnippet")}
                        </button>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-stone-950 text-emerald-200 text-[11px] font-mono p-3 leading-relaxed">
{result.suggestedFix}
                    </pre>
                </div>
            )}

            {/* Bot list */}
            {hasProblems && !showAll && (
                <div className="space-y-2 mb-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">
                        {t("aiBotSummaryBlocked")} / {t("aiBotSummaryPartial")}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {problematicBots.map((bot) => (
                            <BotRow key={bot.name} bot={bot} t={t} />
                        ))}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showAll && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4">
                            {grouped.map(([provider, bots]) => (
                                <div key={provider}>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1.5">
                                        {provider}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {bots.map((bot) => (
                                            <BotRow key={bot.name} bot={bot} t={t} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAll ? t("aiBotHideAll") : t("aiBotShowAll")}
            </button>
        </motion.div>
    );
}
