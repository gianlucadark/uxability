import { Github, User, Languages } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
    const { language, setLanguage, t } = useLanguage();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 glass m-2 md:m-4 md:mt-6 rounded-xl md:rounded-2xl">
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">UXABILITY</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                <button
                    onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}
                    className="flex items-center gap-2 text-sm font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all"
                >
                    <Languages size={18} className="text-cyan-400" />
                    <span className="uppercase">{language}</span>
                </button>
                <Link
                    href="https://gian-ui.vercel.app"
                    target="_blank"
                    className="flex items-center gap-2 text-sm font-medium opacity-80 hover:opacity-100 transition-opacity"
                >
                    <User size={20} />
                    <span className="hidden sm:inline">{t('portfolio')}</span>
                </Link>
            </div>
        </nav>
    );
}
