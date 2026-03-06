"use client";

import { motion } from "framer-motion";
import { Meh, Frown, Angry, Smile, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FrustrationIndexProps {
    cls: number;
    tbt: number;
}

export default function FrustrationIndex({ cls, tbt }: FrustrationIndexProps) {
    const { t } = useLanguage();

    // Calculate frustration score (0-100)
    // CLS: 0-0.1 (good), 0.1-0.25 (needs improvement), >0.25 (poor)
    // TBT: 0-200ms (good), 200-600ms (needs improvement), >600ms (poor)

    const clsComponent = Math.min((cls / 0.3) * 50, 50);
    const tbtComponent = Math.min((tbt / 800) * 50, 50);
    const score = Math.round(clsComponent + tbtComponent);

    const getStatus = (score: number) => {
        if (score <= 25) return {
            emoji: <Smile className="text-emerald-400" size={48} />,
            label: t('rageStatus_low'),
            desc: t('rageDesc_low'),
            color: 'bg-emerald-400',
            textColor: 'text-emerald-400'
        };
        if (score <= 50) return {
            emoji: <Meh className="text-yellow-400" size={48} />,
            label: t('rageStatus_medium'),
            desc: t('rageDesc_medium'),
            color: 'bg-yellow-400',
            textColor: 'text-yellow-400'
        };
        if (score <= 80) return {
            emoji: <Frown className="text-orange-500" size={48} />,
            label: t('rageStatus_high'),
            desc: t('rageDesc_high'),
            color: 'bg-orange-500',
            textColor: 'text-orange-500'
        };
        return {
            emoji: <Angry className="text-rose-500" size={48} />,
            label: t('rageStatus_extreme'),
            desc: t('rageDesc_extreme'),
            color: 'bg-rose-500',
            textColor: 'text-rose-500'
        };
    };

    const status = getStatus(score);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black font-display text-white">{t('rageMeterTitle')}</h3>
            </div>

            <div className="p-6 md:p-8 glass rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-rose-500/[0.05] to-orange-500/[0.05] relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                    <div className="flex flex-col items-center gap-4 md:w-1/3">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 100 }}
                        >
                            {status.emoji}
                        </motion.div>
                        <div className="text-center">
                            <div className="text-4xl font-black text-white mb-1">{score}%</div>
                            <div className={`text-xs font-black uppercase tracking-widest ${status.textColor}`}>
                                {status.label}
                            </div>
                        </div>
                    </div>

                    <div className="md:w-2/3 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <span>{t('rageIndexLabel')}</span>
                                <span>{score}/100</span>
                            </div>
                            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${score}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full rounded-full ${status.color} shadow-[0_0_15px_rgba(244,63,94,0.3)]`}
                                />
                            </div>
                        </div>

                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                            {status.desc}
                        </p>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Layout Instability</div>
                                <div className="text-white font-bold">{cls.toFixed(3)}</div>
                            </div>
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Input Delay</div>
                                <div className="text-white font-bold">{Math.round(tbt)}ms</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
