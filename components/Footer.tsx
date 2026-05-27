import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-stone-200 mt-20 relative z-10">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span className="section-label text-stone-300">
            © <time dateTime={String(new Date().getFullYear())}>{new Date().getFullYear()}</time> UXABILITY
          </span>
          <span className="text-stone-300 text-xs">·</span>
          <span className="section-label text-stone-300">Web Intelligence</span>
          <span className="text-stone-300 text-xs">·</span>
          <Link href="/privacy" className="section-label text-stone-400 hover:text-stone-800 transition-colors">
            Privacy
          </Link>
        </div>
        <a
          href="https://gianlucadarcangelo.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="section-label text-stone-400 hover:text-stone-800 transition-colors"
        >
          Built by Gianluca D&apos;Arcangelo ↗
        </a>
      </div>
    </footer>
  );
}
