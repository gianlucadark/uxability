import { Github, User, Languages } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
    const { language, setLanguage, t } = useLanguage();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0f172a]/80 backdrop-blur-md border-b border-[#334155]">
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">UXABILITY</span>
            </div>
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 transition-colors text-slate-500 hover:text-white"
                >
                    <Languages size={14} />
                    <span className="uppercase">{language}</span>
                </button>
                <Link
                    href="https://gian-ui.vercel.app"
                    target="_blank"
                    className="flex items-center gap-2 text-sm font-medium text-[#888888] hover:text-white transition-colors"
                >
                    <User size={18} />
                    <span className="hidden sm:inline">{t('portfolio')}</span>
                </Link>
            </div>
        </nav>
    );
}
