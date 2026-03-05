"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, CheckCircle2, Globe, FileText, Download, Layout, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScoreCircle from "@/components/ScoreCircle";
import OpportunityCard from "@/components/OpportunityCard";
import AuditModal from "@/components/AuditModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Simple URL validation
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (e) {
      setError("Inserisci un URL valido (es. google.com)");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setActiveResultIndex(0);

    try {
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formattedUrl }),
      });

      const data = await response.json();
      if (response.ok) {
        setResults(data.results);
      } else {
        setError(data.error || "Errore durante l'analisi. Riprova.");
      }
    } catch (err) {
      setError("Impossibile connettersi al server.");
    } finally {
      setLoading(false);
    }
  };

  const currentResult = results ? results[activeResultIndex] : null;

  const exportToPDF = () => {
    if (!results) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    results.forEach((res, index) => {
      if (index > 0) doc.addPage();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(34, 211, 238); // Cyan-400
      doc.text("UXABILITY REPORT", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data: ${timestamp}`, 14, 30);
      doc.text(`URL: ${res.url}`, 14, 36);

      // Scores Table
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text("Punteggi Globali", 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [['Categoria', 'Punteggio']],
        body: [
          ['Performance', `${res.scores.performance}/100`],
          ['Accessibilità', `${res.scores.accessibility}/100`],
          ['Best Practices', `${res.scores.bestPractices}/100`],
          ['SEO', `${res.scores.seo}/100`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [34, 211, 238] }
      });

      // Opportunities
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text("Migliorie Suggerite", 14, finalY);

      const oppBody = res.opportunities.map((o: any) => [
        o.title,
        o.level,
        o.impact
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Problema', 'Gravità', 'Impatto Stimato']],
        body: oppBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] } // Blue-500
      });

      // Simple description logic
      doc.setFontSize(12);
      const summaryY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Analisi Tecnica:", 14, summaryY);
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(
        `Questa pagina ha un punteggio di performance di ${res.scores.performance}. ` +
        `Per migliorare il posizionamento e l'esperienza utente, si consiglia di intervenire sulle opportunità sopra elencate, ` +
        `particolarmente quelle con gravità 'High'.`, 180
      );
      doc.text(splitText, 14, summaryY + 7);
    });

    const filename = `Report_UXAbility_${new URL(results[0].url).hostname}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      <Navbar />

      <main className="w-full max-w-5xl px-6 pt-32 pb-20 flex-grow relative">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400"
          >
            UXABILITY
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl opacity-70 max-w-2xl mx-auto mb-10"
          >
            Analizza il tuo sito web con un crawl intelligente. Ricevi report PDF completi su velocità,
            SEO e come migliorare.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleAnalyze}
            className="relative max-w-2xl mx-auto"
          >
            <div className="relative group">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Inserisci l'URL del sito (es. vercel.com)"
                className="w-full h-16 pl-14 pr-32 rounded-2xl glass outline-none border border-white/10 focus:border-cyan-400/50 transition-all text-lg placeholder:opacity-40"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 transition-opacity" size={24} />
              <button
                type="submit"
                disabled={loading || !url}
                className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:hover:shadow-none transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Analizza Sito"}
                {!loading && <ArrowRight size={20} />}
              </button>
            </div>

            {/* Shimmer loading bar */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-0 left-6 right-6 h-[2px] rounded-full overflow-hidden bg-white/5"
                >
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                  />
                </motion.div>
              )}
              {loading && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -bottom-8 left-0 right-0 text-center text-xs font-medium opacity-50 animate-pulse pointer-events-none"
                >
                  Crawl intelligente in corso: Analizzando 5 pagine...
                </motion.p>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-rose-400 font-medium"
              >
                {error}
              </motion.p>
            )}
          </motion.form>
        </section>

        {/* Results Dashboard */}
        <AnimatePresence mode="wait">
          {results && currentResult && (
            <motion.section
              key={activeResultIndex}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 glass rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold truncate max-w-[200px] md:max-w-xs">
                      {new URL(currentResult.url).pathname === '/' ? 'Home Page' : new URL(currentResult.url).pathname}
                    </h2>
                    <p className="opacity-50 text-xs truncate max-w-[200px] md:max-w-xs">{currentResult.url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-semibold"
                  >
                    <FileText size={18} className="text-cyan-400" />
                    Esporta PDF
                  </button>
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full text-sm font-bold">
                    <CheckCircle2 size={18} />
                    <span>Analizzato</span>
                  </div>
                </div>
              </div>

              {/* Page Selector Tabs */}
              {results.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-12 p-3 glass rounded-3xl border border-white/5 bg-white/[0.02]">
                  {results.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveResultIndex(i)}
                      className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl text-[10px] md:text-xs font-bold transition-all flex items-center gap-2 ${activeResultIndex === i
                        ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_8px_25px_rgba(34,211,238,0.25)] scale-[1.02]"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 hover:translate-y-[-1px]"
                        }`}
                    >
                      <div className={`p-1 rounded-lg ${activeResultIndex === i ? "bg-white/20" : "bg-white/5"}`}>
                        <Layout size={12} className={activeResultIndex === i ? "opacity-100" : "opacity-40"} />
                      </div>
                      <span className="truncate max-w-[80px] md:max-w-[120px]">
                        {(() => {
                          try {
                            const path = new URL(res.url).pathname;
                            if (path === '/') return "Home Page";
                            const parts = path.split('/').filter(Boolean);
                            return parts.length > 0 ? `/${parts[parts.length - 1]}` : path;
                          } catch (e) {
                            return `Pagina ${i + 1}`;
                          }
                        })()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Grid of Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <ScoreCircle
                  score={currentResult.scores.performance}
                  label="Performance"
                  delay={0.2}
                  onClick={() => setSelectedCategory("performance")}
                />
                <ScoreCircle
                  score={currentResult.scores.accessibility}
                  label="Accessibility"
                  delay={0.3}
                  onClick={() => setSelectedCategory("accessibility")}
                />
                <ScoreCircle
                  score={currentResult.scores.bestPractices}
                  label="Best Practices"
                  delay={0.4}
                  onClick={() => setSelectedCategory("bestPractices")}
                />
                <ScoreCircle
                  score={currentResult.scores.seo}
                  label="SEO"
                  delay={0.5}
                  onClick={() => setSelectedCategory("seo")}
                />
              </div>

              {/* Opportunities Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold">Criticità e Migliorie</h3>
                  <div className="h-px flex-grow bg-white/10"></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {currentResult.opportunities.length > 0 ? (
                    currentResult.opportunities.map((opp: any, i: number) => (
                      <OpportunityCard key={i} opportunity={opp} index={i} />
                    ))
                  ) : (
                    <div className="p-8 glass rounded-2xl border border-white/10 text-center opacity-50">
                      Nessuna criticità rilevante trovata per questa pagina. Ottimo lavoro!
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Audit Modal */}
      {currentResult && selectedCategory && (
        <AuditModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          title={selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/([A-Z])/g, ' $1')}
          audits={currentResult.details[selectedCategory]}
        />
      )}
    </div>
  );
}
