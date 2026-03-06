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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden glass-dark rounded-3xl flex flex-col shadow-2xl border border-white/20"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                            {title} {t('details')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Failed Audits */}
                        {failedAudits.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider text-sm">
                                    <XCircle size={18} />
                                    {t('testFailed')} ({failedAudits.length})
                                </h4>
                                <div className="grid gap-3">
                                    {failedAudits.map((audit, i) => (
                                        <div key={`${audit.id}-${i}`} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <span className="font-semibold">{audit.title}</span>
                                                {audit.displayValue && (
                                                    <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 whitespace-nowrap">
                                                        {audit.displayValue}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm opacity-60 leading-relaxed" dangerouslySetInnerHTML={{ __html: audit.description }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Passed Audits */}
                        <div className="space-y-4">
                            <h4 className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-sm">
                                <CheckCircle2 size={18} />
                                {t('testPassed')} ({passedAudits.length})
                            </h4>
                            <div className="grid gap-3">
                                {passedAudits.map((audit, i) => (
                                    <div key={`${audit.id}-${i}`} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                        <div className="flex items-start justify-between gap-4 mb-1">
                                            <span className="font-semibold opacity-90">{audit.title}</span>
                                        </div>
                                        {audit.displayValue && (
                                            <div className="text-xs text-emerald-400/60 mb-2">{audit.displayValue}</div>
                                        )}
                                        <p className="text-sm opacity-40 leading-relaxed" dangerouslySetInnerHTML={{ __html: audit.description }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
