"use client";

import { Share2, Globe } from "lucide-react";
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
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg icon-tile">
                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-stone-900">{t('socialPreviewTitle')}</h3>
                    <p className="text-stone-600 text-xs md:text-sm font-medium">{t('socialPreviewSubtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 card p-6 md:p-8">
                {/* Facebook/LinkedIn Style Card */}
                <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Facebook / LinkedIn</div>
                    <div className="premium-surface rounded-xl overflow-hidden">
                        {metadata.ogImage ? (
                            <img src={metadata.ogImage} alt="Preview" className="w-full aspect-[1.91/1] object-cover" />
                        ) : (
                            <div className="w-full aspect-[1.91/1] bg-stone-100 flex items-center justify-center p-8 border-b border-stone-200">
                                <div className="text-center space-y-2 opacity-50">
                                    <Globe size={48} className="mx-auto" />
                                    <div className="text-xs font-semibold">{hostname}</div>
                                </div>
                            </div>
                        )}
                        <div className="p-4 bg-white/55 border-t border-stone-200/80">
                            <div className="text-[10px] uppercase text-stone-500 mb-1 font-semibold">{hostname.toUpperCase()}</div>
                            <h4 className="text-stone-950 font-bold text-base leading-snug mb-1 line-clamp-2">{metadata.title}</h4>
                            <p className="text-stone-600 text-xs line-clamp-2">{metadata.description}</p>
                        </div>
                    </div>
                </div>

                {/* WhatsApp/Telegram Style */}
                <div className="space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">WhatsApp / Telegram</div>
                    <div className="flex flex-col gap-2">
                        <div className="self-start max-w-[90%] premium-surface rounded-2xl p-2 rounded-tl-none">
                            <div className="bg-white/70 rounded-xl overflow-hidden border border-stone-200">
                                <div className="flex p-3 gap-3">
                                    <div className="flex-grow space-y-1">
                                        <div className="text-stone-900 text-[13px] font-semibold truncate">{metadata.title}</div>
                                        <p className="text-stone-600 text-[12px] line-clamp-2 leading-tight">
                                            {metadata.description}
                                        </p>
                                        <div className="text-stone-500 text-[11px] font-medium">{hostname}</div>
                                    </div>
                                    {metadata.ogImage ? (
                                        <img src={metadata.ogImage} alt="Thumb" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
                                            <Globe size={24} className="opacity-70 text-stone-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-2 py-1 flex justify-between items-end gap-4 mt-1">
                                <span className="text-stone-700 text-xs underline truncate">{url}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-stone-200 bg-white/45 mt-4 flex items-center gap-3">
                        <div className="text-xs font-semibold text-stone-600">{t('socialPreviewHint')}</div>
                        <div className="flex gap-2 ml-auto">
                            {metadata.ogImage ? (
                                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">OG Image OK</span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest">No OG Image</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
