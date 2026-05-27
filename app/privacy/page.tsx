import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
    title: "Privacy",
    description: "Come UXAbility tratta i dati: nessun account, nessuno storage degli URL analizzati.",
    alternates: { canonical: "/privacy" },
};

const content = {
    it: {
        title: "Privacy",
        intro: "UXAbility è uno strumento di audit pubblico, senza account né tracker di marketing. Questa pagina riassume i dati che tratta e come.",
        sections: [
            {
                h: "Cosa NON salviamo",
                body: [
                    "Non salviamo gli URL che inserisci né i risultati delle analisi in alcun database.",
                    "Non chiediamo email, login o dati personali.",
                    "Non usiamo cookie pubblicitari, pixel di tracciamento o profilazione.",
                ],
            },
            {
                h: "Cosa salviamo (lato browser)",
                body: [
                    "Solo nel tuo browser, in localStorage: la cache delle ultime analisi (TTL 6 ore) e la tua preferenza lingua. Puoi cancellarle in qualsiasi momento svuotando i dati del sito.",
                    "Un cookie tecnico `lang` (validità 1 anno) ricorda la lingua scelta al server-side rendering.",
                ],
            },
            {
                h: "Cosa logga il server",
                body: [
                    "Le richieste API generano log applicativi temporanei (IP, percorso, codice risposta) gestiti dall'hosting (Vercel). Vengono usati solo per rate-limit anti-abuso e diagnosi errori, e ruotati automaticamente.",
                    "L'URL che analizzi viene inviato a servizi terzi necessari: Google PageSpeed Insights (Lighthouse), Google Gemini API (valutazione AEO). Si applicano le rispettive privacy policy di Google.",
                ],
            },
            {
                h: "Diritti",
                body: [
                    "Non avendo un account utente non c'è profilo da cancellare. Per qualsiasi richiesta puoi scrivere all'autore del progetto.",
                ],
            },
        ],
        contact: "Autore",
        backHome: "Torna alla home",
    },
    en: {
        title: "Privacy",
        intro: "UXAbility is a public audit tool — no account, no marketing trackers. This page summarises what data we handle and how.",
        sections: [
            {
                h: "What we do NOT store",
                body: [
                    "We do not store the URLs you submit or the analysis results in any database.",
                    "We never ask for email, login or personal data.",
                    "We don't use advertising cookies, tracking pixels or profiling.",
                ],
            },
            {
                h: "What we store (in your browser)",
                body: [
                    "Only in your browser, in localStorage: a cache of recent analyses (6h TTL) and your language preference. Clear your site data at any time to remove them.",
                    "A technical `lang` cookie (1-year validity) remembers your language for server-side rendering.",
                ],
            },
            {
                h: "What the server logs",
                body: [
                    "API requests generate ephemeral application logs (IP, path, status) handled by the hosting provider (Vercel). They are used only for anti-abuse rate limiting and error diagnosis, and rotated automatically.",
                    "The URL you analyze is forwarded to required third-party services: Google PageSpeed Insights (Lighthouse), Google Gemini API (AEO evaluation). Google's own privacy policy applies.",
                ],
            },
            {
                h: "Your rights",
                body: [
                    "There is no user account to delete. For any inquiry, contact the project author.",
                ],
            },
        ],
        contact: "Author",
        backHome: "Back to home",
    },
};

export default async function PrivacyPage() {
    const cookieStore = await cookies();
    const lang = cookieStore.get("lang")?.value === "en" ? "en" : "it";
    const c = content[lang];
    const updated = new Date(process.env.NEXT_PUBLIC_BUILD_DATE || Date.now());

    return (
        <div className="min-h-screen flex flex-col items-center text-[var(--foreground)] relative">
            <Navbar />
            <main id="main-content" className="w-full max-w-3xl px-4 md:px-6 pt-32 md:pt-40 pb-20 flex-grow relative z-10">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-6 text-[var(--graphite-950)]">
                    {c.title}
                </h1>
                <p className="text-stone-600 mb-4">{c.intro}</p>
                <p className="section-label text-stone-400 mb-10">
                    {lang === "it" ? "Aggiornato il " : "Updated "}
                    <time dateTime={updated.toISOString().slice(0, 10)}>
                        {updated.toLocaleDateString(lang === "it" ? "it-IT" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </time>
                </p>

                {c.sections.map((s) => (
                    <section key={s.h} className="mb-10">
                        <h2 className="text-xl font-bold text-stone-900 mb-3">{s.h}</h2>
                        <ul className="space-y-2 text-sm text-stone-700 leading-relaxed">
                            {s.body.map((line) => (
                                <li key={line} className="pl-4 border-l-2 border-stone-200">{line}</li>
                            ))}
                        </ul>
                    </section>
                ))}

                <div className="flex items-center justify-between border-t border-stone-200 pt-6 mt-12 text-sm">
                    <Link href="/" className="text-stone-600 hover:text-stone-900 transition-colors font-medium">
                        ← {c.backHome}
                    </Link>
                    <a
                        href="https://gianlucadarcangelo.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-500 hover:text-stone-900 transition-colors"
                    >
                        {c.contact} ↗
                    </a>
                </div>
            </main>
            <Footer />
        </div>
    );
}
