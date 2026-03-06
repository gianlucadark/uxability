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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                            <Thermometer className="w-6 h-6" />
                        </div>
                        <h3 className="text-3xl font-black font-display text-white">{t('labMetricsTitle')}</h3>
                    </div>
                    <p className="text-zinc-500 font-medium text-sm max-w-lg">
                        {t('labMetricsSubtitle')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, i) => (
                    <motion.div
                        key={item.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="group flex flex-col p-6 md:p-8 glass rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:bg-white/[0.07] transition-all duration-500"
                    >
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <div className="p-2.5 md:p-3 rounded-2xl bg-black/20 text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-400/10 transition-all duration-500 shadow-xl shadow-black/10">
                                {item.icon}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-20 group-hover:opacity-100 transition-opacity">Info</div>
                        </div>

                        <div className="space-y-1 mb-4 md:mb-6">
                            <div className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-400">{item.label}</div>
                            <div className="text-3xl md:text-4xl font-black font-mono tracking-tighter text-white transition-transform group-hover:translate-x-1 duration-500">
                                {item.value}
                            </div>
                        </div>

                        <div className="pt-4 md:pt-6 border-t border-white/5 mt-auto">
                            <h5 className="text-[10px] md:text-[11px] font-black uppercase tracking-tighter text-white mb-2 opacity-60">{item.title}</h5>
                            <p className="text-[11px] md:text-xs text-zinc-500 leading-relaxed font-medium">
                                {item.desc}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex justify-center pt-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <HelpCircle size={14} className="text-cyan-400" />
                    {t('labMetricsFooter')}
                </div>
            </div>
        </div>
    );
}
