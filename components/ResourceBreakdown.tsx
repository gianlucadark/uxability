"use client";

import { motion } from "framer-motion";
import { FileCode, ImageIcon, FileText, Database, Layers, Info, Wifi } from "lucide-react";

interface ResourceBreakdownProps {
    resources: any[];
}

export default function ResourceBreakdown({ resources }: ResourceBreakdownProps) {
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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                            <Wifi className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black font-display text-white">Composizione Pesantezza</h3>
                    </div>
                    <p className="text-zinc-500 font-medium text-[11px] md:text-xs max-w-lg italic">
                        Un'analisi dettagliata di ogni byte trasferito. Siti più leggeri si caricano istantaneamente anche su dispositivi mobili limitati.
                    </p>
                </div>

                <div className="flex flex-col items-start md:items-end">
                    <div className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-white">{formatSize(totalSize)}</div>
                    <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.2em] text-cyan-400">Peso Totale Pagina</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 auto-rows-auto md:auto-rows-[160px]">
                {/* Main Progress Bar Card - Span Full Width */}
                <div className="md:col-span-12 glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/5 flex flex-col justify-center bg-white/[0.02]">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-blue-400" />
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Distribuzione Risorse</span>
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold opacity-30 uppercase tracking-widest">Dimensioni Proporzionali</div>
                    </div>

                    <div className="h-8 md:h-10 w-full flex rounded-xl md:rounded-2xl overflow-hidden shadow-2xl bg-black/40 border border-white/5">
                        {formatted.map((res, i) => (
                            <motion.div
                                key={res.resourceType}
                                initial={{ width: 0 }}
                                animate={{ width: `${(res.transferSize / totalSize) * 100}%` }}
                                transition={{ delay: i * 0.1, duration: 1.5, ease: "circOut" }}
                                className={`h-full relative group cursor-help transition-all duration-300 hover:brightness-125 ${getTypeColor(res.resourceType)}`}
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 md:mt-6">
                        {formatted.slice(0, 5).map((res) => (
                            <div key={res.resourceType} className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${getTypeColor(res.resourceType)}`} />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">{res.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Individual Type Cards - Bento Style */}
                {formatted.slice(0, 4).map((res, i) => (
                    <motion.div
                        key={res.resourceType}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="md:col-span-3 glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all duration-500 overflow-hidden relative min-h-[140px]"
                    >
                        <div className={`absolute -right-10 -bottom-10 w-24 h-24 blur-[40px] opacity-10 ${getTypeColor(res.resourceType)}`} />

                        <div className="flex justify-between items-start opacity-40">
                            {res.resourceType === 'script' ? <FileCode size={18} /> :
                                res.resourceType === 'image' ? <ImageIcon size={18} /> :
                                    res.resourceType === 'stylesheet' ? <FileText size={18} /> : <Layers size={18} />}
                            <span className="text-[8px] font-black uppercase tracking-widest">{res.requestCount} rich.</span>
                        </div>

                        <div className="space-y-0.5">
                            <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500">{res.label}</div>
                            <div className="text-2xl md:text-3xl font-black font-mono tracking-tighter text-white">{formatSize(res.transferSize)}</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

import { Layout } from "lucide-react";
