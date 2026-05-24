"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, CheckCircle2, Globe, FileText, Zap, Bot } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreativeBackdrop from "@/components/CreativeBackdrop";
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

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const timestamp = new Date().toLocaleString();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const graphite = [32, 28, 24] as [number, number, number];
    const graphiteSoft = [74, 67, 60] as [number, number, number];
    const muted = [117, 109, 100] as [number, number, number];
    const champagne = [212, 185, 140] as [number, number, number];
    const paper = [255, 253, 248] as [number, number, number];
    const paperAlt = [246, 242, 236] as [number, number, number];
    const border = [221, 215, 206] as [number, number, number];
    const success = [15, 143, 104] as [number, number, number];
    const warning = [183, 121, 31] as [number, number, number];
    const danger = [189, 49, 80] as [number, number, number];

    const sanitizePdfText = (value: string = "") => value
      .replace(/<[^>]*>/g, " ")
      .replace(/â€”|–|—/g, "-")
      .replace(/Ã—|×/g, "x")
      .replace(/COâ‚‚|CO₂/g, "CO2")
      .replace(/â‰¥|≥/g, ">=")
      .replace(/â‰¤|≤/g, "<=")
      .replace(/â†’|→/g, "->")
      .replace(/Â·|·/g, "/")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    const compactText = (value: string, maxLength = 220) => {
      const text = sanitizePdfText(value);
      return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
    };
    const carbonPdfNote = language === "it"
      ? "Stima basata sul peso trasferito della pagina. Ridurre immagini, script e richieste inutili abbassa direttamente l'impatto per visita."
      : "Estimated from transferred page weight. Reducing images, scripts and unnecessary requests directly lowers impact per visit.";
    const privacyPdfNote = language === "it"
      ? "Meno tracker e un consenso chiaro migliorano fiducia, conformita e performance percepita."
      : "Fewer trackers and clear consent improve trust, compliance and perceived performance.";
    const aeoPdfNote = language === "it"
      ? "L'AEO misura quanto la pagina e facile da comprendere, estrarre e citare per motori di risposta AI come ChatGPT, Perplexity e Google AI."
      : "AEO measures how easy the page is for AI answer engines such as ChatGPT, Perplexity and Google AI to understand, extract and cite.";
    const formatBytes = (bytes: number) => (
      bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(bytes / 1024).toFixed(2)} KB`
    );
    const getCarbonData = (resourceSummary: any[] = []) => {
      const total = resourceSummary.find((r: any) => r.resourceType === "total");
      const bytes = total?.transferSize || 0;
      const grams = (bytes / 1_073_741_824) * 0.8 * 442;
      const annualGrams = grams * 10_000 * 12;
      const treeDays = annualGrams / (21_000 / 365);
      const grade = grams < 0.5 ? "A+" : grams < 1 ? "A" : grams < 2 ? "B" : grams < 4 ? "C" : grams < 6 ? "D" : "F";
      return { bytes, grams, annualGrams, treeDays, grade };
    };
    const scoreColor = (score: number): [number, number, number] => {
      if (score >= 90) return success;
      if (score >= 50) return warning;
      return danger;
    };
    const aeoColor = (score: number): [number, number, number] => {
      if (score >= 70) return success;
      if (score >= 40) return warning;
      return danger;
    };
    const severityColor = (level: string): [number, number, number] => {
      if (level === "High") return danger;
      if (level === "Medium") return warning;
      return graphiteSoft;
    };
    const gradeColor = (grade: string): [number, number, number] => {
      if (grade === "A+" || grade === "A" || grade === "B") return success;
      if (grade === "C" || grade === "D") return warning;
      return danger;
    };
    const addPageBackground = () => {
      doc.setFillColor(...paperAlt);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setFillColor(...paper);
      doc.roundedRect(margin - 4, 10, pageWidth - ((margin - 4) * 2), pageHeight - 20, 3, 3, "F");
    };
    const addFooter = () => {
      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(...border);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text("UXABILITY", margin, pageHeight - 8);
        doc.setFont("helvetica", "normal");
        doc.text(`${page}/${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }
    };
    const addKicker = (label: string, x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(sanitizePdfText(label).toUpperCase(), x, y);
    };
    const addSectionTitle = (title: string, y: number) => {
      doc.setFillColor(...champagne);
      doc.roundedRect(margin, y - 4, 3, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...graphite);
      doc.text(sanitizePdfText(title), margin + 7, y + 2);
    };
    const addScoreCard = (label: string, score: number, x: number, y: number, width: number) => {
      const color = scoreColor(score);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, width, 28, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(sanitizePdfText(label).toUpperCase(), x + 5, y + 8);
      doc.setFontSize(20);
      doc.setTextColor(...color);
      doc.text(`${score}`, x + 5, y + 21);
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text("/100", x + 20, y + 21);
      doc.setFillColor(...color);
      doc.roundedRect(x + 5, y + 24, (width - 10) * (score / 100), 1.8, 0.8, 0.8, "F");
      doc.setFillColor(230, 224, 216);
      doc.roundedRect(x + 5 + ((width - 10) * (score / 100)), y + 24, (width - 10) * (1 - score / 100), 1.8, 0.8, 0.8, "F");
    };
    const addMiniMetricCard = (
      title: string,
      value: string,
      caption: string,
      x: number,
      y: number,
      width: number,
      color: [number, number, number],
    ) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, width, 28, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(sanitizePdfText(title).toUpperCase(), x + 5, y + 8, { maxWidth: width - 10 });
      doc.setFontSize(16);
      doc.setTextColor(...color);
      doc.text(value, x + 5, y + 19);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(sanitizePdfText(caption), x + 5, y + 25, { maxWidth: width - 10 });
    };
    const addInsightCard = (title: string, body: string, y: number, accent: [number, number, number] = champagne) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...border);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 3, 3, "FD");
      doc.setFillColor(...accent);
      doc.roundedRect(margin, y, 3, 34, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...graphite);
      doc.text(sanitizePdfText(title), margin + 8, y + 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...graphiteSoft);
      const lines = doc.splitTextToSize(compactText(body, 260), pageWidth - margin * 2 - 20).slice(0, 3);
      doc.text(lines, margin + 8, y + 17, { lineHeightFactor: 1.35 });
    };
    const addDefinitionCard = (
      title: string,
      body: string,
      x: number,
      y: number,
      width: number,
      height: number,
      accent: [number, number, number] = champagne,
    ) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, width, height, 3, 3, "FD");
      doc.setFillColor(...accent);
      doc.roundedRect(x, y, 3, height, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...graphite);
      doc.text(sanitizePdfText(title), x + 7, y + 8, { maxWidth: width - 12 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(...graphiteSoft);
      doc.text(
        doc.splitTextToSize(compactText(body, 210), width - 14).slice(0, 5),
        x + 7,
        y + 16,
        { lineHeightFactor: 1.28 },
      );
    };

    addPageBackground();
    doc.setFillColor(...graphite);
    doc.roundedRect(margin, 16, pageWidth - margin * 2, 42, 4, 4, "F");
    doc.setFillColor(...champagne);
    doc.rect(margin, 16, 4, 42, "F");
    addKicker(t("reportTitle"), margin + 10, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 250, 241);
    doc.text(language === "it" ? "Guida alla lettura" : "Reading guide", margin + 10, 41);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(234, 216, 181);
    doc.text(sanitizePdfText(`${t("generatedOn")} ${timestamp}`), pageWidth - margin - 4, 32, { align: "right" });

    let introY = 74;
    addSectionTitle(language === "it" ? "Cosa misura questo report" : "What this report measures", introY);
    introY += 14;
    addInsightCard(t("aeoTitle"), aeoPdfNote, introY, champagne);
    introY += 44;

    const introCardWidth = (pageWidth - margin * 2 - 6) / 2;
    addDefinitionCard(
      "Lighthouse",
      language === "it"
        ? "Performance, accessibilita, best practice e SEO descrivono la qualita tecnica percepita da browser e motori di ricerca."
        : "Performance, accessibility, best practices and SEO describe technical quality as seen by browsers and search engines.",
      margin,
      introY,
      introCardWidth,
      40,
      graphiteSoft,
    );
    addDefinitionCard(
      t("realUserExperience"),
      language === "it"
        ? "I Core Web Vitals indicano velocita, stabilita e reattivita vissute dagli utenti reali quando disponibili."
        : "Core Web Vitals show speed, stability and responsiveness experienced by real users when data is available.",
      margin + introCardWidth + 6,
      introY,
      introCardWidth,
      40,
      success,
    );
    introY += 50;
    addDefinitionCard(
      t("privacyTitle"),
      privacyPdfNote,
      margin,
      introY,
      introCardWidth,
      40,
      privacyResult ? gradeColor(privacyResult.grade ?? "C") : muted,
    );
    addDefinitionCard(
      t("carbonTitle"),
      carbonPdfNote,
      margin + introCardWidth + 6,
      introY,
      introCardWidth,
      40,
      success,
    );
    introY += 54;
    addInsightCard(
      language === "it" ? "Come leggere le pagine successive" : "How to read the following pages",
      language === "it"
        ? "Per ogni URL trovi solo i punteggi e le priorita: prima la sintesi, poi i segnali AEO, le metriche tecniche e gli interventi consigliati."
        : "For each URL you will find only scores and priorities: summary first, then AEO signals, technical metrics and recommended actions.",
      introY,
      champagne,
    );

    results.forEach((res, index) => {
      doc.addPage();
      addPageBackground();

      const pageLabel = (() => {
        try {
          const parsed = new URL(res.url);
          return parsed.pathname === "/" ? t("homePage") : parsed.pathname;
        } catch {
          return res.url;
        }
      })();
      const topFix = res.opportunities?.find((o: any) => o.level === "High") || res.opportunities?.[0];
      const totalResource = res.resourceSummary?.find((r: any) => r.resourceType === "total");

      doc.setFillColor(...graphite);
      doc.roundedRect(margin, 16, pageWidth - margin * 2, 44, 4, 4, "F");
      doc.setFillColor(...champagne);
      doc.rect(margin, 16, 4, 44, "F");
      addKicker(t("reportTitle"), margin + 10, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 250, 241);
      doc.text(sanitizePdfText(pageLabel), margin + 10, 40, { maxWidth: 118 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(234, 216, 181);
      doc.text(sanitizePdfText(`${t("analyzedUrl")} ${res.url}`), margin + 10, 51, { maxWidth: 130 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 250, 241);
      doc.text(sanitizePdfText(t("generatedOn")), pageWidth - margin - 4, 29, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(timestamp, pageWidth - margin - 4, 36, { align: "right" });

      let currentY = 72;
      addSectionTitle(t("globalScores"), currentY);
      currentY += 10;

      const cardWidth = (pageWidth - margin * 2 - 9) / 4;
      addScoreCard(t("performance"), res.scores.performance, margin, currentY, cardWidth);
      addScoreCard(t("accessibility"), res.scores.accessibility, margin + cardWidth + 3, currentY, cardWidth);
      addScoreCard(t("bestPractices"), res.scores.bestPractices, margin + (cardWidth + 3) * 2, currentY, cardWidth);
      addScoreCard(t("seo"), res.scores.seo, margin + (cardWidth + 3) * 3, currentY, cardWidth);
      currentY += 42;

      if (aeoResult) {
        const aeoScore = aeoResult.aeo ?? 0;
        const accent = aeoColor(aeoScore);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...border);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, 48, 3, 3, "FD");
        doc.setFillColor(...accent);
        doc.roundedRect(margin, currentY, 4, 48, 1.5, 1.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text("ANSWER ENGINE OPTIMIZATION", margin + 9, currentY + 9);
        doc.setFontSize(28);
        doc.setTextColor(...accent);
        doc.text(`${aeoScore}`, margin + 9, currentY + 25);
        doc.setFontSize(9);
        doc.setTextColor(...muted);
        doc.text("/100", margin + 28, currentY + 25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...graphite);
        doc.text(sanitizePdfText(t("aeoTitle")), margin + 9, currentY + 34);

        addMiniMetricCard(
          t("aeo_pillar_structure"),
          `${aeoResult.structureScore ?? 0}`,
          "35%",
          margin + 48,
          currentY + 10,
          35,
          aeoColor(aeoResult.structureScore ?? 0),
        );
        addMiniMetricCard(
          t("aeo_pillar_content"),
          `${aeoResult.contentScore ?? 0}`,
          "40%",
          margin + 86,
          currentY + 10,
          35,
          aeoColor(aeoResult.contentScore ?? 0),
        );
        addMiniMetricCard(
          t("aeo_pillar_authority"),
          `${aeoResult.authorityScore ?? 0}`,
          "25%",
          margin + 124,
          currentY + 10,
          35,
          aeoColor(aeoResult.authorityScore ?? 0),
        );

        currentY += 60;
      }

      const carbon = getCarbonData(res.resourceSummary);
      const summaryCardWidth = (pageWidth - margin * 2 - 6) / 3;
      addMiniMetricCard(
        t("carbonTitle"),
        `${carbon.grams.toFixed(2)}g`,
        `${carbon.grade} / ${formatBytes(carbon.bytes)}`,
        margin,
        currentY,
        summaryCardWidth,
        gradeColor(carbon.grade),
      );
      if (privacyResult) {
        addMiniMetricCard(
          t("privacyTitle"),
          `${privacyResult.grade ?? "C"} / ${privacyResult.privacyScore ?? 50}`,
          `${privacyResult.trackers?.length ?? 0} tracker / ${privacyResult.thirdPartyDomains ?? 0} domini`,
          margin + summaryCardWidth + 3,
          currentY,
          summaryCardWidth,
          gradeColor(privacyResult.grade ?? "C"),
        );
      }
      addMiniMetricCard(
        t("carbonAnnual"),
        carbon.annualGrams > 1000 ? `${(carbon.annualGrams / 1000).toFixed(1)} kg` : `${Math.round(carbon.annualGrams)} g`,
        `${Math.ceil(carbon.treeDays)} ${t("carbonTrees").toLowerCase()}`,
        margin + (summaryCardWidth + 3) * 2,
        currentY,
        summaryCardWidth,
        gradeColor(carbon.grade),
      );
      currentY += 40;

      if (currentY > 214) {
        doc.addPage();
        addPageBackground();
        currentY = 24;
      }

      const conclusion = t("conclusionText", res.scores.performance);

      if (totalResource) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...border);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 3, 3, "FD");
        addKicker(t("pageWeight"), margin + 6, currentY + 8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...graphite);
        doc.text(formatBytes(totalResource.transferSize), margin + 6, currentY + 17);
        addKicker(t("totalRequests"), pageWidth / 2, currentY + 8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...graphite);
        doc.text(`${totalResource.requestCount}`, pageWidth / 2, currentY + 17);
        currentY += 34;
      }

      // --- 2. Core Web Vitals (Esperienza Reale) ---
      if (res.fieldData && res.fieldData.metrics) {
        addSectionTitle(t('realUserExperience'), currentY);

        const cwvs = Object.entries(res.fieldData.metrics).map(([key, val]: [string, any]) => [
          sanitizePdfText(key.replace(/_/g, ' ')),
          key.includes("SCORE") ? (val.percentile / 100).toFixed(2) : `${(val.percentile / 1000).toFixed(2)}s`,
          sanitizePdfText(val.category)
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [[t('metric'), t('value'), t('status')]],
          body: cwvs,
          theme: 'plain',
          margin: { left: margin, right: margin },
          styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3, textColor: graphiteSoft },
          headStyles: { fillColor: graphite, textColor: [255, 250, 241], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 247, 241] },
          bodyStyles: { lineColor: border, lineWidth: 0.1 },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 2) {
              const status = String(data.cell.raw).toLowerCase();
              if (status.includes("good") || status.includes("fast")) data.cell.styles.textColor = success;
              if (status.includes("average") || status.includes("needs")) data.cell.styles.textColor = warning;
              if (status.includes("poor") || status.includes("slow")) data.cell.styles.textColor = danger;
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- 3. Resource Breakdown ---
      if (currentY > 224) {
        doc.addPage();
        addPageBackground();
        currentY = 24;
      }
      addSectionTitle(t('pageWeight'), currentY);

      const resources = res.resourceSummary
        .filter((r: any) => r.resourceType !== 'total')
        .map((r: any) => [
          sanitizePdfText(t(r.resourceType) || r.label),
          r.requestCount,
          formatBytes(r.transferSize)
        ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [[t('resourceType'), t('requests'), t('size')]],
        body: resources,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3, textColor: graphiteSoft },
        headStyles: { fillColor: graphite, textColor: [255, 250, 241], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 241] },
        bodyStyles: { lineColor: border, lineWidth: 0.1 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;

      if (aeoResult?.signals) {
        doc.addPage();
        addPageBackground();
        currentY = 22;
        addSectionTitle(`${t("aeoTitle")} / ${t("score")}`, currentY);

        const signalRows = [
          [t("aeo_pillar_structure"), t("aeo_signal_schema"), aeoResult.signals.schema],
          [t("aeo_pillar_structure"), t("aeo_signal_headings"), aeoResult.signals.headings],
          [t("aeo_pillar_structure"), t("aeo_signal_semantic"), aeoResult.signals.semantic],
          [t("aeo_pillar_structure"), t("aeo_signal_metaDesc"), aeoResult.signals.metaDesc],
          [t("aeo_pillar_content"), t("aeo_signal_qa"), aeoResult.signals.qa],
          [t("aeo_pillar_content"), t("aeo_signal_chunks"), aeoResult.signals.chunks],
          [t("aeo_pillar_content"), t("aeo_signal_definitions"), aeoResult.signals.definitions],
          [t("aeo_pillar_content"), t("aeo_signal_answerFirst"), aeoResult.signals.answerFirst],
          [t("aeo_pillar_authority"), t("aeo_signal_author"), aeoResult.signals.author],
          [t("aeo_pillar_authority"), t("aeo_signal_datePublished"), aeoResult.signals.datePublished],
          [t("aeo_pillar_authority"), t("aeo_signal_citations"), aeoResult.signals.citations],
          [t("aeo_pillar_authority"), t("aeo_signal_llmsTxt"), aeoResult.signals.llmsTxt],
          [t("aeo_pillar_authority"), t("aeo_signal_faqSchema"), aeoResult.signals.faqSchema],
        ];

        autoTable(doc, {
          startY: currentY + 5,
          head: [[t("category"), t("metric"), t("score")]],
          body: signalRows.map(([pillar, signal, score]) => [
            sanitizePdfText(String(pillar)),
            sanitizePdfText(String(signal)),
            `${score}/100`,
          ]),
          theme: "plain",
          margin: { left: margin, right: margin },
          styles: { font: "helvetica", fontSize: 8.2, cellPadding: 3, textColor: graphiteSoft, valign: "middle" },
          headStyles: { fillColor: graphite, textColor: [255, 250, 241], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [250, 247, 241] },
          columnStyles: {
            0: { cellWidth: 44, fontStyle: "bold", textColor: graphite },
            1: { cellWidth: pageWidth - margin * 2 - 70 },
            2: { cellWidth: 26, fontStyle: "bold", halign: "right" },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 2) {
              const value = parseInt(String(data.cell.raw), 10);
              data.cell.styles.textColor = aeoColor(Number.isNaN(value) ? 0 : value);
            }
          },
        });
      }

      // --- New Page for Recommendations ---
      doc.addPage();
      addPageBackground();
      currentY = 20;

      // --- 4. Suggestions and Criticalities ---
      addSectionTitle(t('interventionPriority'), currentY);

      const oppBody = res.opportunities.map((o: any) => [
        sanitizePdfText(o.title),
        sanitizePdfText(t(o.level.toLowerCase()) || o.level),
        sanitizePdfText(o.impact || "-"),
        compactText(o.description || "", 170),
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [[t('detectedProblem'), t('severity'), t('estimatedImpact'), t('details')]],
        body: oppBody,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: graphiteSoft, valign: "top" },
        headStyles: { fillColor: graphite, textColor: [255, 250, 241], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 241] },
        columnStyles: {
          0: { cellWidth: 52, fontStyle: "bold", textColor: graphite },
          1: { cellWidth: 24, fontStyle: "bold" },
          2: { cellWidth: 26 },
          3: { cellWidth: pageWidth - margin * 2 - 102 },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            const severity = String(data.cell.raw).toLowerCase();
            if (severity === t("high").toLowerCase() || severity === "high") data.cell.styles.textColor = danger;
            if (severity === t("medium").toLowerCase() || severity === "medium") data.cell.styles.textColor = warning;
            if (severity === t("low").toLowerCase() || severity === "low") data.cell.styles.textColor = success;
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      if (currentY < 245) {
        addInsightCard(
          t("aiAdviceTitle"),
          topFix ? t("aiRecommendationDesc", topFix.title) : conclusion,
          currentY,
          champagne
        );
      }
    });

    addFooter();

    const filename = `UXAbility_Report_${new URL(results[0].url).hostname.replace(/[^a-z0-9.-]/gi, "_")}.pdf`;
    doc.save(filename);
  };

  const marqueeItems = [
    "PERFORMANCE", "ACCESSIBILITY", "SEO", "CORE WEB VITALS",
    "AI ANALYSIS", "UX AUDIT", "AEO SCORE", "BEST PRACTICES",
    "FRUSTRATION INDEX", "LIGHTHOUSE", "RESOURCE BREAKDOWN",
    "CARBON FOOTPRINT", "PRIVACY SCORE",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden text-[var(--foreground)] relative">
      <CreativeBackdrop />
      <Navbar />

      <main className="w-full max-w-5xl px-4 md:px-6 pt-32 md:pt-40 pb-20 flex-grow relative z-10">
        {/* Hero Section */}
        <section className="text-center mb-0 relative">
          {/* Background decoration */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
          >
            <span
              className="text-[22vw] md:text-[18vw] font-black tracking-tighter leading-none text-stone-900"
              style={{ opacity: 0.025 }}
            >
              AUDIT
            </span>
          </div>
          <div
            aria-hidden="true"
            className="hidden md:block absolute -right-10 top-8 w-48 h-48 pointer-events-none opacity-70"
          >
            <div className="absolute inset-0 rounded-full border border-stone-900/10" />
            <div className="absolute inset-7 rounded-full border border-dashed border-stone-900/12" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black tracking-tighter text-[var(--graphite-900)]">AA</div>
                <div className="section-label text-stone-400 mt-1">WCAG Signal</div>
              </div>
            </div>
            <div className="absolute right-0 top-9 w-12 h-1 rounded-full bg-[var(--champagne)]/70" />
            <div className="absolute left-3 bottom-12 w-16 h-1 rounded-full bg-stone-900/18" />
          </div>
          <div
            aria-hidden="true"
            className="hidden md:grid absolute -left-12 top-48 w-36 gap-2 pointer-events-none opacity-55"
          >
            <span className="h-2 rounded-full bg-stone-900/45" />
            <span className="h-2 w-4/5 rounded-full bg-stone-900/25" />
            <span className="h-2 w-3/5 rounded-full bg-[var(--champagne)]/70" />
            <span className="h-2 w-2/5 rounded-full bg-stone-900/15" />
          </div>

          {/* Section tag */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-stone-400/40" />
            <span className="section-label text-stone-500 flex items-center gap-1.5 eyebrow-pill px-3 py-1.5 rounded-full">
              <Bot size={11} />
              Accessibility · Performance · AI Readiness
            </span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-stone-400/40" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative inline-block text-5xl md:text-8xl font-extrabold tracking-tighter mb-6 text-[var(--graphite-950)] pb-3 drop-shadow-[0_10px_24px_rgba(32,28,24,0.12)]"
          >
            <span className="absolute left-1/2 bottom-3 h-3 w-[92%] -translate-x-1/2 rounded-full bg-[var(--champagne)]/35 blur-sm" aria-hidden="true" />
            <span className="relative">
            MAKE THE WEB<br />READABLE.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-muted-premium font-medium max-w-2xl mx-auto mb-10"
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
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="section-label text-stone-400">Enter URL</span>
              <span className="hidden sm:inline section-label text-stone-300">Audit Command</span>
            </div>
            <div className="relative group w-full flex items-center">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('inputPlaceholder')}
                className="w-full h-14 md:h-16 pl-12 md:pl-14 pr-[120px] md:pr-40 input-premium text-base md:text-lg placeholder:opacity-40"
              />
              <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-stone-500 opacity-60 group-focus-within:text-stone-900 transition-colors pointer-events-none" size={20} />

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
                  className="absolute -bottom-0 left-6 right-6 h-[1px] rounded-full overflow-hidden bg-stone-900/10"
                >
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-stone-600 to-transparent"
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
                className="mt-4 text-[var(--danger)] font-medium"
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
              { label: "Contrast", highlight: false },
              { label: "Semantics", highlight: false },
              { label: "Core Web Vitals", highlight: false },
              { label: "AEO Score", highlight: true },
              { label: "AI Readability", highlight: true },
              { label: "Privacy Score", highlight: true },
              { label: "PDF Report", highlight: false },
            ].map((chip) => (
              <span
                key={chip.label}
                className={
                  chip.highlight
                    ? "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border bg-stone-900/8 border-stone-900/20 text-stone-800 shadow-sm"
                    : "px-3 py-1 rounded-full text-xs font-medium border border-stone-300/80 bg-white/40 text-stone-600"
                }
              >
                {chip.highlight && <Bot size={11} />}
                {chip.label}
              </span>
            ))}
          </motion.div>
        </section>

        {/* Marquee strip */}
        <div className="relative -mx-4 md:-mx-6 overflow-hidden border-y border-stone-200 py-3 my-16">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="section-label text-stone-300 mx-10">
                {item}
                <span className="ml-10 text-stone-200">·</span>
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
                  <div className="p-3 rounded-lg icon-tile">
                    <Globe size={24} className="text-stone-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold truncate max-w-[200px] md:max-w-xs text-stone-950">
                      {new URL(currentResult.url).pathname === '/' ? t('homePage') : new URL(currentResult.url).pathname}
                    </h2>
                    <p className="text-stone-600 text-sm truncate max-w-[200px] md:max-w-xs">{currentResult.url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg premium-surface hover:border-stone-400 transition-all text-sm font-medium text-stone-800"
                  >
                    <FileText size={18} className="text-stone-500" />
                    {t('exportPdf')}
                  </button>
                  <div className="flex items-center gap-2 text-stone-800 premium-surface px-4 py-2 rounded-lg text-sm font-medium">
                    <CheckCircle2 size={18} className="text-[var(--success)]" />
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
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-transparent text-stone-400 border-stone-200 hover:border-stone-400 hover:text-stone-700"
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
              <div className="space-y-12 pt-12 border-t border-stone-200">
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
                  <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-600">
                    <Zap className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-stone-800">{t('criticalities')}</h3>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {currentResult.opportunities.length > 0 ? (
                    currentResult.opportunities.map((opp: any, i: number) => (
                      <OpportunityCard key={`opp-${i}-${opp.title.substring(0, 10)}`} opportunity={opp} index={i} />
                    ))
                  ) : (
                    <div className="card p-12 text-center text-stone-400 italic">
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
