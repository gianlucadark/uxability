"use client";

import { motion } from "framer-motion";
import { Search, Globe } from "lucide-react";

interface SearchPreviewProps {
    url: string;
    metadata: {
        title: string;
        description: string;
    };
}

import { useLanguage } from "@/context/LanguageContext";

export default function SearchPreview({ url, metadata }: SearchPreviewProps) {
    const { t } = useLanguage();
    if (!metadata) return null;

    let displayUrl = "";
    try {
        const u = new URL(url);
        displayUrl = `${u.protocol}//${u.hostname}${u.pathname}`;
    } catch (e) {
        displayUrl = url;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white">
                    <Search className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white">{t('searchPreviewTitle')}</h3>
                    <p className="text-slate-500 text-xs md:text-sm font-medium">{t('searchPreviewSubtitle')}</p>
                </div>
            </div>

            <div className="card p-6 md:p-10 space-y-8">
                <div className="max-w-2xl bg-white rounded-2xl p-6 shadow-xl overflow-hidden group">
                    {/* Google Style Result */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <Globe size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-[#202124]">{new URL(url).hostname}</span>
                                <span className="text-[11px] text-[#4d5156] truncate max-w-[250px]">{displayUrl}</span>
                            </div>
                        </div>

                        <h4 className="text-xl text-[#1a0dab] hover:underline cursor-pointer leading-tight font-medium">
                            {metadata.title}
                        </h4>

                        <p className="text-sm text-[#4d5156] leading-relaxed line-clamp-2 max-w-xl">
                            {metadata.description}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-[#1e293b] border border-[#334155] rounded-xl">
                    <div className="shrink-0 p-2 rounded-lg bg-[#1e293b] text-slate-500">
                        <Globe size={18} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-white opacity-90">{t('metaTagOptimization')}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {t('metaTagOptimizationDesc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
