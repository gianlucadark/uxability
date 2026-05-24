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
            <div className="card p-12 animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-6 rounded-full icon-tile text-stone-500">
                    <Info size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-stone-900">{t('fieldDataNotAvailable')}</h3>
                    <p className="text-sm text-stone-600 max-w-lg leading-relaxed">
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg icon-tile">
                            <Globe className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-stone-800">{t('fieldDataTitle')}</h3>
                    </div>
                    <p className="text-stone-600 font-medium max-w-xl text-xs md:text-sm">
                        {t('fieldDataSubtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4 card px-4 md:px-6 py-2.5 md:py-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-stone-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> {t('fast')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-stone-400">
                        <div className="w-2 h-2 rounded-full bg-amber-400" /> {t('normal')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-stone-400">
                        <div className="w-2 h-2 rounded-full bg-rose-500" /> {t('slow')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metricArray.map((metric, i) => (
                    <div
                        key={`${metric.key}-${i}`}
                        className="card p-6 flex items-start justify-between"
                    >
                        <div className="space-y-4 pr-6">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-md premium-surface text-stone-600">
                                    {metric.icon}
                                </div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{metric.label}</h4>
                            </div>

                            <div className="space-y-1">
                                <div className="text-3xl font-semibold tracking-tight text-stone-900">
                                    {metric.value}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest ${metric.status === 'FAST' || metric.status === 'GOOD' ? 'text-emerald-500' : metric.status === 'AVERAGE' || metric.status === 'NEEDS_IMPROVEMENT' ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {getStatusText(metric.status)}
                                </div>
                            </div>

                            <p className="text-xs text-stone-400 leading-relaxed">
                                {metric.desc}
                            </p>
                        </div>

                        <div className="flex flex-col gap-1 items-end pt-2 shrink-0">
                            <div className="h-24 w-1.5 rounded-full bg-stone-200 overflow-hidden flex flex-col-reverse">
                                {metric.distributions.map((d: any, idx: number) => (
                                    <div
                                        key={idx}
                                        style={{ height: `${d.proportion * 100}%` }}
                                        className={idx === 0 ? "bg-emerald-400" : idx === 1 ? "bg-amber-400" : "bg-rose-400"}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {fieldData.overall_category && (
                <div className="card p-6 flex items-center gap-5">
                    <div className={`p-4 rounded-xl border ${fieldData.overall_category === "FAST" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"}`}>
                        {fieldData.overall_category === "FAST" ? (
                            <CheckCircle2 size={24} />
                        ) : (
                            <AlertCircle size={24} />
                        )}
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-stone-800">{t('verdictTitle')}</h4>
                        <p className="text-stone-500 text-sm">
                            {t('verdictPassed', fieldData.overall_category === "FAST")}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
