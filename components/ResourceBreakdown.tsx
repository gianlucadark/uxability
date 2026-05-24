"use client";

import { motion } from "framer-motion";
import { FileCode, ImageIcon, FileText, Database, Layers, Info, Wifi } from "lucide-react";

interface ResourceBreakdownProps {
    resources: any[];
}

import { useLanguage } from "@/context/LanguageContext";

export default function ResourceBreakdown({ resources }: ResourceBreakdownProps) {
    const { t } = useLanguage();

    if (!resources || resources.length === 0) return null;

    const formatted = resources
        .filter(r => r.resourceType !== 'total')
        .sort((a, b) => b.transferSize - a.transferSize);

    const totalSize = formatted.reduce((acc, curr) => acc + curr.transferSize, 0);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'script': return "bg-orange-500";
            case 'image': return "bg-cyan-500";
            case 'stylesheet': return "bg-blue-600";
            case 'document': return "bg-rose-500";
            case 'font': return "bg-emerald-500";
            default: return "bg-zinc-500";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-600">
                            <Wifi className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-stone-800">{t('resourceTitle')}</h3>
                    </div>
                    <p className="text-stone-400 font-medium text-xs md:text-sm">
                        {t('resourceSubtitle')}
                    </p>
                </div>

                <div className="flex flex-col items-start md:items-end">
                    <div className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">{formatSize(totalSize)}</div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mt-1">{t('totalWeight')}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Main Progress Bar Card - Span Full Width */}
                <div className="md:col-span-12 card p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-stone-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{t('resourceBreakdown')}</span>
                        </div>
                    </div>

                    <div className="h-4 md:h-6 w-full flex rounded-full overflow-hidden bg-stone-200">
                        {formatted.map((res, i) => (
                            <div
                                key={`${res.resourceType}-${i}`}
                                style={{ width: `${(res.transferSize / totalSize) * 100}%` }}
                                className={`h-full relative group cursor-help transition-all duration-300 hover:brightness-125 ${getTypeColor(res.resourceType)}`}
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6">
                        {formatted.slice(0, 5).map((res, i) => (
                            <div key={`${res.resourceType}-label-${i}`} className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${getTypeColor(res.resourceType)}`} />
                                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-widest text-stone-400">{t(res.resourceType) || res.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Individual Type Cards - Bento Style */}
                {formatted.slice(0, 4).map((res, i) => (
                    <div
                        key={`${res.resourceType}-card-${i}`}
                        className="md:col-span-3 card p-5 flex flex-col justify-between min-h-[120px]"
                    >
                        <div className="flex justify-between items-start text-stone-400">
                            {res.resourceType === 'script' ? <FileCode size={18} /> :
                                res.resourceType === 'image' ? <ImageIcon size={18} /> :
                                    res.resourceType === 'stylesheet' ? <FileText size={18} /> : <Layers size={18} />}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{res.requestCount} {t('requests').toLowerCase()}</span>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t(res.resourceType) || res.label}</div>
                            <div className="text-xl font-bold tracking-tight text-stone-900">{formatSize(res.transferSize)}</div>
                        </div>
                    </div>
                ))}



            </div>
        </div>
    );
}
