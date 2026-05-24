"use client";

import { Sparkles, CheckCircle2, AlertCircle, Zap } from "lucide-react";

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
                <div className="p-2 rounded-lg icon-tile">
                    <Sparkles className="w-5 h-5 text-stone-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800">{t('aiAdviceTitle')}</h3>
            </div>

            <div className="card p-6 md:p-8 overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[var(--graphite-900)] via-[var(--champagne)] to-transparent opacity-70" />
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
                    <div className="space-y-4 lg:w-2/3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md eyebrow-pill text-[10px] uppercase tracking-widest">
                            {t('aiSmartAnalysis')}
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold leading-tight text-stone-800">
                            {getAdvice(score)}
                        </h4>
                        <p className="text-stone-500 text-sm leading-relaxed max-w-xl">
                            {t('aiRecommendationDesc', topFix.title)}
                        </p>
                    </div>

                    <div className="lg:w-1/3 w-full space-y-4">
                        <div className="p-5 md:p-6 rounded-xl premium-surface space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('bestStartingPoint')}</span>
                                <Zap size={14} className="text-stone-500" />
                            </div>
                            <h5 className="font-bold text-base md:text-lg text-stone-800">
                                {topFix.title}
                            </h5>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats Row */}
                <div className="mt-8 pt-6 border-t border-stone-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('impactEstimated')}</div>
                        <div className="text-stone-800 text-sm font-bold flex items-center gap-1.5">
                            <Zap size={14} className="text-stone-600" /> +15-20 Punti
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('difficulty')}</div>
                        <div className="text-stone-800 font-bold flex items-center gap-1.5 text-sm">
                            <div className="flex gap-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            </div>
                            {t('medium_label')}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('focusSeo')}</div>
                        <div className="text-stone-800 text-sm font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-[var(--success)]" /> {t('high_label')}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('priority')}</div>
                            <div className="text-[var(--danger)] text-sm font-bold flex items-center gap-1.5">
                            <AlertCircle size={14} /> {t('immediate')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
