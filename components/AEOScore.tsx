"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, AlertTriangle, ChevronDown } from "lucide-react";
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

export interface AEOResult {
    aeo: number;
    structureScore: number;
    contentScore: number;
    authorityScore: number;
    signals: AEOSignals;
    error?: string;
}

interface AEOScoreProps {
    result: AEOResult | null;
}

function SignalBar({ label, value, tip }: { label: string; value: number; tip: string }) {
    const color = value >= 70 ? "#10b981" : value >= 40 ? "#fbbf24" : "#f43f5e";
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5" title={tip}>
            <span className="text-sm text-slate-300 flex-1 leading-tight">{label}</span>
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
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

export default function AEOScore({ result }: AEOScoreProps) {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(false);

    const getColor = (s: number) => {
        if (s >= 70) return { text: "text-emerald-400", hex: "#10b981", glow: "rgba(16,185,129,0.12)", label: t("statusExcellent") };
        if (s >= 40) return { text: "text-amber-400", hex: "#fbbf24", glow: "rgba(251,191,36,0.12)", label: t("statusNeedsImprovement") };
        return { text: "text-rose-500", hex: "#f43f5e", glow: "rgba(244,63,94,0.12)", label: t("statusCritical") };
    };

    const score = result?.aeo ?? 0;
    const color = getColor(score);

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

    return (
        <div className="space-y-4">
            {/* Promo header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400">
                        <Bot className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t("aeoTitle")}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                NEW
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm">{t("aeoSubtitle")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-violet-400/60 ml-11 sm:ml-0">
                    <Sparkles size={11} />
                    {t("aeo_whatIs_title")}
                </div>
            </div>

            {/* Always-visible description */}
            <div className="p-4 rounded-xl bg-violet-500/8 border border-violet-500/15 space-y-1.5">
                <p className="text-slate-300 text-sm leading-relaxed">{t("aeo_whatIs_body")}</p>
                <p className="text-slate-500 text-xs leading-relaxed italic">{t("aeo_whatIs_note")}</p>
            </div>

            {/* Fetch-error banner */}
            {result?.error === "fetch_failed" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
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
                    <div className="relative bg-[#0f172a]/80 border border-white/10 rounded-2xl p-5 md:p-6">
                        {/* Score row */}
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Circular score */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <div className="relative">
                                    <svg width="100" height="100" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10" />
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
                                        <span className="text-3xl font-black text-white">{score}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">/100</span>
                                    </div>
                                </div>
                                <div className={`text-xs font-black uppercase tracking-widest ${color.text}`}>
                                    {color.label}
                                </div>
                            </div>

                            {/* Pillar bars */}
                            <div className="flex-1 w-full space-y-3">
                                {[
                                    { label: t("aeo_pillar_structure"), value: result.structureScore, weight: "35%" },
                                    { label: t("aeo_pillar_content"),   value: result.contentScore,   weight: "40%" },
                                    { label: t("aeo_pillar_authority"), value: result.authorityScore, weight: "25%" },
                                ].map((p, i) => {
                                    const c = p.value >= 70 ? "#10b981" : p.value >= 40 ? "#fbbf24" : "#f43f5e";
                                    return (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>{p.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-600">{p.weight}</span>
                                                    <span className="font-mono font-bold" style={{ color: c }}>{p.value}</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: c }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${p.value}%` }}
                                                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 + i * 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Expand toggle */}
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
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
                                    <div className="pt-6 space-y-6 border-t border-white/5 mt-5">
                                        {pillars.map((pillar, pi) => (
                                            <motion.div
                                                key={pillar.key}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: pi * 0.08 }}
                                                className="space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        {pillar.label}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-600">{pillar.weight}</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    {pillar.items.map((item, ii) => (
                                                        <SignalBar key={ii} label={item.label} value={item.value} tip={item.tip} />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        ))}

                                        <p className="p-4 rounded-xl bg-violet-500/8 border border-violet-500/15 text-xs text-slate-400 leading-relaxed italic">
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
