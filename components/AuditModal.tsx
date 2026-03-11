"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Info } from "lucide-react";

interface Audit {
    id: string;
    title: string;
    description: string;
    score: number | null;
    displayValue?: string;
}

interface AuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    audits: Audit[];
}

import { useLanguage } from "@/context/LanguageContext";

export default function AuditModal({ isOpen, onClose, title, audits }: AuditModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const passedAudits = audits.filter(a => a.score === 1 || a.score === null);
    const failedAudits = audits.filter(a => a.score !== 1 && a.score !== null);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-[#1e293b] rounded-2xl flex flex-col shadow-2xl border border-[#334155]"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-[#334155] flex items-center justify-between bg-[#0f172a]">
                            <h3 className="text-xl font-bold text-white">
                                {title} {t('details')}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#1e293b]">
                            {/* Failed Audits */}
                            {failedAudits.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-rose-500 font-bold uppercase tracking-widest text-[10px]">
                                        <XCircle size={16} />
                                        {t('testFailed')} ({failedAudits.length})
                                    </h4>
                                    <div className="grid gap-3">
                                        {failedAudits.map((audit, i) => (
                                            <div key={`${audit.id}-${i}`} className="p-5 rounded-xl bg-[#0f172a] border border-rose-900/20">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <span className="font-bold text-white text-sm">{audit.title}</span>
                                                    {audit.displayValue && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold whitespace-nowrap">
                                                            {audit.displayValue}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: audit.description }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Passed Audits */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest text-[10px]">
                                    <CheckCircle2 size={16} />
                                    {t('testPassed')} ({passedAudits.length})
                                </h4>
                                <div className="grid gap-3">
                                    {passedAudits.map((audit, i) => (
                                        <div key={`${audit.id}-${i}`} className="p-5 rounded-xl bg-[#0f172a] border border-emerald-900/20">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <span className="font-bold text-white/90 text-sm">{audit.title}</span>
                                            </div>
                                            {audit.displayValue && (
                                                <div className="text-[10px] text-emerald-500/60 font-bold mb-2 uppercase">{audit.displayValue}</div>
                                            )}
                                            <p className="text-xs text-slate-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: audit.description }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
