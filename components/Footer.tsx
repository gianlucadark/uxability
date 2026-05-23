export default function Footer() {
    return (
        <footer className="w-full border-t border-white/[0.045] mt-20">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="section-label text-slate-700">© {new Date().getFullYear()} UXABILITY</span>
                    <span className="text-slate-800 text-xs">·</span>
                    <span className="section-label text-slate-700">Web Intelligence</span>
                </div>
                <a
                    href="https://gian-ui.vercel.app"
                    target="_blank"
                    className="section-label text-slate-600 hover:text-sky-400 transition-colors"
                >
                    Built by Gianluca D'Arcangelo ↗
                </a>
            </div>
        </footer>
    );
}
