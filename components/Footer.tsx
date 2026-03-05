export default function Footer() {
    return (
        <footer className="w-full py-8 mt-20 border-t border-white/10 opacity-60 text-center text-sm">
            <p>© {new Date().getFullYear()} UXABILITY.</p>
            <p className="mt-2">Made with ✨ by <a href="https://gian-ui.vercel.app" target="_blank" className="font-bold">Gianluca D'Arcangelo</a></p>
        </footer>
    );
}
