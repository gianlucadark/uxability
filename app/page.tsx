"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, CheckCircle2, Globe, FileText, Zap, Bot, Radar, Network, Sparkles, ShieldCheck, Gauge, Leaf, Target, TrendingUp, AlertTriangle, ChevronRight, ClipboardCopy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreativeBackdrop from "@/components/CreativeBackdrop";
import type { BotPolicyResult } from "@/components/AIBotPolicy";
import { useLanguage } from "@/context/LanguageContext";
import { buildFixSuggestions, type FixSuggestion } from "@/lib/fixSuggestions";
import { buildMarkdownReport } from "@/lib/markdownReport";

const ScoreCircle = dynamic(() => import("@/components/ScoreCircle"));
const OpportunityCard = dynamic(() => import("@/components/OpportunityCard"));
const AuditModal = dynamic(() => import("@/components/AuditModal"));
const FieldDataBadges = dynamic(() => import("@/components/FieldDataBadges"));
const ResourceBreakdown = dynamic(() => import("@/components/ResourceBreakdown"));
const MainThreadBreakdown = dynamic(() => import("@/components/MainThreadBreakdown"));
const LabMetrics = dynamic(() => import("@/components/LabMetrics"));
const AIRecommendation = dynamic(() => import("@/components/AIRecommendation"));
const FixPlan = dynamic(() => import("@/components/FixPlan"));
const FrustrationIndex = dynamic(() => import("@/components/FrustrationIndex"));
const SocialPreview = dynamic(() => import("@/components/SocialPreview"));
const AEOScore = dynamic(() => import("@/components/AEOScore"));
const ShareScoreCard = dynamic(() => import("@/components/ShareScoreCard"));
const LLMsTxtGenerator = dynamic(() => import("@/components/LLMsTxtGenerator"));
const CarbonScore = dynamic(() => import("@/components/CarbonScore"));
const PrivacyScore = dynamic(() => import("@/components/PrivacyScore"));
const AIBotPolicy = dynamic(() => import("@/components/AIBotPolicy"));
const ParticleWord = dynamic(() => import("@/components/ParticleWord"));

const emptyAeoSignals = {
  schema: 0,
  headings: 0,
  semantic: 0,
  metaDesc: 0,
  qa: 0,
  chunks: 0,
  definitions: 0,
  answerFirst: 0,
  author: 0,
  datePublished: 0,
  citations: 0,
  llmsTxt: 0,
  faqSchema: 0,
};

const ANALYSIS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
// Bumped to v4: prior versions could cache a partial crawl (just the main page)
// produced by a now-fixed stream bug, leaving users stuck on single-page results.
const ANALYSIS_CACHE_PREFIX = "uxability:analysis:v4:";
// Defaults to build time so the "last updated" stamp stays honest without a manual
// bump on every deploy. Override via NEXT_PUBLIC_BUILD_DATE to pin a release date.
const LAST_UPDATED = (process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString()).slice(0, 10);

interface CachedValue<T> {
  timestamp: number;
  value: T;
}

function normalizeAnalysisUrl(value: string): string {
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return value.trim();
  }
}

function getCachedValue<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(`${ANALYSIS_CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedValue<T>;
    if (!cached?.timestamp || Date.now() - cached.timestamp > ANALYSIS_CACHE_TTL_MS) {
      window.localStorage.removeItem(`${ANALYSIS_CACHE_PREFIX}${key}`);
      return null;
    }

    return cached.value;
  } catch {
    return null;
  }
}

function setCachedValue<T>(key: string, value: T) {
  try {
    const cached: CachedValue<T> = { timestamp: Date.now(), value };
    window.localStorage.setItem(`${ANALYSIS_CACHE_PREFIX}${key}`, JSON.stringify(cached));
  } catch {
    // localStorage can be unavailable or full; analysis should still work normally.
  }
}

function shouldCacheResult(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    !("error" in value),
  );
}

function getFriendlyAnalysisError(error: unknown, fallback: string, language: string): string {
  const technicalPattern = /pagespeed|lighthouse|timeout|abort|network|failed to fetch|fetch failed|status\s?\d{3}|api|json|server/i;
  const message = error instanceof Error ? error.message : "";

  if (!message || technicalPattern.test(message)) {
    return fallback;
  }

  if (language === "it" && /^error during analysis/i.test(message)) {
    return fallback;
  }

  return message;
}

type DashboardTab = "overview" | "performance" | "ai" | "privacy";

interface VerdictInfo {
  level: "excellent" | "good" | "warning" | "critical";
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof Sparkles;
}

function getVerdict(overall: number, language: string): VerdictInfo {
  if (overall >= 85) {
    return {
      level: "excellent",
      label: language === "it" ? "Eccellente" : "Excellent",
      desc: language === "it"
        ? "Il sito è solido su tutti i fronti. Mantieni il livello con monitoraggio continuo."
        : "The site is strong across the board. Keep this level with continuous monitoring.",
      color: "#0f8f68",
      bg: "rgba(15,143,104,0.08)",
      border: "rgba(15,143,104,0.25)",
      icon: Sparkles,
    };
  }
  if (overall >= 65) {
    return {
      level: "good",
      label: language === "it" ? "Buono" : "Good",
      desc: language === "it"
        ? "Buona base con margini di crescita. Concentra gli sforzi sulle 3 azioni prioritarie qui sotto."
        : "Solid baseline with room to grow. Focus on the 3 priority actions below.",
      color: "#3f6f8f",
      bg: "rgba(63,111,143,0.08)",
      border: "rgba(63,111,143,0.25)",
      icon: TrendingUp,
    };
  }
  if (overall >= 45) {
    return {
      level: "warning",
      label: language === "it" ? "Da migliorare" : "Needs work",
      desc: language === "it"
        ? "Diverse aree richiedono attenzione. Le azioni in alto riducono subito l'impatto sugli utenti."
        : "Several areas need attention. The actions above will quickly reduce user impact.",
      color: "#b7791f",
      bg: "rgba(183,121,31,0.10)",
      border: "rgba(183,121,31,0.30)",
      icon: AlertTriangle,
    };
  }
  return {
    level: "critical",
    label: language === "it" ? "Critico" : "Critical",
    desc: language === "it"
      ? "Problemi rilevanti su più dimensioni. Affronta subito le azioni prioritarie per fermare la perdita."
      : "Significant problems across multiple dimensions. Address priority actions now to stop the bleeding.",
    color: "#bd3150",
    bg: "rgba(189,49,80,0.10)",
    border: "rgba(189,49,80,0.30)",
    icon: AlertTriangle,
  };
}

function scoreColor(score: number): string {
  if (score >= 90) return "#0f8f68";
  if (score >= 50) return "#b7791f";
  return "#bd3150";
}

function aeoScoreColor(score: number): string {
  if (score >= 70) return "#0f8f68";
  if (score >= 40) return "#b7791f";
  return "#bd3150";
}

function LLMsTxtSkeleton() {
  return (
    <div className="card p-4 md:p-5 animate-pulse" aria-label="Loading llms.txt generator">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-stone-200/80" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-full bg-stone-200/80" />
            <div className="h-3 w-64 max-w-[62vw] rounded-full bg-stone-200/80" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-lg bg-stone-200/80" />
      </div>
      <div className="mt-4 grid gap-2">
        <div className="h-3 w-full rounded-full bg-stone-200/70" />
        <div className="h-3 w-5/6 rounded-full bg-stone-200/70" />
        <div className="h-3 w-2/3 rounded-full bg-stone-200/70" />
      </div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [aeoResult, setAeoResult] = useState<any | null>(null);
  const [privacyResult, setPrivacyResult] = useState<any | null>(null);
  const [botPolicyResult, setBotPolicyResult] = useState<BotPolicyResult | null>(null);
  const [crawlInternalPages, setCrawlInternalPages] = useState(false);
  const [maxExtraUrls, setMaxExtraUrls] = useState(3);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [markdownCopied, setMarkdownCopied] = useState(false);
  // While the analyze stream is running, mirror the server's expected page count
  // so the UI can render skeleton tabs for pages that haven't arrived yet.
  const [pendingResultsCount, setPendingResultsCount] = useState(0);
  const analysisRunRef = useRef(0);
  const { language, t } = useLanguage();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Simple URL validation
    try {
      new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } catch {
      setError(t('invalidUrl'));
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setAeoResult(null);
    setPrivacyResult(null);
    setBotPolicyResult(null);
    setActiveResultIndex(0);
    setPendingResultsCount(crawlInternalPages ? maxExtraUrls + 1 : 1);

    const runId = analysisRunRef.current + 1;
    analysisRunRef.current = runId;

    try {
      const formattedUrl = normalizeAnalysisUrl(url);
      const aeoCacheKey = `aeo:${formattedUrl}`;
      const privacyCacheKey = `privacy:${formattedUrl}`;
      const botsCacheKey = `bots:${formattedUrl}`;
      const analyzeCacheKey = `analyze:${formattedUrl}:${language}:${crawlInternalPages ? maxExtraUrls + 1 : 1}`;
      const aeoFallback = { error: "fetch_failed", aeo: 0, structureScore: 0, contentScore: 0, authorityScore: 0, signals: emptyAeoSignals };
      const privacyFallback = { error: "fetch_failed", privacyScore: 50, grade: "C", trackers: [], thirdPartyDomains: 0, consentDetected: false, adCount: 0, analyticsCount: 0, functionalCount: 0 };
      const botsFallback: BotPolicyResult = {
        fetched: false,
        robotsUrl: "",
        hasRobotsTxt: false,
        wildcardStatus: "not_specified",
        wildcardDisallowedPaths: [],
        bots: [],
        summary: { allow: 0, block: 0, partial: 0, not_specified: 0 },
        suggestedFix: null,
        error: "fetch_failed",
      };
      const cachedAeo = getCachedValue<typeof aeoFallback>(aeoCacheKey);
      const cachedPrivacy = getCachedValue<typeof privacyFallback>(privacyCacheKey);
      const cachedBots = getCachedValue<BotPolicyResult>(botsCacheKey);
      const cachedAnalyze = getCachedValue<{ results: NonNullable<typeof results> }>(analyzeCacheKey);

      if (cachedAeo) setAeoResult(cachedAeo);
      if (cachedPrivacy) setPrivacyResult(cachedPrivacy);
      if (cachedBots) setBotPolicyResult(cachedBots);

      const aeoPromise = cachedAeo
        ? Promise.resolve(cachedAeo)
        : fetch("/api/aeo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl }),
        })
          .then(async (response) => {
            const data = await response.json();
            const result = response.ok ? data : { ...aeoFallback, error: data.error || "fetch_failed" };
            if (shouldCacheResult(result)) setCachedValue(aeoCacheKey, result);
            return result;
          })
          .catch(() => aeoFallback);

      const privacyPromise = cachedPrivacy
        ? Promise.resolve(cachedPrivacy)
        : fetch("/api/privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl }),
        })
          .then(async (response) => {
            const result = response.ok ? await response.json() : privacyFallback;
            if (shouldCacheResult(result)) setCachedValue(privacyCacheKey, result);
            return result;
          })
          .catch(() => privacyFallback);

      const botsPromise = cachedBots
        ? Promise.resolve(cachedBots)
        : fetch("/api/bots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: formattedUrl }),
        })
          .then(async (response) => {
            const result: BotPolicyResult = response.ok ? await response.json() : botsFallback;
            if (shouldCacheResult(result)) setCachedValue(botsCacheKey, result);
            return result;
          })
          .catch(() => botsFallback);

      if (cachedAnalyze) {
        if (runId !== analysisRunRef.current) return;
        setResults(cachedAnalyze.results);
        setPendingResultsCount(0);
        setLoading(false);
      } else {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: formattedUrl,
            lang: language,
            fast: !crawlInternalPages,
            maxPages: crawlInternalPages ? maxExtraUrls + 1 : 1,
            stream: true,
          }),
        });

        if (!response.ok || !response.body) {
          let payload: { error?: string } = {};
          try { payload = await response.json(); } catch { /* non-JSON */ }
          throw new Error(payload.error || t("analysisError"));
        }

        // NDJSON stream: append each "result" event as it arrives so the user sees
        // the first page immediately instead of waiting for the full batch.
        const streamed: NonNullable<typeof results> = [];
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let firstResultDelivered = false;
        let streamError: { message: string } | null = null;
        let streamDone = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx = buffer.indexOf("\n");
          while (newlineIdx !== -1) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);
            newlineIdx = buffer.indexOf("\n");
            if (!line) continue;

            let event: { type?: string; result?: unknown; error?: string };
            try { event = JSON.parse(line); } catch { continue; }

            if (event.type === "start" && typeof (event as { total?: number }).total === "number") {
              const total = (event as { total: number }).total;
              setPendingResultsCount(Math.max(0, total));
            } else if (event.type === "result" && event.result) {
              if (runId !== analysisRunRef.current) {
                await reader.cancel();
                return;
              }
              streamed.push(event.result as never);
              setResults([...streamed]);
              setPendingResultsCount((prev) => Math.max(0, prev - 1));
              if (!firstResultDelivered) {
                firstResultDelivered = true;
                setLoading(false);
              }
            } else if (event.type === "error") {
              streamError = { message: event.error || t("analysisError") };
            } else if (event.type === "done") {
              streamDone = true;
              setPendingResultsCount(0);
            }
          }
        }

        if (streamError && streamed.length === 0) throw new Error(streamError.message);
        // Only persist when the stream finished cleanly AND we got the requested
        // page count — otherwise a partial run could lock subsequent loads onto a
        // single-page result.
        const expected = crawlInternalPages ? maxExtraUrls + 1 : 1;
        if (streamDone && streamed.length >= expected) {
          setCachedValue(analyzeCacheKey, { results: streamed });
        }
      }

      if (runId !== analysisRunRef.current) return;

      void Promise.allSettled([aeoPromise, privacyPromise, botsPromise]).then(([aeoSettled, privacySettled, botsSettled]) => {
        if (runId !== analysisRunRef.current) return;

        setAeoResult(aeoSettled.status === "fulfilled" ? aeoSettled.value : aeoFallback);
        setPrivacyResult(privacySettled.status === "fulfilled" ? privacySettled.value : privacyFallback);
        setBotPolicyResult(botsSettled.status === "fulfilled" ? botsSettled.value : botsFallback);
      });
    } catch (err) {
      if (runId === analysisRunRef.current) {
        setError(getFriendlyAnalysisError(err, t("analysisError"), language));
      }
      setLoading(false);
      setPendingResultsCount(0);
    }
  };

  const currentResult = results ? results[activeResultIndex] : null;

  const topFixes = useMemo<FixSuggestion[]>(() => {
    if (!currentResult) return [];
    try {
      const all = buildFixSuggestions({
        result: currentResult as any,
        aeoResult: aeoResult as any,
        privacyResult: privacyResult as any,
        language: language === "it" ? "it" : "en",
      });
      return all.slice(0, 3);
    } catch {
      return [];
    }
  }, [currentResult, aeoResult, privacyResult, language]);

  const overallScore = useMemo(() => {
    if (!currentResult) return 0;
    const s = currentResult.scores || {};
    const perf = s.performance ?? 0;
    const a11y = s.accessibility ?? 0;
    const seo = s.seo ?? 0;
    const aeo = aeoResult?.aeo ?? 0;
    const privacy = privacyResult?.privacyScore ?? 50;
    return Math.round(perf * 0.30 + a11y * 0.20 + seo * 0.15 + aeo * 0.20 + privacy * 0.15);
  }, [currentResult, aeoResult, privacyResult]);

  const verdict = useMemo(() => getVerdict(overallScore, language), [overallScore, language]);

  const exportToPDF = async () => {
    if (!results) return;

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

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
      .replace(/–|—/g, "-")
      .replace(/×/g, "x")
      .replace(/CO₂/g, "CO2")
      .replace(/≥/g, ">=")
      .replace(/≤/g, "<=")
      .replace(/→/g, "->")
      .replace(/·/g, "/")
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
    const aeoAiPdfNote = language === "it"
      ? "La metrica AI rilegge il contenuto reale della pagina dopo il controllo HTML. Quando disponibile pesa il 60% sullo score AEO finale e valuta soprattutto chiarezza semantica, risposte dirette, definizioni, autorevolezza e citabilita."
      : "The AI metric rereads the real page content after the HTML check. When available it weighs 60% of the final AEO score and mainly evaluates semantic clarity, direct answers, definitions, authority and citability.";
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
    addInsightCard(t("aeo_ai_role_title"), aeoAiPdfNote, introY, success);
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
    introY += 44;
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
        ? "Per ogni URL trovi prima la sintesi con lo score AEO e la metrica AI, poi i segnali AEO, le metriche tecniche e gli interventi consigliati."
        : "For each URL you will first find the summary with AEO score and AI metric, then AEO signals, technical metrics and recommended actions.",
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
        const aiScore = aeoResult.aiEnhanced ? (aeoResult.aiScore ?? aeoScore) : null;
        const aeoMetricWidth = 31;
        const aeoMetricGap = 3;
        const aeoMetricStartX = margin + 48;
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
          t("aeo_ai_score_label"),
          aiScore === null ? "-" : `${aiScore}`,
          aeoResult.aiEnhanced ? "60%" : t("aeo_ai_role_fallback_label"),
          aeoMetricStartX,
          currentY + 10,
          aeoMetricWidth,
          aiScore === null ? muted : aeoColor(aiScore),
        );
        addMiniMetricCard(
          t("aeo_pillar_structure"),
          `${aeoResult.structureScore ?? 0}`,
          aeoResult.aiEnhanced ? "15%" : "35%",
          aeoMetricStartX + (aeoMetricWidth + aeoMetricGap),
          currentY + 10,
          aeoMetricWidth,
          aeoColor(aeoResult.structureScore ?? 0),
        );
        addMiniMetricCard(
          t("aeo_pillar_content"),
          `${aeoResult.contentScore ?? 0}`,
          aeoResult.aiEnhanced ? "15%" : "40%",
          aeoMetricStartX + (aeoMetricWidth + aeoMetricGap) * 2,
          currentY + 10,
          aeoMetricWidth,
          aeoColor(aeoResult.contentScore ?? 0),
        );
        addMiniMetricCard(
          t("aeo_pillar_authority"),
          `${aeoResult.authorityScore ?? 0}`,
          aeoResult.aiEnhanced ? "10%" : "25%",
          aeoMetricStartX + (aeoMetricWidth + aeoMetricGap) * 3,
          currentY + 10,
          aeoMetricWidth,
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
        currentY += 12;
        addInsightCard(
          t("aeo_ai_role_title"),
          aeoResult.aiEnhanced ? t("aeo_ai_role_active_desc") : t("aeo_ai_role_fallback_desc"),
          currentY,
          aeoResult.aiEnhanced ? success : warning,
        );
        currentY += 44;

        const signalRows = [
          [t("aeo_ai_role_title"), t("aeo_ai_score_label"), aeoResult.aiEnhanced ? (aeoResult.aiScore ?? aeoResult.aeo ?? 0) : "-"],
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
            score === "-" ? "-" : `${score}/100`,
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
    "CARBON FOOTPRINT", "PRIVACY SCORE", "AI BOT POLICY",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden text-[var(--foreground)] relative">
      <CreativeBackdrop />
      <Navbar />

      <main id="main-content" className="w-full max-w-5xl px-4 md:px-6 pt-32 md:pt-40 pb-20 flex-grow relative z-10">
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
            className="hero-headline relative inline-block text-5xl md:text-8xl font-extrabold tracking-tighter mb-6 text-[var(--graphite-950)]"
          >
            <span className="hero-headline__aura" aria-hidden="true" />
            <span className="hero-headline__text">
              <span className="hero-headline__line">MAKE THE WEB</span>
              <span className="hero-headline__accent">READABLE.</span>
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-stone-600 font-medium max-w-2xl mx-auto mb-10"
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
              <label htmlFor="audit-url" className="section-label text-stone-600">
                {language === "it" ? "URL sito" : "Enter URL"}
              </label>
              <span className="hidden sm:inline section-label text-stone-600">Audit Command</span>
            </div>
            <div className="relative group w-full flex items-center">
              <input
                id="audit-url"
                type="text"
                inputMode="url"
                autoComplete="url"
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
                  aria-label={loading ? t('crawlingText') : t('analyzeButton')}
                  aria-busy={loading}
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

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-700">
              <label className="flex min-w-0 cursor-pointer items-center gap-1.5">
                <input
                  id="crawl-internal-pages"
                  type="checkbox"
                  checked={crawlInternalPages}
                  onChange={(event) => setCrawlInternalPages(event.target.checked)}
                  disabled={loading}
                  className="h-3.5 w-3.5 accent-stone-900 disabled:opacity-50"
                />
                <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                  <Network size={12} className="shrink-0" />
                  {language === "it" ? "Crawl pagine interne" : "Crawl internal pages"}
                </span>
              </label>

              <div className="flex items-center gap-1.5">
                <label htmlFor="max-extra-urls" className="font-medium">
                  {language === "it" ? "URL extra" : "Extra URLs"}
                </label>
                <select
                  id="max-extra-urls"
                  value={maxExtraUrls}
                  onChange={(event) => setMaxExtraUrls(Number(event.target.value))}
                  disabled={!crawlInternalPages || loading}
                  className="h-7 rounded-md border border-stone-900/10 bg-white/50 px-2 text-xs font-bold text-stone-700 outline-none transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {[1, 2, 3].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AnimatePresence>
              {loading && (
              <motion.div
                  key="scan-status"
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  role="status"
                  aria-live="polite"
                  className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 mx-auto max-w-xl rounded-xl border border-stone-900/15 bg-[rgba(255,252,246,0.92)] p-3 shadow-[0_18px_45px_rgba(32,28,24,0.14)] backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="scan-visual" aria-hidden="true">
                      <Radar size={18} className="scan-visual__icon" />
                      <span className="scan-visual__line" />
                      <span className="scan-visual__corner scan-visual__corner--tl" />
                      <span className="scan-visual__corner scan-visual__corner--tr" />
                      <span className="scan-visual__corner scan-visual__corner--br" />
                      <span className="scan-visual__corner scan-visual__corner--bl" />
                    </div>

                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-stone-700">
                          {t('scanPanelTitle')}
                        </p>
                        <div className="scan-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                      <p className="mt-1 text-xs font-medium text-stone-600">
                        {t('crawlingText')}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                        {[t('scanStepStructure'), t('scanStepVitals'), t('scanStepAI')].map((step, index) => (
                          <span
                            key={step}
                            className="scan-chip"
                            style={{ animationDelay: `${index * 0.28}s` }}
                          >
                            {step}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ParticleWord />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
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
        <div aria-hidden="true" className="relative -mx-4 md:-mx-6 overflow-hidden border-y border-stone-200 py-3 my-16">
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
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg premium-surface hover:border-stone-400 transition-all text-sm font-medium text-stone-800"
                  >
                    <FileText size={18} className="text-stone-500" />
                    {t('exportPdf')}
                  </button>
                  <button
                    onClick={async () => {
                      if (!results) return;
                      const md = buildMarkdownReport({
                        results: results as any,
                        aeoResult: aeoResult as any,
                        privacyResult: privacyResult as any,
                        language: language === "it" ? "it" : "en",
                      });
                      try {
                        await navigator.clipboard.writeText(md);
                        setMarkdownCopied(true);
                        setTimeout(() => setMarkdownCopied(false), 2000);
                      } catch {
                        // Clipboard API can fail in non-secure contexts; fall back to a textarea.
                        const ta = document.createElement("textarea");
                        ta.value = md;
                        document.body.appendChild(ta);
                        ta.select();
                        try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
                        setMarkdownCopied(true);
                        setTimeout(() => setMarkdownCopied(false), 2000);
                      }
                    }}
                    type="button"
                    aria-live="polite"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg premium-surface hover:border-stone-400 transition-all text-sm font-medium text-stone-800"
                  >
                    {markdownCopied
                      ? <Check size={18} className="text-[var(--success)]" />
                      : <ClipboardCopy size={18} className="text-stone-500" />}
                    {markdownCopied ? t('copyMarkdownDone') : t('copyMarkdown')}
                  </button>
                  <div className="flex items-center gap-2 text-stone-800 premium-surface px-4 py-2 rounded-lg text-sm font-medium">
                    <CheckCircle2 size={18} className="text-[var(--success)]" />
                    <span>{t('analyzed')}</span>
                  </div>
                </div>
              </div>

              {/* Page Selector Tabs */}
              {(results.length > 1 || pendingResultsCount > 0) && (
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 -mt-6">
                  {results.map((res, i) => (
                    <button
                      type="button"
                      key={`tab-${i}-${res.url}`}
                      onClick={() => setActiveResultIndex(i)}
                      aria-current={activeResultIndex === i ? "page" : undefined}
                      className={`px-4 md:px-6 py-2 rounded-lg text-xs font-semibold transition-all border ${activeResultIndex === i
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-transparent text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900"
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
                  {Array.from({ length: pendingResultsCount }).map((_, i) => (
                    <div
                      key={`tab-skeleton-${i}`}
                      role="status"
                      aria-label={language === "it" ? "Caricamento pagina" : "Loading page"}
                      className="flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg border border-dashed border-stone-300 bg-stone-100/40"
                    >
                      <Loader2 size={12} className="animate-spin text-stone-400" />
                      <span className="h-2.5 w-12 md:w-16 rounded-full bg-stone-200 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {/* ===== Hero Scorecard: verdict + 5 mini scores + top 3 actions ===== */}
              <div
                className="relative overflow-hidden rounded-2xl border bg-white/60 backdrop-blur-sm p-6 md:p-8"
                style={{ borderColor: verdict.border }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${verdict.bg} 0%, transparent 60%)` }}
                />
                <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:gap-8 items-center">
                  {/* Verdict block */}
                  <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-3 md:border-r md:pr-8" style={{ borderColor: verdict.border }}>
                    <div
                      className="flex items-center justify-center rounded-full h-16 w-16 md:h-20 md:w-20 shrink-0"
                      style={{ backgroundColor: verdict.bg, color: verdict.color, border: `2px solid ${verdict.border}` }}
                    >
                      <verdict.icon size={28} />
                    </div>
                    <div className="min-w-0">
                      <div className="section-label text-stone-500 mb-1">
                        {language === "it" ? "Verdetto" : "Verdict"}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-black tabular-nums" style={{ color: verdict.color }}>
                          {overallScore}
                        </span>
                        <span className="text-sm font-medium text-stone-500">/100</span>
                      </div>
                      <div className="text-lg md:text-xl font-bold mt-0.5" style={{ color: verdict.color }}>
                        {verdict.label}
                      </div>
                    </div>
                  </div>

                  {/* Mini scores row */}
                  <div>
                    <p className="text-sm text-stone-600 mb-4 leading-relaxed max-w-2xl">
                      {verdict.desc}
                    </p>
                    <div className="grid grid-cols-5 gap-2 md:gap-3">
                      {[
                        { key: "perf", label: t('performance'), value: currentResult.scores.performance, onClick: () => setSelectedCategory("performance"), isAeo: false },
                        { key: "a11y", label: t('accessibility'), value: currentResult.scores.accessibility, onClick: () => setSelectedCategory("accessibility"), isAeo: false },
                        { key: "seo", label: t('seo'), value: currentResult.scores.seo, onClick: () => setSelectedCategory("seo"), isAeo: false },
                        { key: "aeo", label: "AEO", value: aeoResult?.aeo ?? null, onClick: () => setActiveTab("ai"), isAeo: true },
                        { key: "priv", label: language === "it" ? "Privacy" : "Privacy", value: privacyResult?.privacyScore ?? null, onClick: () => setActiveTab("privacy"), isAeo: false },
                      ].map((m) => {
                        const isPending = m.value === null;
                        const color = isPending ? "#9ca3af" : (m.isAeo ? aeoScoreColor(m.value as number) : scoreColor(m.value as number));
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={m.onClick}
                            className="group flex flex-col items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white/70 px-2 py-3 hover:border-stone-400 hover:-translate-y-0.5 transition-all"
                          >
                            <span className="text-xl md:text-2xl font-black tabular-nums" style={{ color }}>
                              {isPending ? "—" : m.value}
                            </span>
                            <span className="section-label text-stone-500 group-hover:text-stone-700 text-[9px] md:text-[10px] truncate max-w-full">
                              {m.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Top 3 actions */}
                {topFixes.length > 0 && (
                  <div className="relative mt-7 pt-6 border-t border-stone-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={14} className="text-stone-600" />
                      <span className="section-label text-stone-600">
                        {language === "it" ? "Le 3 azioni prioritarie" : "Top 3 priority actions"}
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {topFixes.map((fix, i) => (
                        <button
                          key={fix.id}
                          type="button"
                          onClick={() => {
                            // Route to relevant tab by category
                            if (fix.category === "aeo") setActiveTab("ai");
                            else if (fix.category === "privacy" || fix.category === "carbon") setActiveTab("privacy");
                            else setActiveTab("performance");
                          }}
                          className="group flex items-start gap-3 rounded-xl border border-stone-200 bg-white/70 p-3 text-left hover:border-stone-400 hover:bg-white transition-all"
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                            style={{
                              backgroundColor: fix.priority === "critical" ? "#bd3150" : fix.priority === "high" ? "#b7791f" : "#3f6f8f",
                              color: "white",
                            }}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">
                              {fix.title}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-500">
                              <span>{fix.category}</span>
                              <span>·</span>
                              <span>{fix.priority}</span>
                              <ChevronRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== Shareable Scorecard (in cima, virale) ===== */}
              <ShareScoreCard
                scores={currentResult.scores}
                aeoScore={aeoResult?.aeo ?? 0}
                analyzedUrl={currentResult.url}
              />

              {/* ===== Tab navigation (Apple-style: pill centered) ===== */}
              <div className="sticky top-20 z-20 flex justify-center">
                <div className="inline-flex items-center gap-1 max-w-full overflow-x-auto rounded-full border border-stone-200 bg-white/85 backdrop-blur-md p-1 shadow-sm">
                  {([
                    { key: "overview", label: language === "it" ? "Panoramica" : "Overview", icon: Sparkles },
                    { key: "performance", label: language === "it" ? "Performance" : "Performance", icon: Gauge },
                    { key: "ai", label: language === "it" ? "AI & Contenuto" : "AI & Content", icon: Bot },
                    { key: "privacy", label: language === "it" ? "Privacy & Impatto" : "Privacy & Impact", icon: ShieldCheck },
                  ] as { key: DashboardTab; label: string; icon: typeof Sparkles }[]).map((tab) => {
                    const active = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 md:px-5 py-2 text-xs md:text-sm font-semibold transition-all ${active
                          ? "bg-stone-900 text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          }`}
                      >
                        <Icon size={14} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ===== Tab content ===== */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-12"
                >
                  {activeTab === "overview" && (
                    <>
                      <AIRecommendation
                        score={currentResult.scores.performance}
                        opportunities={currentResult.opportunities}
                      />
                      <FixPlan
                        result={currentResult}
                        aeoResult={aeoResult}
                        privacyResult={privacyResult}
                      />
                    </>
                  )}

                  {activeTab === "performance" && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <ScoreCircle
                          score={currentResult.scores.performance}
                          label={t('performance')}
                          delay={0.05}
                          onClick={() => setSelectedCategory("performance")}
                        />
                        <ScoreCircle
                          score={currentResult.scores.accessibility}
                          label={t('accessibility')}
                          delay={0.1}
                          onClick={() => setSelectedCategory("accessibility")}
                        />
                        <ScoreCircle
                          score={currentResult.scores.bestPractices}
                          label={t('bestPractices')}
                          delay={0.15}
                          onClick={() => setSelectedCategory("bestPractices")}
                        />
                        <ScoreCircle
                          score={currentResult.scores.seo}
                          label={t('seo')}
                          delay={0.2}
                          onClick={() => setSelectedCategory("seo")}
                        />
                      </div>

                      <FieldDataBadges fieldData={currentResult.fieldData} />
                      <FrustrationIndex
                        cls={currentResult.keyMetrics.cls_v || 0}
                        tbt={currentResult.keyMetrics.tbt_v || 0}
                      />
                      <LabMetrics metrics={currentResult.keyMetrics} />

                      <div className="space-y-12 pt-12 border-t border-stone-200">
                        <ResourceBreakdown resources={currentResult.resourceSummary} />
                        <MainThreadBreakdown items={currentResult.mainThreadWork} />
                      </div>

                      <div className="space-y-8 pt-12 border-t border-stone-200">
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
                            <div className="card p-12 text-center text-stone-600 italic">
                              {t('noCriticalities')}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "ai" && (
                    <>
                      <AEOScore result={aeoResult} />
                      {aeoResult ? (
                        <LLMsTxtGenerator
                          results={results}
                          llmsTxtScore={aeoResult.signals?.llmsTxt ?? 0}
                        />
                      ) : (
                        <LLMsTxtSkeleton />
                      )}
                      <SocialPreview
                        metadata={currentResult.seoMetadata}
                        url={currentResult.url}
                      />
                    </>
                  )}

                  {activeTab === "privacy" && (
                    <>
                      <AIBotPolicy result={botPolicyResult} />
                      <PrivacyScore result={privacyResult} />
                      <CarbonScore resourceSummary={currentResult.resourceSummary} />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <section
        className="w-full max-w-5xl mx-auto px-4 md:px-6 pb-4 relative z-10"
        aria-label={language === "it" ? "Domande frequenti" : "Frequently asked questions"}
      >
        <div className="border-t border-stone-100 pt-10 space-y-1">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-700 select-none">
              {language === "it" ? "Cosa analizza UXAbility" : "What UXAbility analyzes"}
            </h2>
            <p className="text-[11px] font-medium text-stone-500">
              {language === "it" ? "Aggiornato il " : "Updated on "}
              <time dateTime={LAST_UPDATED}>
                {new Date(LAST_UPDATED).toLocaleDateString(language === "it" ? "it-IT" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
              </time>
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 text-xs leading-relaxed text-stone-600 md:grid-cols-3">
            <p>
              {language === "it"
                ? "UXAbility e uno strumento di audit web che analizza qualsiasi URL da piu punti di vista: prestazioni, accessibilita, SEO tecnica, leggibilita per motori AI, privacy, impatto carbonico e policy dei crawler. Il report trasforma metriche tecniche in priorita operative, cosi ogni intervento e collegato a un impatto concreto."
                : "UXAbility is a web audit tool that analyzes any URL across performance, accessibility, technical SEO, AI readability, privacy, carbon impact, and crawler policy. The report turns technical metrics into operational priorities, so each suggested fix is tied to a concrete impact."}
            </p>
            <p>
              {language === "it"
                ? "L'AEO Score misura quanto una pagina e facile da comprendere, estrarre e citare per sistemi come ChatGPT, Perplexity e Google AI. La valutazione combina struttura HTML, dati Schema.org, FAQ, paragrafi citabili, definizioni, autorevolezza editoriale, link esterni e file llms.txt."
                : "The AEO Score measures how easy a page is to understand, extract, and cite for systems such as ChatGPT, Perplexity, and Google AI. The evaluation combines HTML structure, Schema.org data, FAQ content, citable paragraphs, definitions, editorial authority, outbound links, and llms.txt."}
            </p>
            <p>
              {language === "it"
                ? "La privacy score rileva tracker, script di terze parti e segnali di consenso, mentre la bot policy controlla se i crawler AI possono leggere il sito. Questi controlli aiutano a evitare un controsenso frequente: pagine veloci e ben indicizzate, ma poco chiare per utenti, motori di ricerca o sistemi di risposta AI."
                : "The privacy score detects trackers, third-party scripts, and consent signals, while the bot policy checks whether AI crawlers can read the site. These checks help avoid a common contradiction: pages that are fast and indexable, but unclear for users, search engines, or AI answer systems."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
            {[
              {
                title: language === "it" ? "Performance e Core Web Vitals" : "Performance & Core Web Vitals",
                body: language === "it"
                  ? "Lighthouse misura LCP, INP e CLS — le metriche che Google usa per il ranking. Un punteggio basso penalizza la visibilità organica."
                  : "Lighthouse measures LCP, INP and CLS — the metrics Google uses for ranking. A low score directly hurts organic visibility.",
              },
              {
                title: language === "it" ? "AEO — Answer Engine Optimization" : "AEO — Answer Engine Optimization",
                body: language === "it"
                  ? "L'AEO misura quanto una pagina è facile da citare per AI come ChatGPT, Perplexity e Google AI. Conta chiarezza semantica, definizioni e autorevolezza."
                  : "AEO measures how easy a page is to cite for AI like ChatGPT, Perplexity and Google AI. Semantic clarity, definitions, and authority matter most.",
              },
              {
                title: language === "it" ? "Privacy e tracker di terze parti" : "Privacy & third-party trackers",
                body: language === "it"
                  ? "Rileva script pubblicitari, analytics e pixel. Meno tracker significa meno rischi GDPR, più fiducia e caricamento più veloce."
                  : "Detects advertising scripts, analytics, and tracking pixels. Fewer trackers means less GDPR risk, more user trust, and faster loading.",
              },
              {
                title: language === "it" ? "Policy per i bot AI (robots.txt)" : "AI bot policy (robots.txt)",
                body: language === "it"
                  ? "Verifica se GPTBot, ClaudeBot e PerplexityBot possono indicizzare il sito. Un blocco implicito può escludere il sito dalle risposte AI."
                  : "Checks whether GPTBot, ClaudeBot and PerplexityBot can index the site. An implicit block can silently exclude the site from AI-generated answers.",
              },
            ].map(({ title, body }) => (
              <div key={title}>
                <h3 className="text-xs font-semibold text-stone-700 mb-1">{title}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-700 mb-4 select-none">
            {language === "it" ? "Domande frequenti" : "FAQ"}
          </h2>

          {[
            {
              q: language === "it" ? "Cos'è l'AEO (Answer Engine Optimization)?" : "What is AEO (Answer Engine Optimization)?",
              a: language === "it"
                ? "L'AEO misura quanto una pagina è facile da comprendere, estrarre e citare per motori di risposta AI come ChatGPT, Perplexity e Google AI. Valuta chiarezza semantica, definizioni, struttura e autorevolezza."
                : "AEO measures how easy a page is to understand, extract, and cite for AI answer engines like ChatGPT, Perplexity and Google AI. It evaluates semantic clarity, definitions, structure, and authority.",
            },
            {
              q: language === "it" ? "Cos'è il file llms.txt?" : "What is a llms.txt file?",
              a: language === "it"
                ? "llms.txt è un file di testo in chiaro nella root del sito che fornisce un riassunto conciso per i modelli linguistici AI. Aiuta i sistemi AI a comprendere e citare accuratamente il sito ed è un segnale di autorità nel punteggio AEO."
                : "llms.txt is a plain-text file at the site root that provides a concise summary for AI language models. It helps AI systems accurately understand and cite the site, and counts as an authority signal in the AEO score.",
            },
            {
              q: language === "it" ? "Come viene calcolato il carbon footprint?" : "How is carbon footprint calculated?",
              a: language === "it"
                ? "La stima si basa sul peso trasferito della pagina: (byte / 1 GB) × 0,8 kWh/GB × 442 g CO₂/kWh. Ridurre immagini, script e richieste inutili abbassa direttamente l'impatto per visita."
                : "The estimate is based on transferred page weight: (bytes / 1 GB) × 0.8 kWh/GB × 442 g CO₂/kWh. Reducing images, scripts, and unnecessary requests directly lowers the impact per visit.",
            },
            {
              q: language === "it" ? "UXAbility è gratuito?" : "Is UXAbility free?",
              a: language === "it"
                ? "Sì. UXAbility è gratuito, senza account. Inserisci qualsiasi URL per ottenere un report completo su performance, accessibilità, SEO, AEO, privacy, carbon footprint e policy dei bot AI."
                : "Yes. UXAbility is free with no account required. Enter any URL for a full report on performance, accessibility, SEO, AEO score, privacy, carbon footprint, and AI bot policy.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group border-b border-stone-200 last:border-0">
              <summary className="flex items-center justify-between gap-4 py-3 cursor-pointer list-none text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors select-none">
                <span>{q}</span>
                <span className="shrink-0 text-stone-600 group-open:rotate-45 transition-transform duration-200 text-base leading-none">+</span>
              </summary>
              <p className="pb-3 text-xs text-stone-600 leading-relaxed max-w-2xl">{a}</p>
            </details>
          ))}

          <p className="pt-4 text-xs text-stone-600 leading-relaxed">
            {language === "it" ? "Standard di riferimento: " : "Built on: "}
            <a href="https://web.dev/explore/learn-core-web-vitals" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-800 transition-colors">Core Web Vitals</a>
            {" · "}
            <a href="https://schema.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-800 transition-colors">Schema.org</a>
            {" · "}
            <a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-800 transition-colors">WAI-ARIA</a>
            {" · "}
            <a href="https://www.w3.org/TR/WCAG21/" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-800 transition-colors">WCAG 2.1</a>
            {" · "}
            <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-800 transition-colors">llmstxt.org</a>
          </p>
        </div>
      </section>

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
