"use client";

import { motion } from "framer-motion";
import { Clock, MousePointer2, PlayCircle, Layers, Activity, Cpu } from "lucide-react";

interface MainThreadBreakdownProps {
    items: any[];
}

import { useLanguage } from "@/context/LanguageContext";

export default function MainThreadBreakdown({ items }: MainThreadBreakdownProps) {
    const { t } = useLanguage();

    if (!items || items.length === 0) return null;

    const totalDuration = items.reduce((acc, curr) => acc + curr.duration, 0);

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getIcon = (group: string) => {
        switch (group) {
            case 'scriptEvaluation': return <PlayCircle size={24} />;
            case 'layout': return <Layers size={24} />;
            case 'styleLayout': return <Layers size={24} />;
            case 'paintCompositeRender': return <Activity size={24} />;
            default: return <Clock size={24} />;
        }
    };

    const getGroupColor = (group: string) => {
        switch (group) {
            case 'scriptEvaluation': return "bg-rose-500 shadow-rose-500/20";
            case 'layout': return "bg-emerald-500 shadow-emerald-500/20";
            case 'paintCompositeRender': return "bg-indigo-500 shadow-indigo-500/20";
            case 'other': return "bg-zinc-500 shadow-zinc-500/20";
            default: return "bg-amber-500 shadow-amber-500/20";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white">
                            <Cpu className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white">{t('mainThreadTitle')}</h3>
                    </div>
                    <p className="text-zinc-400 font-medium text-xs md:text-sm">
                        {t('mainThreadSubtitle')}
                    </p>
                </div>

                <div className="flex flex-col items-start md:items-end">
                    <div className="text-3xl md:text-4xl font-bold tracking-tight text-white">{formatDuration(totalDuration)}</div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">Tempo Totale CPU</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Visual Chart Card - Top Bento Block */}
                <div className="md:col-span-12 card p-6 md:p-8 flex flex-col lg:flex-row items-center gap-8 md:gap-12">
                    <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90">
                            {items.slice(0, 6).sort((a, b) => b.duration - a.duration).reduce(({ offset, segments }: any, item, i) => {
                                const percent = (item.duration / totalDuration) * 100;
                                return {
                                    offset: offset + percent,
                                    segments: [
                                        ...segments,
                                        <circle
                                            key={i}
                                            cx="50%" cy="50%" r="40%"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            strokeDasharray={`${percent} ${100 - percent}`}
                                            strokeDashoffset={-offset}
                                            pathLength="100"
                                            className={`${getGroupColor(item.group).replace('bg-', 'text-')} transition-all duration-700`}
                                        />
                                    ]
                                };
                            }, { offset: 0, segments: [] }).segments}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <Cpu size={20} className="text-slate-500 mb-1" />
                        </div>
                    </div>

                    <div className="flex-grow w-full space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            {items.slice(0, 4).map((item, i) => (
                                <div key={`${item.group}-${i}`} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-[#334155] hover:border-[#475569] transition-all bg-[#0f172a]">
                                    <div className={`${getGroupColor(item.group).replace('bg-', 'text-')} opacity-80`}>
                                        {getIcon(item.group)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t(item.group) || item.groupLabel}</span>
                                        <span className="text-sm font-bold text-white">{formatDuration(item.duration)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Additional Stats - Dynamic Bento Items */}
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('scriptEvaluation')}</div>
                        <div className="text-2xl font-bold tracking-tight text-rose-500">
                            {((items.find(i => i.group === 'scriptEvaluation')?.duration || 0) / totalDuration * 100).toFixed(1)}%
                        </div>
                    </div>

                    <div className="card p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('styleLayout')}</div>
                        <div className="text-2xl font-bold tracking-tight text-emerald-500">
                            {((items.find(i => i.group === 'layout')?.duration || 0) / totalDuration * 100).toFixed(1)}%
                        </div>
                    </div>

                    <div className="card p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Totale CPU Time</div>
                        <div className="text-2xl font-bold tracking-tight text-white">
                            {formatDuration(totalDuration)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Layout } from "lucide-react";
