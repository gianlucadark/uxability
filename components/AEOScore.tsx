"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, AlertTriangle, ChevronDown, BrainCircuit } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface AEOSignals {
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
}

export type AIFallbackReason = "no_api_key" | "fetch_error" | "blocked" | "invalid_response" | "model_error";

export interface AEOResult {
    aeo: number;
    structureScore: number;
    contentScore: number;
    authorityScore: number;
    aiScore?: number;
    signals: AEOSignals;
    aiEnhanced?: boolean;
    aiFallbackReason?: AIFallbackReason;
    error?: string;
}

interface AEOScoreProps {
    result: AEOResult | null;
}

function SignalBar({ label, value, tip }: { label: string; value: number; tip: string }) {
    const color = value >= 70 ? "#0f8f68" : value >= 40 ? "#b7791f" : "#bd3150";
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl premium-surface" title={tip}>
            <span className="text-sm text-stone-600 flex-1 leading-tight">{label}</span>
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
                <span className="text-xs font-bold font-mono w-7 text-right" style={{ color }}>{value}</span>
            </div>
        </div>
    );
}

function AEOScoreSkeleton() {
    return (
        <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-stone-900/5 opacity-30 blur-xl" />
            <div className="relative premium-surface rounded-2xl p-5 md:p-6 animate-pulse" aria-label="Loading AEO score">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="h-[100px] w-[100px] rounded-full bg-stone-200/80" />
                        <div className="h-3 w-24 rounded-full bg-stone-200/80" />
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        {[0, 1, 2, 3].map((item) => (
                            <div key={item} className="space-y-2">
                                <div className="flex justify-between gap-4">
                                    <div className="h-3 w-28 rounded-full bg-stone-200/80" />
                                    <div className="h-3 w-14 rounded-full bg-stone-200/80" />
                                </div>
                                <div className="h-2 rounded-full bg-stone-200/80" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-5 rounded-xl border border-stone-900/10 bg-stone-100/70 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-stone-200/90" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-36 rounded-full bg-stone-200/90" />
                            <div className="h-3 w-full rounded-full bg-stone-200/90" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AEOScore({ result }: AEOScoreProps) {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(false);

    const getColor = (s: number) => {
        if (s >= 70) return { text: "text-[var(--success)]", hex: "#0f8f68", glow: "rgba(15,143,104,0.12)", label: t("statusExcellent") };
        if (s >= 40) return { text: "text-[var(--warning)]", hex: "#b7791f", glow: "rgba(183,121,31,0.12)", label: t("statusNeedsImprovement") };
        return { text: "text-[var(--danger)]", hex: "#bd3150", glow: "rgba(189,49,80,0.12)", label: t("statusCritical") };
    };

    const score = result?.aeo ?? 0;
    const color = getColor(score);
    const aiAvailable = !!result?.aiEnhanced;
    const aiScoreValue: number | null = aiAvailable ? (result?.aiScore ?? score) : null;
    const aiTone = result?.aiEnhanced
        ? {
            panel: "bg-emerald-500/8 border-emerald-500/20",
            icon: "bg-emerald-600/10 text-emerald-700",
            text: "text-emerald-800",
        }
        : {
            panel: "bg-amber-500/8 border-amber-500/25",
            icon: "bg-amber-600/10 text-amber-700",
            text: "text-amber-800",
        };

    const pillars = result ? [
        {
            key: "structure",
            label: t("aeo_pillar_structure"),
            weight: "35%",
            items: [
                { label: t("aeo_signal_schema"),    value: result.signals.schema,    tip: t("aeo_tip_schema") },
                { label: t("aeo_signal_headings"),  value: result.signals.headings,  tip: t("aeo_tip_headings") },
                { label: t("aeo_signal_semantic"),  value: result.signals.semantic,  tip: t("aeo_tip_semantic") },
                { label: t("aeo_signal_metaDesc"),  value: result.signals.metaDesc,  tip: t("aeo_tip_metaDesc") },
            ],
        },
        {
            key: "content",
            label: t("aeo_pillar_content"),
            weight: "40%",
            items: [
                { label: t("aeo_signal_qa"),          value: result.signals.qa,          tip: t("aeo_tip_qa") },
                { label: t("aeo_signal_chunks"),      value: result.signals.chunks,      tip: t("aeo_tip_chunks") },
                { label: t("aeo_signal_definitions"), value: result.signals.definitions, tip: t("aeo_tip_definitions") },
                { label: t("aeo_signal_answerFirst"), value: result.signals.answerFirst, tip: t("aeo_tip_answerFirst") },
            ],
        },
        {
            key: "authority",
            label: t("aeo_pillar_authority"),
            weight: "25%",
            items: [
                { label: t("aeo_signal_author"),        value: result.signals.author,        tip: t("aeo_tip_author") },
                { label: t("aeo_signal_datePublished"), value: result.signals.datePublished, tip: t("aeo_tip_datePublished") },
                { label: t("aeo_signal_citations"),     value: result.signals.citations,     tip: t("aeo_tip_citations") },
                { label: t("aeo_signal_llmsTxt"),       value: result.signals.llmsTxt,       tip: t("aeo_tip_llmsTxt") },
                { label: t("aeo_signal_faqSchema"),     value: result.signals.faqSchema,     tip: t("aeo_tip_faqSchema") },
            ],
        },
    ] : [];
    const renderAIRolePanel = (compact = false) => result ? (
        <div
            className={`rounded-xl border p-4 ${aiTone.panel}`}
        >
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-2 ${aiTone.icon}`}>
                    <BrainCircuit size={compact ? 16 : 18} />
                </div>
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                        <h4 className={`text-sm font-black ${compact ? aiTone.text : "text-stone-800"}`}>
                            {compact ? t("aeo_ai_role_title") : t("aeo_ai_role_heading")}
                        </h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                            {result.aiEnhanced ? t("aeo_ai_role_active_label") : t("aeo_ai_role_fallback_label")}
                        </span>
                    </div>
                    <p className={`${compact ? "text-[11px]" : "text-xs"} leading-relaxed text-stone-600`}>
                        {compact
                            ? (result.aiEnhanced ? t("aeo_ai_role_active_desc") : t("aeo_ai_role_fallback_desc"))
                            : t("aeo_ai_role_body")}
                    </p>
                    {!compact && (
                        <p className="text-[11px] leading-relaxed text-stone-500 italic">
                            {result.aiEnhanced ? t("aeo_ai_role_active_desc") : t("aeo_ai_role_fallback_desc")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            {/* Promo header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg icon-tile">
                        <Bot className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">{t("aeoTitle")}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-stone-900/8 text-stone-700 border border-stone-900/15">
                                NEW
                            </span>
                        </div>
                        <p className="text-stone-600 text-sm">{t("aeoSubtitle")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 ml-11 sm:ml-0">
                    <Sparkles size={11} />
                    {t("aeo_whatIs_title")}
                </div>
            </div>

            {/* Always-visible description */}
            <div className="p-4 rounded-xl premium-surface space-y-1.5">
                <p className="text-stone-600 text-sm leading-relaxed">{t("aeo_whatIs_body")}</p>
                <p className="text-stone-500 text-xs leading-relaxed italic">{t("aeo_whatIs_note")}</p>
            </div>

            {!result && <AEOScoreSkeleton />}

            {/* Fetch-error banner */}
            {result?.error === "fetch_failed" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm"
                >
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{t("aeo_error_fetch")}</span>
                </motion.div>
            )}

            {/* Score card */}
            {result && (
                <div className="relative">
                    <div
                        className="absolute -inset-1 rounded-2xl opacity-20 blur-xl transition duration-1000"
                        style={{ backgroundColor: color.glow }}
                    />
                    <div className="relative premium-surface rounded-2xl p-5 md:p-6">
                        {/* Score row */}
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Circular score */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <div className="relative">
                                    <svg width="100" height="100" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e7e5e4" strokeWidth="10" />
                                        <motion.circle
                                            cx="60" cy="60" r="50"
                                            fill="none"
                                            stroke={color.hex}
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 50}`}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - score / 100) }}
                                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                            transform="rotate(-90 60 60)"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-stone-900">{score}</span>
                                        <span className="text-[10px] text-stone-400 font-medium">/100</span>
                                    </div>
                                </div>
                                <div className={`text-xs font-black uppercase tracking-widest ${color.text}`}>
                                    {color.label}
                                </div>
                            </div>

                            {/* Pillar bars */}
                            <div className="flex-1 w-full space-y-3">
                                {[
                                    {
                                        label: t("aeo_ai_score_label"),
                                        value: aiScoreValue,
                                        weight: aiAvailable ? "60%" : t("aeo_ai_role_fallback_label"),
                                        color: aiAvailable ? undefined : "#a8a29e",
                                        delay: 0.2,
                                    },
                                    { label: t("aeo_pillar_structure"), value: result.structureScore, weight: aiAvailable ? "15%" : "35%" },
                                    { label: t("aeo_pillar_content"),   value: result.contentScore,   weight: aiAvailable ? "15%" : "40%" },
                                    { label: t("aeo_pillar_authority"), value: result.authorityScore, weight: aiAvailable ? "10%" : "25%" },
                                ].map((p, i) => {
                                    const isUnavailable = p.value === null;
                                    const numericValue = isUnavailable ? 0 : (p.value as number);
                                    const c = isUnavailable
                                        ? "#a8a29e"
                                        : (p.color || (numericValue >= 70 ? "#0f8f68" : numericValue >= 40 ? "#b7791f" : "#bd3150"));
                                    return (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-xs text-stone-500">
                                                <span>{p.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-stone-500">{p.weight}</span>
                                                    <span className="font-mono font-bold" style={{ color: c }}>
                                                        {isUnavailable ? "—" : numericValue}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: c, opacity: isUnavailable ? 0.35 : 1 }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${isUnavailable ? 100 : numericValue}%` }}
                                                    transition={{ duration: 0.9, ease: "easeOut", delay: (p.delay ?? 0.3) + i * 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            className={`mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4 ${
                                result.aiEnhanced
                                    ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-800"
                                    : "bg-amber-500/8 border-amber-500/25 text-amber-800"
                            }`}
                        >
                            <div className="flex items-center gap-2 shrink-0">
                                {result.aiEnhanced ? (
                                    <BrainCircuit size={16} />
                                ) : (
                                    <AlertTriangle size={16} />
                                )}
                                <span className="text-xs font-black uppercase tracking-widest">
                                    {result.aiEnhanced ? t("aeo_ai_active") : t("aeo_ai_fallback")}
                                </span>
                            </div>
                            <p className="text-xs leading-relaxed sm:border-l sm:pl-3 border-current/20">
                                {result.aiEnhanced ? t("aeo_ai_active_desc") : t("aeo_ai_fallback_desc")}
                            </p>
                        </div>

                        {/* Expand toggle */}
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors"
                        >
                            <span>{expanded ? t("aeo_hideDetails") : t("aeo_showDetails")}</span>
                            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} />
                            </motion.div>
                        </button>

                        {/* Expanded: signal details */}
                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    key="aeo-details"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-6 space-y-6 border-t border-stone-200 mt-5">
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                                    {t("aeo_ai_role_title")}
                                                </span>
                                                <span className="text-[10px] font-mono text-stone-300">
                                                    {result.aiEnhanced ? t("aeo_ai_role_active_label") : t("aeo_ai_role_fallback_label")}
                                                </span>
                                            </div>
                                            {renderAIRolePanel(false)}
                                        </motion.div>

                                        {pillars.map((pillar, pi) => (
                                            <motion.div
                                                key={pillar.key}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.08 + pi * 0.08 }}
                                                className="space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                                        {pillar.label}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-stone-300">{pillar.weight}</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    {pillar.items.map((item, ii) => (
                                                        <SignalBar key={ii} label={item.label} value={item.value} tip={item.tip} />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}

                                        <p className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 leading-relaxed italic">
                                            {t("aeo_disclaimer")}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}
