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

export default function SearchPreview({ url, metadata }: SearchPreviewProps) {
    if (!metadata) return null;

    let displayUrl = "";
    try {
        const u = new URL(url);
        displayUrl = `${u.protocol}//${u.hostname}${u.pathname}`;
    } catch (e) {
        displayUrl = url;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">Anteprima Search Engine</h3>
                <div className="h-px flex-grow bg-white/10"></div>
            </div>

            <div className="p-8 glass rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="max-w-2xl bg-white rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                    {/* Mock Search Header */}
                    <div className="flex items-center gap-3 mb-4 opacity-50 border-b pb-3">
                        <div className="p-1.5 rounded-full bg-zinc-100 text-zinc-500">
                            <Search size={14} />
                        </div>
                        <div className="h-2 w-32 bg-zinc-100 rounded-full" />
                    </div>

                    {/* Google Style Result */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-[#202124] mb-1">
                            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                                <Globe size={12} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs leading-none font-medium">{new URL(url).hostname}</span>
                                <span className="text-[10px] opacity-60 leading-tight truncate max-w-[200px]">{displayUrl}</span>
                            </div>
                        </div>

                        <h4 className="text-[20px] text-[#1a0dab] hover:underline cursor-pointer leading-snug font-normal">
                            {metadata.title}
                        </h4>

                        <p className="text-sm text-[#4d5156] leading-relaxed line-clamp-2 max-w-xl">
                            {metadata.description}
                        </p>
                    </div>

                    {/* Badge Overlay */}
                    <div className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                        SEO Mode
                    </div>
                </div>

                <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <div className="shrink-0 p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <Globe size={18} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold opacity-90">Ottimizzazione Meta-Tag</p>
                        <p className="text-xs opacity-60 leading-relaxed">
                            Il titolo e la descrizione sono i primi elementi che l'utente vede su Google. Assicurati che siano coerenti con il contenuto della pagina.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
