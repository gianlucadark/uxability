"use client";

import { motion } from "framer-motion";
import { Zap, Activity, Clock, MousePointer2, AlertCircle, Info, CheckCircle2, Globe, Type, Database } from "lucide-react";

interface FieldDataBadgesProps {
    fieldData: any;
}

import { useLanguage } from "@/context/LanguageContext";

export default function FieldDataBadges({ fieldData }: FieldDataBadgesProps) {
    const { t } = useLanguage();

    if (!fieldData || !fieldData.metrics) {
        return (
            <div className="glass p-12 rounded-[2.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.01]">
                <div className="p-6 rounded-full bg-white/5 border border-white/10 opacity-30">
                    <Info size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold opacity-80">{t('fieldDataNotAvailable')}</h3>
                    <p className="text-sm opacity-40 max-w-lg leading-relaxed">
                        {t('fieldDataNotAvailableDesc')}
                    </p>
                </div>
            </div>
        );
    }

    const metrics = fieldData.metrics;

    const getStatusText = (category: string) => {
        if (category === "FAST" || category === "GOOD") return t('statusExcellent');
        if (category === "AVERAGE" || category === "NEEDS_IMPROVEMENT") return t('statusNeedsImprovement');
        return t('statusCritical');
    };

    const getStatusColor = (category: string) => {
        if (category === "FAST" || category === "GOOD") return "from-emerald-400 to-emerald-600";
        if (category === "AVERAGE" || category === "NEEDS_IMPROVEMENT") return "from-amber-400 to-amber-600";
        return "from-rose-400 to-rose-600";
    };

    const metricInfo: Record<string, { label: string; desc: string; icon: any }> = {
        "LARGEST_CONTENTFUL_PAINT_MS": {
            label: t('LCP_field'),
            desc: t('LCP_field_desc'),
            icon: <Zap size={20} />
        },
        "FIRST_INPUT_DELAY_MS": {
            label: t('FID_field'),
            desc: t('FID_field_desc'),
            icon: <Clock size={20} />
        },
        "CUMULATIVE_LAYOUT_SHIFT_SCORE": {
            label: t('CLS_field'),
            desc: t('CLS_field_desc'),
            icon: <Activity size={20} />
        },
        "INTERACTION_TO_NEXT_PAINT": {
            label: t('INP_field'),
            desc: t('INP_field_desc'),
            icon: <MousePointer2 size={20} />
        },
        "EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT": {
            label: t('INP_field'),
            desc: t('INP_field_desc'),
            icon: <MousePointer2 size={20} />
        },
        "FIRST_CONTENTFUL_PAINT_MS": {
            label: t('FCP_field'),
            desc: t('FCP_field_desc'),
            icon: <Type size={20} />
        },
        "EXPERIMENTAL_TIME_TO_FIRST_BYTE_MS": {
            label: t('TTFB_field'),
            desc: t('TTFB_field_desc'),
            icon: <Database size={20} />
        }
    };

    const metricArray = Object.entries(metrics)
        .map(([key, value]: [string, any]) => {
            const info = metricInfo[key] || {
                label: key.replace(/_/g, " ").toLowerCase(),
                desc: "Metrica aggiuntiva rilevata dall'esperienza utente reale.",
                icon: <Activity size={20} />
            };
            return {
                key,
                ...info,
                value: key.includes("SCORE") ? (value.percentile / 100).toFixed(2) : `${(value.percentile / 1000).toFixed(2)}s`,
                status: value.category,
                distributions: value.distributions
            };
        });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                            <Globe className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black font-display text-white">{t('fieldDataTitle')}</h3>
                    </div>
                    <p className="text-zinc-500 font-medium max-w-xl text-xs md:text-sm italic">
                        {t('fieldDataSubtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-white/5 border border-white/10 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl shadow-inner">
                    <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> {t('fast')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> {t('normal')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-rose-400">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> {t('slow')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {metricArray.map((metric, i) => (
                    <motion.div
                        key={metric.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="group relative glass rounded-[2rem] p-6 md:p-8 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden"
                    >
                        {/* Status Glow Background */}
                        <div className={`absolute -right-20 -top-20 w-48 h-48 blur-[100px] opacity-10 bg-gradient-to-br ${getStatusColor(metric.status)}`} />

                        <div className="flex items-start justify-between relative z-10">
                            <div className="space-y-3 md:space-y-4 flex-grow pr-4 md:pr-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 md:p-2 rounded-xl bg-black/20 text-white/80`}>
                                        {metric.icon}
                                    </div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{metric.label}</h4>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-3xl md:text-5xl font-black font-mono tracking-tighter text-white">
                                        {metric.value}
                                    </div>
                                    <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest inline-flex px-1.5 md:px-2 py-0.5 rounded bg-gradient-to-r text-white ${getStatusColor(metric.status)}`}>
                                        {getStatusText(metric.status)}
                                    </div>
                                </div>

                                <p className="text-[11px] md:text-xs text-zinc-500 leading-relaxed font-medium">
                                    {metric.desc}
                                </p>
                            </div>

                            <div className="flex flex-col gap-1 items-end pt-2 shrink-0">
                                <div className="h-24 md:h-40 w-1 md:w-1.5 rounded-full bg-black/40 overflow-hidden flex flex-col-reverse">
                                    {metric.distributions.map((d: any, idx: number) => (
                                        <div
                                            key={idx}
                                            style={{ height: `${d.proportion * 100}%` }}
                                            className={idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-amber-500" : "bg-rose-500"}
                                        />
                                    ))}
                                </div>
                                <span className="text-[7px] md:text-[8px] font-bold opacity-30 uppercase tracking-widest mt-2 origin-center rotate-90">Distr.</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {fieldData.overall_category && (
                <div className="relative overflow-hidden p-8 glass rounded-[2rem] border border-white/10 flex items-center gap-6 bg-gradient-to-r from-white/5 to-white/[0.02]">
                    <div className={`p-5 rounded-2xl ${fieldData.overall_category === "FAST" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]"}`}>
                        {fieldData.overall_category === "FAST" ? (
                            <CheckCircle2 size={32} />
                        ) : (
                            <AlertCircle size={32} />
                        )}
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold">{t('verdictTitle')}</h4>
                        <p className="text-zinc-500 text-sm leading-snug">
                            {t('verdictPassed', fieldData.overall_category === "FAST")}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
