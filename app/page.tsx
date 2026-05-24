"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, CheckCircle2, Globe, FileText, Download, Layout, ExternalLink, Zap, Bot } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScoreCircle from "@/components/ScoreCircle";
import OpportunityCard from "@/components/OpportunityCard";
import AuditModal from "@/components/AuditModal";
import VisualInsights from "@/components/VisualInsights";
import FieldDataBadges from "@/components/FieldDataBadges";
import ResourceBreakdown from "@/components/ResourceBreakdown";
import MainThreadBreakdown from "@/components/MainThreadBreakdown";
import LabMetrics from "@/components/LabMetrics";
import AIRecommendation from "@/components/AIRecommendation";
import FrustrationIndex from "@/components/FrustrationIndex";
import SocialPreview from "@/components/SocialPreview";
import AEOScore from "@/components/AEOScore";
import CarbonScore from "@/components/CarbonScore";
import PrivacyScore from "@/components/PrivacyScore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [aeoResult, setAeoResult] = useState<any | null>(null);
  const [privacyResult, setPrivacyResult] = useState<any | null>(null);
  const { language, t } = useLanguage();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Simple URL validation
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (e) {
      setError(t('invalidUrl'));
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setAeoResult(null);
    setPrivacyResult(null);
    setActiveResultIndex(0);

    try {
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

      const [analyzeSettled, aeoSettled, privacySettled] = await Promise.allSettled([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl, lang: language }),
        }),
        fetch("/api/aeo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl }),
        }),
        fetch("/api/privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl }),
        }),
      ]);

      if (analyzeSettled.status === "rejected") {
        setError(t("connectionError"));
        return;
      }
      const data = await analyzeSettled.value.json();
      if (analyzeSettled.value.ok) {
        setResults(data.results);
      } else {
        setError(data.error || t("analysisError"));
        return;
      }

      if (aeoSettled.status === "fulfilled") {
        setAeoResult(await aeoSettled.value.json());
      } else {
        setAeoResult({ error: "fetch_failed", aeo: 0, structureScore: 0, contentScore: 0, authorityScore: 0, signals: {} });
      }

      if (privacySettled.status === "fulfilled") {
        setPrivacyResult(await privacySettled.value.json());
      } else {
        setPrivacyResult({ error: "fetch_failed", privacyScore: 50, grade: "C", trackers: [], thirdPartyDomains: 0, consentDetected: false, adCount: 0, analyticsCount: 0, functionalCount: 0 });
      }
    } catch (err) {
      setError(t('connectionError'));
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

      // --- Header ---
      doc.setFillColor(34, 211, 238); // Cyan-400
      doc.rect(0, 0, 210, 40, 'F');

      doc.setFontSize(24);
      doc.setTextColor(255);
      doc.text(t('reportTitle'), 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(255);
      doc.text(`${t('generatedOn')} ${timestamp}`, 170, 15, { align: 'right' });
      doc.text(`${t('analyzedUrl')} ${res.url}`, 14, 33);

      let currentY = 50;

      // --- 1. Global Scores ---
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(t('globalScores'), 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [[t('category'), t('score')]],
        body: [
          [t('performance'), `${res.scores.performance}/100`],
          [t('accessibility'), `${res.scores.accessibility}/100`],
          [t('bestPractices'), `${res.scores.bestPractices}/100`],
          [t('seo'), `${res.scores.seo}/100`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [34, 211, 238] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- 2. Core Web Vitals (Esperienza Reale) ---
      if (res.fieldData && res.fieldData.metrics) {
        doc.setFontSize(16);
        doc.text(t('realUserExperience'), 14, currentY);

        const cwvs = Object.entries(res.fieldData.metrics).map(([key, val]: [string, any]) => [
          key.replace(/_/g, ' '),
          key.includes("SCORE") ? (val.percentile / 100).toFixed(2) : `${(val.percentile / 1000).toFixed(2)}s`,
          val.category
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [[t('metric'), t('value'), t('status')]],
          body: cwvs,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] } // Emerald-500
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- 3. Resource Breakdown ---
      doc.setFontSize(16);
      doc.text(t('pageWeight'), 14, currentY);

      const resources = res.resourceSummary
        .filter((r: any) => r.resourceType !== 'total')
        .map((r: any) => [
          t(r.resourceType) || r.label,
          r.requestCount,
          r.transferSize > 1024 * 1024 ? `${(r.transferSize / (1024 * 1024)).toFixed(2)} MB` : `${(r.transferSize / 1024).toFixed(2)} KB`
        ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [[t('resourceType'), t('requests'), t('size')]],
        body: resources,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] } // Blue-500
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- New Page for Recommendations ---
      doc.addPage();
      currentY = 20;

      // --- 4. Suggestions and Criticalities ---
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(t('interventionPriority'), 14, currentY);

      const oppBody = res.opportunities.map((o: any) => [
        o.title,
        t(o.level.toLowerCase()) || o.level,
        o.impact
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [[t('detectedProblem'), t('severity'), t('estimatedImpact')]],
        body: oppBody,
        theme: 'grid',
        headStyles: { fillColor: [244, 63, 94] } // Rose-500
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- Summary Note ---
      doc.setFontSize(12);
      doc.text(t('technicalConclusion'), 14, currentY);
      doc.setFontSize(10);
      doc.setTextColor(80);
      const conclusion = t('conclusionText', res.scores.performance);
      const splitText = doc.splitTextToSize(conclusion, 180);
      doc.text(splitText, 14, currentY + 7);
    });

    const filename = `UXAbility_Report_${new URL(results[0].url).hostname}.pdf`;
    doc.save(filename);
  };

  const marqueeItems = [
    "PERFORMANCE", "ACCESSIBILITY", "SEO", "CORE WEB VITALS",
    "AI ANALYSIS", "UX AUDIT", "AEO SCORE", "BEST PRACTICES",
    "FRUSTRATION INDEX", "LIGHTHOUSE", "RESOURCE BREAKDOWN",
    "CARBON FOOTPRINT", "PRIVACY SCORE",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden bg-[#080c16] text-[#f1f5f9]">
      <Navbar />

      <main className="w-full max-w-5xl px-4 md:px-6 pt-32 md:pt-40 pb-20 flex-grow relative">
        {/* Hero Section */}
        <section className="text-center mb-0 relative">
          {/* Background decoration */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          >
            <span
              className="text-[22vw] md:text-[18vw] font-black tracking-tighter leading-none text-white"
              style={{ opacity: 0.018 }}
            >
              AUDIT
            </span>
          </div>

          {/* Section tag */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-violet-400/25" />
            <span className="section-label text-violet-400/60 flex items-center gap-1.5">
              <Bot size={11} />
              AEO · Lighthouse · AI Analysis
            </span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-violet-400/25" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-sky-300 to-sky-500 pb-2"
          >
            ANALYZE.<br />OPTIMIZE.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-slate-300/80 font-medium max-w-2xl mx-auto mb-10"
          >
            {t('heroSubtitle')}
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleAnalyze}
            className="relative max-w-2xl mx-auto"
          >
            <div className="relative group w-full flex items-center">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('inputPlaceholder')}
                className="w-full h-14 md:h-16 pl-12 md:pl-14 pr-[120px] md:pr-40 input-premium text-base md:text-lg placeholder:opacity-40"
              />
              <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:text-white transition-opacity pointer-events-none" size={20} />

              <div className="absolute right-1.5 top-1.5 bottom-1.5 flex">
                <button
                  type="submit"
                  disabled={loading || !url}
                  className="h-full px-4 md:px-6 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span className="hidden md:inline">{t('analyzeButton')}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Shimmer loading bar */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  key="loading-bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-0 left-6 right-6 h-[1px] rounded-full overflow-hidden bg-white/5"
                >
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent"
                  />
                </motion.div>
              )}
              {loading && (
                <motion.p
                  key="loading-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -bottom-8 left-0 right-0 text-center text-xs font-medium opacity-50 animate-pulse pointer-events-none"
                >
                  {t('crawlingText')}
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

          {/* Feature chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-8"
          >
            {[
              { label: "Performance", highlight: false },
              { label: "Core Web Vitals", highlight: false },
              { label: "SEO", highlight: false },
              { label: "AEO Score", highlight: true },
              { label: "AI Readability", highlight: true },
              { label: "Carbon Score", highlight: true },
              { label: "Privacy Score", highlight: true },
              { label: "PDF Report", highlight: false },
            ].map((chip) => (
              <span
                key={chip.label}
                className={
                  chip.highlight
                    ? "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border bg-violet-500/15 border-violet-500/40 text-violet-300"
                    : "px-3 py-1 rounded-full text-xs font-medium border border-white/8 text-slate-500"
                }
              >
                {chip.highlight && <Bot size={11} />}
                {chip.label}
              </span>
            ))}
          </motion.div>
        </section>

        {/* Marquee strip */}
        <div className="relative -mx-4 md:-mx-6 overflow-hidden border-y border-white/[0.04] py-3 my-16">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="section-label text-slate-700 mx-10">
                {item}
                <span className="ml-10 text-slate-800">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* Results Dashboard */}
        <AnimatePresence mode="wait">
          {results && currentResult && (
            <motion.section
              key={`dashboard-${currentResult.url}-${activeResultIndex}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 card">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#111] rounded-lg border border-[#333]">
                    <Globe size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold truncate max-w-[200px] md:max-w-xs text-white">
                      {new URL(currentResult.url).pathname === '/' ? t('homePage') : new URL(currentResult.url).pathname}
                    </h2>
                    <p className="text-[#888888] text-sm truncate max-w-[200px] md:max-w-xs">{currentResult.url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] transition-all text-sm font-medium"
                  >
                    <FileText size={18} className="text-white" />
                    {t('exportPdf')}
                  </button>
                  <div className="flex items-center gap-2 text-white bg-[#111] border border-[#333] px-4 py-2 rounded-lg text-sm font-medium">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>{t('analyzed')}</span>
                  </div>
                </div>
              </div>

              {/* Page Selector Tabs */}
              {results.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-12">
                  {results.map((res, i) => (
                    <button
                      key={`tab-${i}-${res.url}`}
                      onClick={() => setActiveResultIndex(i)}
                      className={`px-4 md:px-6 py-2 rounded-lg text-xs font-semibold transition-all border ${activeResultIndex === i
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-[#888888] border-[#333] hover:border-[#666] hover:text-white"
                        }`}
                    >
                      <span className="truncate max-w-[80px] md:max-w-[120px]">
                        {(() => {
                          try {
                            const path = new URL(res.url).pathname;
                            if (path === '/') return t('homePage');
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
                  label={t('performance')}
                  delay={0.2}
                  onClick={() => setSelectedCategory("performance")}
                />
                <ScoreCircle
                  score={currentResult.scores.accessibility}
                  label={t('accessibility')}
                  delay={0.3}
                  onClick={() => setSelectedCategory("accessibility")}
                />
                <ScoreCircle
                  score={currentResult.scores.bestPractices}
                  label={t('bestPractices')}
                  delay={0.4}
                  onClick={() => setSelectedCategory("bestPractices")}
                />
                <ScoreCircle
                  score={currentResult.scores.seo}
                  label={t('seo')}
                  delay={0.5}
                  onClick={() => setSelectedCategory("seo")}
                />
              </div>

              {/* 0. Strategic AI Advice */}
              <AIRecommendation
                score={currentResult.scores.performance}
                opportunities={currentResult.opportunities}
              />

              {/* AEO Score */}
              <AEOScore result={aeoResult} />

              {/* Carbon Footprint */}
              <CarbonScore resourceSummary={currentResult.resourceSummary} />

              {/* Privacy & Tracker Score */}
              <PrivacyScore result={privacyResult} />
              
              {/* 1. Core Visuals & Real World Experience */}
              <div className="space-y-16">
                {/* 
                <VisualInsights 
                  screenshot={currentResult.screenshot} 
                  thumbnails={currentResult.thumbnails} 
                /> 
                */}

                <FieldDataBadges fieldData={currentResult.fieldData} />

                {/* New Feature: User Frustration Index */}
                <FrustrationIndex
                  cls={currentResult.keyMetrics.cls_v || 0}
                  tbt={currentResult.keyMetrics.tbt_v || 0}
                />
              </div>

              {/* 2. Technical Lab Simulation */}
              <LabMetrics metrics={currentResult.keyMetrics} />

              {/* 3. Deep Analysis: Main Thread & Resources */}
              <div className="space-y-12 pt-12 border-t border-[#222]">
                <ResourceBreakdown resources={currentResult.resourceSummary} />
                <MainThreadBreakdown items={currentResult.mainThreadWork} />
              </div>

              {/* New Feature: Social Share Preview */}
              <SocialPreview
                metadata={currentResult.seoMetadata}
                url={currentResult.url}
              />

              {/* 4. Priorities & Opportunities */}
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white">
                    <Zap className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">{t('criticalities')}</h3>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {currentResult.opportunities.length > 0 ? (
                    currentResult.opportunities.map((opp: any, i: number) => (
                      <OpportunityCard key={`opp-${i}-${opp.title.substring(0, 10)}`} opportunity={opp} index={i} />
                    ))
                  ) : (
                    <div className="card p-12 text-center text-[#555] italic">
                      {t('noCriticalities')}
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
