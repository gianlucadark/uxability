"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Zap } from "lucide-react";

interface AIRecommendationProps {
    score: number;
    opportunities: any[];
}

import { useLanguage } from "@/context/LanguageContext";

export default function AIRecommendation({ score, opportunities }: AIRecommendationProps) {
    const { t } = useLanguage();

    // Logic to select "The Best Move"
    const topFix = opportunities.find(o => o.level === "High") || opportunities[0];

    if (!topFix) return null;

    const getAdvice = (score: number) => {
        if (score >= 90) return t('aiAdvice_good');
        if (score >= 50) return t('aiAdvice_medium');
        return t('aiAdvice_poor');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{t('aiAdviceTitle')}</h3>
            </div>

            <div className="card p-6 md:p-8">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
                    <div className="space-y-4 lg:w-2/3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-slate-400">
                            {t('aiSmartAnalysis')}
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold leading-tight text-white">
                            {getAdvice(score)}
                        </h4>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                            {t('aiRecommendationDesc', topFix.title)}
                        </p>
                    </div>

                    <div className="lg:w-1/3 w-full space-y-4">
                        <div className="p-5 md:p-6 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('bestStartingPoint')}</span>
                                <Zap size={14} className="text-sky-400" />
                            </div>
                            <h5 className="font-bold text-base md:text-lg text-white">
                                {topFix.title}
                            </h5>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats Row */}
                <div className="mt-8 pt-6 border-t border-[#334155] grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('impactEstimated')}</div>
                        <div className="text-white text-sm font-bold flex items-center gap-1.5">
                            <Zap size={14} className="text-sky-400" /> +15-20 Punti
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('difficulty')}</div>
                        <div className="text-white font-bold flex items-center gap-1.5 text-sm">
                            <div className="flex gap-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                            </div>
                            {t('medium_label')}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('focusSeo')}</div>
                        <div className="text-white text-sm font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500" /> {t('high_label')}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('priority')}</div>
                        <div className="text-rose-500 text-sm font-bold flex items-center gap-1.5">
                            <AlertCircle size={14} /> {t('immediate')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
