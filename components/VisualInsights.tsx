"use client";

import { Camera, PlayCircle, Info } from "lucide-react";

interface VisualInsightsProps {
    screenshot: string;
    thumbnails: any[];
}

export default function VisualInsights({ screenshot, thumbnails }: VisualInsightsProps) {
    if (!screenshot) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg icon-tile">
                    <Camera className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-stone-900">Visual Rendering</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Screenshot Column */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="card overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100/70">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest text-[10px]">Preview finale Desktop</span>
                            </div>
                            <div className="flex gap-1.5 opacity-30">
                                <div className="w-2 h-2 rounded-full bg-stone-500" />
                                <div className="w-2 h-2 rounded-full bg-stone-500" />
                                <div className="w-2 h-2 rounded-full bg-stone-500" />
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                                <img
                                    src={screenshot}
                                    alt="Final Screenshot"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card p-4 flex items-start gap-3">
                        <Info size={18} className="text-stone-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-stone-600 leading-relaxed italic">
                            Uno screenshot catturato al termine del caricamento della pagina aiuta a verificare se il rendering è corretto.
                        </p>
                    </div>
                </div>

                {/* Loading Timeline Column */}
                <div className="lg:col-span-4">
                    <div className="card p-6 flex flex-col h-full space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <PlayCircle size={18} className="text-stone-500" />
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-widest text-[10px]">Time-lapse Caricamento</span>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                            {thumbnails?.map((thumb, i) => (
                                <div
                                    key={i}
                                    className="flex flex-row items-center gap-4 py-3 border-b border-stone-200 last:border-none"
                                >
                                    <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                                        <img src={thumb.data} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-bold text-stone-900 tracking-tight leading-none mb-1">{thumb.timestamp}ms</p>
                                        <p className="text-[10px] uppercase font-bold text-stone-500">Snapshot {i + 1}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 mt-auto border-t border-stone-200 text-[10px] text-stone-500 leading-snug italic">
                            Questa timeline cattura i momenti cruciali del caricamento. Se le prime miniature sono vuote, il tempo di percezione del primo contenuto è alto.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
