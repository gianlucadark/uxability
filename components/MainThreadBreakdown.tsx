"use client";

import { motion } from "framer-motion";
import { Clock, MousePointer2, PlayCircle, Layers, Activity, Cpu } from "lucide-react";

interface MainThreadBreakdownProps {
    items: any[];
}

export default function MainThreadBreakdown({ items }: MainThreadBreakdownProps) {
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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                            <Cpu className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black font-display text-white">Lavoro Main Thread</h3>
                    </div>
                    <p className="text-zinc-500 font-medium text-[11px] md:text-xs max-w-lg italic">
                        Misura quanto tempo il browser impiega per processare il caricamento. Se il processore è occupato, l'interfaccia si blocca.
                    </p>
                </div>

                <div className="flex flex-col items-start md:items-end">
                    <div className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-white">{formatDuration(totalDuration)}</div>
                    <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.2em] text-rose-400">Tempo Totale CPU</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">
                {/* Visual Chart Card - Top Bento Block */}
                <div className="md:col-span-12 glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-white/5 bg-gradient-to-br from-rose-500/[0.03] to-white/[0.01] flex flex-col lg:flex-row items-center gap-8 md:gap-12 overflow-hidden relative">
                    {/* Background Decorative CPU Glow */}
                    <div className="absolute -left-20 -top-20 w-64 h-64 bg-rose-500/5 blur-[100px] pointer-events-none" />

                    <div className="relative w-40 h-40 md:w-48 md:h-48 flex-shrink-0 group">
                        <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                            {items.slice(0, 6).sort((a, b) => b.duration - a.duration).reduce(({ offset, segments }: any, item, i) => {
                                const percent = (item.duration / totalDuration) * 100;
                                return {
                                    offset: offset + percent,
                                    segments: [
                                        ...segments,
                                        <motion.circle
                                            key={i}
                                            cx="50%" cy="50%" r="40%"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="14"
                                            strokeDasharray={`${percent} ${100 - percent}`}
                                            strokeDashoffset={-offset}
                                            pathLength="100"
                                            className={`${getGroupColor(item.group).replace('bg-', 'text-')} transition-all duration-700 hover:strokeWidth-20`}
                                        />
                                    ]
                                };
                            }, { offset: 0, segments: [] }).segments}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <Cpu size={24} className="text-rose-400 mb-1 animate-pulse" />
                            <div className="text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-30">CPU Work</div>
                        </div>
                    </div>

                    <div className="flex-grow w-full space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            {items.slice(0, 4).map((item, i) => (
                                <div key={item.group} className="flex items-center gap-3 md:gap-4 bg-white/[0.02] p-3 md:p-4 rounded-2xl border border-white/5 border-l-4 group hover:bg-white/[0.05] transition-all" style={{ borderLeftColor: `var(--${item.group}-color, currentColor)` }}>
                                    <div className={`${getGroupColor(item.group).replace('bg-', 'text-')} opacity-60`}>
                                        {getIcon(item.group)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.groupLabel}</span>
                                        <span className="text-lg md:text-xl font-black font-mono tracking-tight text-white">{formatDuration(item.duration)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 md:p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3 items-center">
                            <MousePointer2 size={14} className="text-orange-400 shrink-0" />
                            <p className="text-[9px] md:text-[10px] font-bold text-orange-400/80 uppercase tracking-widest leading-relaxed">
                                Un Main Thread troppo carico rende impossibile l'interazione fluida per l'utente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Additional Stats - Dynamic Bento Items */}
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2">
                        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">Intensità Script</div>
                        <div className="text-3xl md:text-4xl font-black font-mono text-rose-500">
                            {((items.find(i => i.group === 'scriptEvaluation')?.duration || 0) / totalDuration * 100).toFixed(1)}%
                        </div>
                        <p className="text-[8px] md:text-[9px] font-bold opacity-30 uppercase tracking-tighter">Tempo speso in JS</p>
                    </div>

                    <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2">
                        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">Efficienza Layout</div>
                        <div className="text-3xl md:text-4xl font-black font-mono text-emerald-500">
                            {((items.find(i => i.group === 'layout')?.duration || 0) / totalDuration * 100).toFixed(1)}%
                        </div>
                        <p className="text-[8px] md:text-[9px] font-bold opacity-30 uppercase tracking-tighter">Rendering Struttura</p>
                    </div>

                    <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2 sm:col-span-2 md:col-span-1">
                        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">Tempo Totale</div>
                        <div className="text-xl md:text-2xl font-black font-mono text-white">
                            {formatDuration(totalDuration)}
                        </div>
                        <p className="text-[8px] md:text-[9px] font-bold opacity-30 uppercase tracking-tighter">Operatività Browser</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Layout } from "lucide-react";
