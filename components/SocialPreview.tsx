"use client";

import { motion } from "framer-motion";
import { Share2, Globe, MessageCircle, MoreHorizontal, ThumbsUp } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SocialPreviewProps {
    metadata: {
        title: string;
        description: string;
        ogImage?: string | null;
        favicon?: string | null;
    };
    url: string;
}

export default function SocialPreview({ metadata, url }: SocialPreviewProps) {
    const { t } = useLanguage();
    const hostname = new URL(url).hostname;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                    <h3 className="text-2xl md:text-3xl font-black font-display text-white">{t('socialPreviewTitle')}</h3>
                    <p className="text-zinc-500 text-xs md:text-sm font-medium">{t('socialPreviewSubtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Facebook/LinkedIn Style Card */}
                <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Facebook / LinkedIn</div>
                    <div className="bg-[#1c1e21] rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                        {metadata.ogImage ? (
                            <img src={metadata.ogImage} alt="Preview" className="w-full aspect-[1.91/1] object-cover" />
                        ) : (
                            <div className="w-full aspect-[1.91/1] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center p-8">
                                <div className="text-center space-y-2 opacity-20">
                                    <Globe size={48} className="mx-auto" />
                                    <div className="text-[10px] font-black uppercase">{hostname}</div>
                                </div>
                            </div>
                        )}
                        <div className="p-4 bg-[#242526] border-t border-white/5">
                            <div className="text-[11px] uppercase text-zinc-400 mb-1 tracking-tight font-medium">{hostname.toUpperCase()}</div>
                            <h4 className="text-white font-bold text-base leading-snug mb-1 line-clamp-2">{metadata.title}</h4>
                            <p className="text-zinc-400 text-xs line-clamp-2">{metadata.description}</p>
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 bg-[#242526]">
                            <div className="flex gap-4">
                                <ThumbsUp size={16} className="text-zinc-500" />
                                <MessageCircle size={16} className="text-zinc-500" />
                                <Share2 size={16} className="text-zinc-500" />
                            </div>
                            <MoreHorizontal size={16} className="text-zinc-500" />
                        </div>
                    </div>
                </div>

                {/* WhatsApp/Telegram Style */}
                <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">WhatsApp / Telegram</div>
                    <div className="flex flex-col gap-2">
                        <div className="self-start max-w-[90%] bg-[#0b141a] border border-white/5 rounded-2xl p-2 rounded-tl-none shadow-xl">
                            <div className="bg-[#111b21] rounded-xl overflow-hidden border border-white/5">
                                <div className="flex p-3 gap-3">
                                    <div className="flex-grow space-y-1">
                                        <div className="text-[#53bdeb] text-[13px] font-semibold truncate">{metadata.title}</div>
                                        <p className="text-zinc-400 text-[12px] line-clamp-2 leading-tight">
                                            {metadata.description}
                                        </p>
                                        <div className="text-zinc-500 text-[11px] font-medium">{hostname}</div>
                                    </div>
                                    {metadata.ogImage ? (
                                        <img src={metadata.ogImage} alt="Thumb" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                            <Globe size={24} className="opacity-10" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-2 py-1 flex justify-between items-end gap-4">
                                <span className="text-blue-400 text-sm underline truncate">{url}</span>
                                <span className="text-[10px] text-zinc-500 whitespace-nowrap">16:00</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 mt-4">
                        <div className="text-xs font-bold text-zinc-400 mb-2">{t('socialPreviewHint')}</div>
                        <div className="flex flex-wrap gap-2">
                            {metadata.ogImage ? (
                                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">OG Image Ready</span>
                            ) : (
                                <span className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-widest border border-rose-500/20">Missing OG Image</span>
                            )}
                            <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">Meta Title {metadata.title.length < 60 ? 'OK' : 'Too Long'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
