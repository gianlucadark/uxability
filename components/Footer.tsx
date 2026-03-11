export default function Footer() {
    return (
        <footer className="w-full py-12 mt-20 border-t border-[#334155] text-center text-xs text-slate-500">
            <p>© {new Date().getFullYear()} UXABILITY.</p>
            <p className="mt-2 font-medium text-slate-400">Made with ✨ by <a href="https://gian-ui.vercel.app" target="_blank" className="font-bold text-white hover:text-sky-400 transition-colors">Gianluca D'Arcangelo</a></p>
        </footer>
    );
}
