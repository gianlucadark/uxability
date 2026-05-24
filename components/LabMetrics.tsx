"use client";

import { motion } from "framer-motion";
import { Timer, Zap, Activity, Clock, MousePointer2, Type, HelpCircle, Thermometer } from "lucide-react";

interface LabMetricsProps {
    metrics: {
        lcp?: string;
        fid?: string;
        cls?: string;
        tbt?: string;
        si?: string;
        tti?: string;
        fcp?: string;
    };
}

import { useLanguage } from "@/context/LanguageContext";

export default function LabMetrics({ metrics }: LabMetricsProps) {
    const { t } = useLanguage();
    if (!metrics) return null;

    const metricItems: Record<string, { label: string; desc: string; icon: any; title: string }> = {
        lcp: {
            title: t('lcp_title'),
            label: t('lcp_label'),
            desc: t('lcp_desc'),
            icon: <Zap size={24} />
        },
        tbt: {
            title: t('tbt_title'),
            label: t('tbt_label'),
            desc: t('tbt_desc'),
            icon: <Timer size={24} />
        },
        cls: {
            title: t('cls_title'),
            label: t('cls_label'),
            desc: t('cls_desc'),
            icon: <Activity size={24} />
        },
        si: {
            title: t('si_title'),
            label: t('si_label'),
            desc: t('si_desc'),
            icon: <Clock size={24} />
        },
        tti: {
            title: t('tti_title'),
            label: t('tti_label'),
            desc: t('tti_desc'),
            icon: <MousePointer2 size={24} />
        },
        fcp: {
            title: t('fcp_title'),
            label: t('fcp_label'),
            desc: t('fcp_desc'),
            icon: <Type size={24} />
        }
    };

    const items = Object.entries(metricItems)
        // @ts-ignore
        .filter(([key]) => metrics[key])
        .map(([key, info]) => ({
            key,
            ...info,
            // @ts-ignore
            value: metrics[key]
        }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-600">
                            <Thermometer className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-stone-800">{t('labMetricsTitle')}</h3>
                    </div>
                    <p className="text-stone-400 font-medium text-xs md:text-sm">
                        {t('labMetricsSubtitle')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item, i) => (
                    <div
                        key={`${item.key}-${i}`}
                        className="card p-6 flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 rounded-md bg-stone-100 text-stone-500">
                                {item.icon}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{item.title}</div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <h4 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">{item.value}</h4>
                            <div className="text-xs font-semibold text-stone-400">{item.label}</div>
                        </div>

                        <p className="text-xs text-stone-400 leading-relaxed pt-4 border-t border-stone-200">
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-stone-100 border border-stone-200 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                    <HelpCircle size={14} className="text-stone-400" />
                    {t('labMetricsFooter')}
                </div>
            </div>
        </div>
    );
}
