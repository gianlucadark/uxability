"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Zap } from "lucide-react";

interface AIRecommendationProps {
    score: number;
    opportunities: any[];
}

export default function AIRecommendation({ score, opportunities }: AIRecommendationProps) {
    // Logic to select "The Best Move"
    const topFix = opportunities.find(o => o.level === "High") || opportunities[0];

    if (!topFix) return null;

    const getAdvice = (score: number) => {
        if (score >= 90) return "Il tuo sito è in ottima forma! Concentrati solo su micro-ottimizzazioni per mantenere il primato.";
        if (score >= 50) return "Sei a metà strada. Con pochi interventi mirati sulle immagini e sugli script puoi entrare nella fascia verde.";
        return "Attenzione: le prestazioni attuali potrebbero penalizzare il tuo SEO e far scappare gli utenti. Inizia subito dalle criticità 'High'.";
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black font-display text-white">Consiglio dello Strategist</h3>
            </div>

            <div className="p-6 md:p-8 glass rounded-[2rem] md:rounded-[2.5rem] border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.05] to-blue-600/[0.05] relative overflow-hidden shadow-2xl">
                {/* Decorative particles */}
                <div className="absolute top-0 right-0 p-8 opacity-10 hidden md:block">
                    <Sparkles size={120} />
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start relative z-10">
                    <div className="space-y-4 lg:w-2/3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-purple-300">
                            Analisi Intelligente
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold leading-tight">
                            {getAdvice(score)}
                        </h4>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-xl">
                            Il nostro motore di analisi ha identificato che intervenire su <span className="text-white font-bold">{topFix.title}</span> è l'azione con il miglior rapporto sforzo/risultato per il tuo sito.
                        </p>
                    </div>

                    <div className="lg:w-1/3 w-full space-y-4">
                        <div className="p-5 md:p-6 rounded-3xl bg-black/40 border border-white/10 space-y-3 md:space-y-4 hover:border-purple-500/40 transition-colors group">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">Miglior Punto di Partenza</span>
                                <Zap size={14} className="text-amber-400" />
                            </div>
                            <h5 className="font-bold text-base md:text-lg leading-snug group-hover:text-purple-300 transition-colors">
                                {topFix.title}
                            </h5>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats Row */}
                <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-500">Impatto Stimato</div>
                        <div className="text-white text-xs md:text-sm font-bold flex items-center gap-1.5">
                            <Zap size={12} className="text-amber-400" /> +15-20 Punti
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-500">Difficoltà</div>
                        <div className="text-white font-bold flex items-center gap-1.5 text-[10px] md:text-xs">
                            <div className="flex gap-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            </div>
                            Media
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-500">Focus SEO</div>
                        <div className="text-white text-xs md:text-sm font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-400" /> Alto
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-500">Priority</div>
                        <div className="text-rose-400 text-xs md:text-sm font-bold flex items-center gap-1.5">
                            <AlertCircle size={12} /> Immediata
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
