import { Github, User } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass m-4 mt-6 rounded-2xl">
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">UXABILITY</span>
            </div>
            <div className="flex items-center gap-6">
                <Link
                    href="https://gian-ui.vercel.app"
                    target="_blank"
                    className="flex items-center gap-2 text-sm font-medium opacity-80 hover:opacity-100 transition-opacity"
                >
                    <User size={20} />
                    <span>Portfolio</span>
                </Link>
            </div>
        </nav>
    );
}
