"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle2, XCircle, AlertCircle, Sparkles, Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";

interface AEOBreakdown {
    structuredData: number;
    headingOrder: number;
    metaDescription: number;
    documentTitle: number;
    linkText: number;
    imageAlt: number;
    crawlableAnchors: number;
    canonical: number;
}

interface AEOScoreProps {
    score: number;
    breakdown: AEOBreakdown;
}

function ScoreIcon({ value }: { value: number }) {
    if (value >= 0.9) return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
    if (value >= 0.5) return <AlertCircle size={14} className="text-amber-400 shrink-0" />;
    return <XCircle size={14} className="text-rose-500 shrink-0" />;
}

export default function AEOScore({ score, breakdown }: AEOScoreProps) {
    const { t } = useLanguage();

    const getColor = (s: number) => {
        if (s >= 80) return { text: "text-emerald-400", hex: "#10b981", glow: "rgba(16,185,129,0.15)", label: t("statusExcellent") };
        if (s >= 50) return { text: "text-amber-400", hex: "#fbbf24", glow: "rgba(251,191,36,0.15)", label: t("statusNeedsImprovement") };
        return { text: "text-rose-500", hex: "#f43f5e", glow: "rgba(244,63,94,0.15)", label: t("statusCritical") };
    };

    const color = getColor(score);

    const pillars = [
        {
            label: t("aeo_pillar_structure"),
            weight: "40%",
            items: [
                { label: t("aeo_signal_structuredData"), value: breakdown.structuredData, tip: t("aeo_tip_structuredData") },
                { label: t("aeo_signal_headingOrder"), value: breakdown.headingOrder, tip: t("aeo_tip_headingOrder") },
                { label: t("aeo_signal_metaDesc"), value: breakdown.metaDescription, tip: t("aeo_tip_metaDesc") },
                { label: t("aeo_signal_docTitle"), value: breakdown.documentTitle, tip: t("aeo_tip_docTitle") },
            ],
        },
        {
            label: t("aeo_pillar_clarity"),
            weight: "30%",
            items: [
                { label: t("aeo_signal_linkText"), value: breakdown.linkText, tip: t("aeo_tip_linkText") },
                { label: t("aeo_signal_imageAlt"), value: breakdown.imageAlt, tip: t("aeo_tip_imageAlt") },
                { label: t("aeo_signal_crawlable"), value: breakdown.crawlableAnchors, tip: t("aeo_tip_crawlable") },
            ],
        },
        {
            label: t("aeo_pillar_discoverability"),
            weight: "30%",
            items: [
                { label: t("aeo_signal_canonical"), value: breakdown.canonical, tip: t("aeo_tip_canonical") },
            ],
        },
    ];

    return (
        <div className="space-y-8">
            {/* Section header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-violet-400">
                            <Bot className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t("aeoTitle")}</h3>
                        
                    </div>
                    <p className="text-slate-400 text-sm md:text-base ml-12">{t("aeoSubtitle")}</p>
                </div>
            </div>

            {/* Info panel */}
            {
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-3"
                >
                    <div className="flex items-center gap-2 text-violet-300 font-semibold text-sm">
                        <Sparkles size={15} />
                        {t("aeo_whatIs_title")}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{t("aeo_whatIs_body")}</p>
                    <p className="text-slate-400 text-xs leading-relaxed italic">{t("aeo_whatIs_note")}</p>
                </motion.div>
            }

            {/* Main card */}
            <div className="relative group">
                <div
                    className="absolute -inset-1 rounded-[2rem] opacity-20 blur-2xl transition duration-1000"
                    style={{ backgroundColor: color.glow }}
                />

                <div className="relative card overflow-hidden bg-[#1e293b]/30 backdrop-blur-xl border-white/10 p-1 md:p-2 rounded-[2rem]">
                    <div className="bg-[#0f172a]/80 rounded-[1.8rem] p-6 md:p-10">
                        <div className="flex flex-col md:flex-row gap-10 items-start">

                            {/* Score display */}
                            <div className="flex flex-col items-center justify-center gap-4 md:w-1/4">
                                <div className="relative">
                                    <svg width="120" height="120" viewBox="0 0 120 120">
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
                                <div className="text-center space-y-1">
                                    <div className={`text-xs font-black uppercase tracking-widest ${color.text}`}>
                                        {color.label}
                                    </div>
                                    <div className="text-xs text-slate-500">{t("aeoScoreLabel")}</div>
                                </div>
                            </div>

                            {/* Pillars breakdown */}
                            <div className="md:w-3/4 w-full space-y-6">
                                {pillars.map((pillar, pi) => (
                                    <motion.div
                                        key={pi}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + pi * 0.1 }}
                                        className="space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {pillar.label}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-600">{pillar.weight}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {pillar.items.map((item, ii) => (
                                                <div
                                                    key={ii}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
                                                    title={item.tip}
                                                >
                                                    <ScoreIcon value={item.value} />
                                                    <span className="text-sm text-slate-300 flex-1">{item.label}</span>
                                                    <span className={`text-xs font-bold font-mono ${item.value >= 0.9 ? "text-emerald-400" : item.value >= 0.5 ? "text-amber-400" : "text-rose-500"}`}>
                                                        {Math.round(item.value * 100)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Callout */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="p-4 rounded-xl bg-violet-500/8 border border-violet-500/15 text-xs text-slate-400 leading-relaxed italic"
                                >
                                    {t("aeo_disclaimer")}
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
