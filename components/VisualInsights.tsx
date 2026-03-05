"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Camera, PlayCircle, Eye, Info } from "lucide-react";

interface VisualInsightsProps {
    screenshot: string;
    thumbnails: any[];
}

export default function VisualInsights({ screenshot, thumbnails }: VisualInsightsProps) {
    if (!screenshot) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">Visual Rendering</h3>
                <div className="h-px flex-grow bg-white/10"></div>
                <div className="flex items-center gap-2 opacity-40 text-xs font-bold uppercase tracking-widest">
                    <Eye size={12} /> Come appare l'utente
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Screenshot Column */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="relative group glass rounded-3xl p-2 border border-white/10 overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Camera size={18} className="text-cyan-400" />
                                <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Preview finale Desktop</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 group-hover:shadow-[0_0_80px_rgba(34,211,238,0.15)] transition-shadow duration-700">
                            <img
                                src={screenshot}
                                alt="Final Screenshot"
                                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-40" />
                        </div>
                    </div>

                    <div className="p-4 glass rounded-2xl border border-white/5 flex items-start gap-3">
                        <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-sm opacity-60 leading-relaxed italic">
                            Uno screenshot catturato al termine del caricamento della pagina aiuta a verificare se il rendering è corretto.
                        </p>
                    </div>
                </div>

                {/* Loading Timeline Column */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col h-full space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <PlayCircle size={18} className="text-blue-400" />
                            <span className="text-sm font-bold opacity-70 uppercase tracking-widest">Time-lapse Caricamento</span>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar pr-4">
                            {thumbnails?.map((thumb, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group flex flex-row items-center gap-4 py-3 border-b border-white/5 last-border-none"
                                >
                                    <div className="relative w-24 h-16 flex-shrink-0 aspect-video rounded-lg overflow-hidden border border-white/10 bg-zinc-800 shadow-lg group-hover:scale-110 transition-transform">
                                        <img src={thumb.data} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-xs font-bold text-white tracking-widest leading-none mb-1">{thumb.timestamp}ms</p>
                                        <p className="text-[10px] uppercase font-bold opacity-30">Snapshot {i + 1}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-4 mt-auto border-t border-white/5 text-[11px] opacity-40 leading-snug">
                            Questa timeline cattura i momenti cruciali del caricamento. Se le prime miniature sono vuote, il tempo di percezione del primo contenuto è alto.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
