"use client";

import { Languages, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
    const { language, setLanguage, t } = useLanguage();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center justify-between px-6 md:px-8 h-14 bg-[#080c16]/60 backdrop-blur-2xl border-b border-white/[0.05]">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="relative w-[17px] h-[17px] shrink-0">
                        <div
                            className="absolute inset-0 border border-sky-400/55 rotate-45"
                            style={{ borderRadius: '2px' }}
                        />
                        <div
                            className="absolute inset-[4px] bg-sky-400/25 rotate-45"
                            style={{ borderRadius: '1px' }}
                        />
                    </div>
                    <span className="text-[13px] font-black tracking-[0.18em] text-white uppercase">
                        Uxability
                    </span>
                    
                </div>

                {/* Right */}
                <div className="flex items-center gap-4 md:gap-5">
                   

                    <div className="hidden md:block w-px h-3 bg-white/8" />

                    <button
                        onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}
                        className="flex items-center gap-1.5 section-label text-slate-500 hover:text-white transition-colors"
                    >
                        <Languages size={12} />
                        <span>{language === 'it' ? 'IT' : 'EN'}</span>
                    </button>

                    <Link
                        href="https://gianlucadarcangelo.vercel.app"
                        target="_blank"
                        className="hidden sm:flex items-center gap-1.5 section-label text-slate-500 hover:text-sky-400 transition-colors"
                    >
                        <span>{t('portfolio')}</span>
                        <ExternalLink size={9} />
                    </Link>
                </div>
            </div>
        </nav>
    );
}
