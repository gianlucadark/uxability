"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle } from "lucide-react";

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

    useEffect(() => {
        if (!isOpen) return;

        const scrollY = window.scrollY;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousHtmlScrollBehavior = document.documentElement.style.scrollBehavior;
        const previousOverflow = document.body.style.overflow;
        const previousPaddingRight = document.body.style.paddingRight;
        const previousPosition = document.body.style.position;
        const previousTop = document.body.style.top;
        const previousWidth = document.body.style.width;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPaddingRight;
            document.body.style.position = previousPosition;
            document.body.style.top = previousTop;
            document.body.style.width = previousWidth;
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo(0, scrollY);
            window.requestAnimationFrame(() => {
                document.documentElement.style.scrollBehavior = previousHtmlScrollBehavior;
            });
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const passedAudits = audits.filter(a => a.score === 1 || a.score === null);
    const failedAudits = audits.filter(a => a.score !== 1 && a.score !== null);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4"
                    onWheel={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#faf8f5] shadow-2xl md:max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-5">
                            <h3 className="text-xl font-bold text-stone-900">
                                {title} {t('details')}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-800"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[calc(100dvh-7.5rem)] min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#faf8f5] p-6 space-y-8 custom-scrollbar md:max-h-[calc(80vh-5rem)]">
                            {/* Failed Audits */}
                            {failedAudits.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-rose-500 font-bold uppercase tracking-widest text-[10px]">
                                        <XCircle size={16} />
                                        {t('testFailed')} ({failedAudits.length})
                                    </h4>
                                    <div className="grid gap-3">
                                        {failedAudits.map((audit, i) => (
                                            <div key={`${audit.id}-${i}`} className="p-5 rounded-xl bg-white border border-rose-200/60">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <span className="font-bold text-stone-800 text-sm">{audit.title}</span>
                                                    {audit.displayValue && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold whitespace-nowrap">
                                                            {audit.displayValue}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-stone-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: audit.description }} />
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
                                        <div key={`${audit.id}-${i}`} className="p-5 rounded-xl bg-white border border-emerald-200/60">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <span className="font-bold text-stone-700 text-sm">{audit.title}</span>
                                            </div>
                                            {audit.displayValue && (
                                                <div className="text-[10px] text-emerald-500/60 font-bold mb-2 uppercase">{audit.displayValue}</div>
                                            )}
                                            <p className="text-xs text-stone-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: audit.description }} />
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
