"use client";

import { motion } from "framer-motion";
import { Meh, Frown, Angry, Smile, AlertTriangle, Zap, Layout } from "lucide-react";
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
            textColor: 'text-emerald-400',
            hexColor: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.2)'
        };
        if (score <= 50) return {
            emoji: <Meh className="text-amber-400" size={48} />,
            label: t('rageStatus_medium'),
            desc: t('rageDesc_medium'),
            color: 'bg-amber-400',
            textColor: 'text-amber-400',
            hexColor: '#fbbf24',
            glowColor: 'rgba(251, 191, 36, 0.2)'
        };
        if (score <= 80) return {
            emoji: <Frown className="text-orange-500" size={48} />,
            label: t('rageStatus_high'),
            desc: t('rageDesc_high'),
            color: 'bg-orange-500',
            textColor: 'text-orange-500',
            hexColor: '#f97316',
            glowColor: 'rgba(249, 115, 22, 0.2)'
        };
        return {
            emoji: <Angry className="text-rose-500" size={48} />,
            label: t('rageStatus_extreme'),
            desc: t('rageDesc_extreme'),
            color: 'bg-rose-500',
            textColor: 'text-rose-500',
            hexColor: '#f43f5e',
            glowColor: 'rgba(244, 63, 94, 0.2)'
        };
    };

    const status = getStatus(score);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-sky-400">
                            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t('rageMeterTitle')}</h3>
                    </div>
                    <p className="text-slate-400 text-sm md:text-base ml-12">
                        {t('rageMeterSubtitle')}
                    </p>
                </div>
            </div>

            <div className="relative group">
                {/* Background Glow */}
                <div 
                    className="absolute -inset-1 rounded-[2rem] opacity-20 blur-2xl transition duration-1000 group-hover:duration-200"
                    style={{ backgroundColor: status.glowColor }}
                />
                
                <div className="relative card overflow-hidden bg-[#1e293b]/30 backdrop-blur-xl border-white/10 p-1 md:p-2 rounded-[2rem]">
                    <div className="bg-[#0f172a]/80 rounded-[1.8rem] p-6 md:p-10">
                        <div className="flex flex-col md:flex-row gap-12 items-center">
                            
                            {/* Score Display */}
                            <div className="flex flex-col items-center justify-center gap-6 md:w-1/3">
                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ 
                                            type: "spring",
                                            stiffness: 260,
                                            damping: 20,
                                            delay: 0.2 
                                        }}
                                        className="relative z-10"
                                    >
                                        <div className="p-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                                            {status.emoji}
                                        </div>
                                    </motion.div>
                                    
                                    {/* Animated Ring */}
                                    <div 
                                        className="absolute -inset-4 rounded-full border border-dashed opacity-20 animate-spin-slow"
                                        style={{ borderColor: status.hexColor }}
                                    />
                                </div>
                                
                                <div className="text-center space-y-2">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-5xl md:text-6xl font-black text-white"
                                    >
                                        {score}<span className="text-lg font-medium opacity-40 ml-1">%</span>
                                    </motion.div>
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className={`text-xs font-black uppercase tracking-[0.2em] ${status.textColor}`}
                                    >
                                        {status.label}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Meter and Explanations */}
                            <div className="md:w-2/3 w-full space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {t('rageIndexLabel')}
                                        </span>
                                        <span className="text-xs font-mono text-slate-500">
                                            {score} / 100
                                        </span>
                                    </div>
                                    
                                    {/* Custom Segmented Meter */}
                                    <div className="flex gap-1.5 h-4 w-full">
                                        {[...Array(20)].map((_, i) => {
                                            const isActive = (i + 1) * 5 <= score;
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scaleY: 0.5 }}
                                                    animate={{ 
                                                        opacity: isActive ? 1 : 0.1, 
                                                        scaleY: isActive ? 1 : 0.8 
                                                    }}
                                                    transition={{ delay: i * 0.03 }}
                                                    className={`flex-1 rounded-full ${isActive ? status.color : 'bg-slate-700'}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3"
                                >
                                    <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
                                        {status.desc}
                                    </p>
                                    <p className="text-slate-500 text-xs md:text-sm italic">
                                        {t('frustrationDesc') || "This metric correlates visual stability and input lag to estimate user satisfaction."}
                                    </p>
                                </motion.div>

                                {/* Metrics Breakdown */}
                                <div className="grid grid-cols-2 gap-6 pt-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Layout size={14} className="text-sky-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Layout Instability</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <div className="text-2xl font-bold text-white leading-none">{cls.toFixed(3)}</div>
                                            <div className={`text-[10px] font-bold mb-1 ${cls > 0.1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {cls > 0.1 ? t('statusCritical') : t('statusExcellent')}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Zap size={14} className="text-amber-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Input Delay</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <div className="text-2xl font-bold text-white leading-none">{Math.round(tbt)}ms</div>
                                            <div className={`text-[10px] font-bold mb-1 ${tbt > 200 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {tbt > 200 ? t('statusCritical') : t('statusExcellent')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
            `}</style>
        </div>
    );
}
