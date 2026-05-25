"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Accessibility,
  Bot,
  ChevronDown,
  Code2,
  Gauge,
  Leaf,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import {
  type AEOAnalysisResult,
  type AnalysisResult,
  buildFixSuggestions,
  type FixCategory,
  type FixEffort,
  type FixPriority,
  type FixSuggestion,
  type PrivacyAnalysisResult,
} from "@/lib/fixSuggestions";
import { useLanguage } from "@/context/LanguageContext";

interface FixPlanProps {
  result: AnalysisResult;
  aeoResult: AEOAnalysisResult | null;
  privacyResult: PrivacyAnalysisResult | null;
}

const categoryMeta: Record<FixCategory, { icon: ElementType; color: string; bg: string }> = {
  performance: { icon: Gauge, color: "#3f6f8f", bg: "#deebf0" },
  seo: { icon: SearchCheck, color: "#0f8f68", bg: "#dff3ea" },
  accessibility: { icon: Accessibility, color: "#201c18", bg: "#eee7dc" },
  aeo: { icon: Bot, color: "#7556a4", bg: "#ede7f6" },
  privacy: { icon: ShieldCheck, color: "#bd3150", bg: "#f4dde3" },
  carbon: { icon: Leaf, color: "#2f9f78", bg: "#dff3ea" },
};

const priorityColor: Record<FixPriority, string> = {
  critical: "#bd3150",
  high: "#b7791f",
  medium: "#3f6f8f",
  low: "#756d64",
};

function gainLabel(fix: FixSuggestion) {
  return Object.entries(fix.estimatedGain)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([key, value]) => `+${value} ${key}`)
    .slice(0, 3)
    .join(" / ");
}

function effortDots(effort: FixEffort) {
  const count = effort === "easy" ? 1 : effort === "medium" ? 2 : 3;
  return [0, 1, 2].map((index) => (
    <span
      key={index}
      className={`h-1.5 w-1.5 rounded-full ${index < count ? "bg-stone-800" : "bg-stone-300"}`}
    />
  ));
}

function FixCard({
  fix,
  index,
  labels,
}: {
  fix: FixSuggestion;
  index: number;
  labels: ReturnType<typeof getLabels>;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const meta = categoryMeta[fix.category];
  const Icon = meta.icon;
  const gain = gainLabel(fix);
  const priority = labels.priority[fix.priority];
  const effort = labels.effort[fix.effort];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border border-stone-900/12 bg-white/45 p-4 shadow-[0_14px_34px_rgba(32,28,24,0.06)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
          style={{ backgroundColor: meta.bg, borderColor: `${meta.color}35`, color: meta.color }}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-label text-stone-400">{labels.category[fix.category]}</span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                  style={{
                    color: priorityColor[fix.priority],
                    borderColor: `${priorityColor[fix.priority]}35`,
                    backgroundColor: `${priorityColor[fix.priority]}12`,
                  }}
                >
                  {priority}
                </span>
              </div>
              <h4 className="mt-1 text-base font-black leading-tight text-stone-900 md:text-lg">
                {fix.title}
              </h4>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-stone-50 px-2.5 py-1 font-bold text-stone-700">
                <Target size={12} />
                {fix.impactScore}/100
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-stone-50 px-2.5 py-1 font-bold text-stone-700">
                <span className="flex gap-0.5">{effortDots(fix.effort)}</span>
                {effort}
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-stone-600">{fix.problem}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-sm font-semibold leading-relaxed text-stone-800">{fix.recommendation}</p>
            {gain && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">
                <Zap size={12} />
                {gain}
              </span>
            )}
          </div>

          {(fix.implementation || fix.source) && (
            <>
              <button
                onClick={() => setExpanded((value) => !value)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 transition-colors hover:text-stone-800"
              >
                {expanded ? labels.hideDetails : labels.showDetails}
                <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                  <ChevronDown size={14} />
                </motion.span>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-lg border border-stone-900/10 bg-stone-50/80 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400">
                          <Code2 size={12} />
                          {labels.implementation}
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">{fix.source}</span>
                      </div>
                      <p className="break-words font-mono text-[11px] leading-relaxed text-stone-600">
                        {fix.implementation || labels.noImplementation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function getLabels(language: "it" | "en") {
  return language === "it"
    ? {
        title: "Fix Plan",
        subtitle: "Azioni ordinate per impatto, facilita e confidenza. Parti dalle prime: sono quelle con il miglior rapporto sforzo/risultato.",
        topMove: "Mossa consigliata",
        empty: "Nessun fix prioritario rilevato dai dati disponibili.",
        showDetails: "Mostra implementazione",
        hideDetails: "Nascondi implementazione",
        implementation: "Come intervenire",
        noImplementation: "Usa questa card come brief operativo per il team tecnico.",
        category: {
          performance: "Performance",
          seo: "SEO",
          accessibility: "Accessibilita",
          aeo: "AEO",
          privacy: "Privacy",
          carbon: "Carbon",
        },
        priority: {
          critical: "Critica",
          high: "Alta",
          medium: "Media",
          low: "Bassa",
        },
        effort: {
          easy: "Easy",
          medium: "Medium",
          hard: "Hard",
        },
      }
    : {
        title: "Fix Plan",
        subtitle: "Actions ranked by impact, ease, and confidence. Start from the first ones: they have the best effort/result ratio.",
        topMove: "Recommended move",
        empty: "No priority fixes detected from the available data.",
        showDetails: "Show implementation",
        hideDetails: "Hide implementation",
        implementation: "How to fix",
        noImplementation: "Use this card as an operating brief for the technical team.",
        category: {
          performance: "Performance",
          seo: "SEO",
          accessibility: "Accessibility",
          aeo: "AEO",
          privacy: "Privacy",
          carbon: "Carbon",
        },
        priority: {
          critical: "Critical",
          high: "High",
          medium: "Medium",
          low: "Low",
        },
        effort: {
          easy: "Easy",
          medium: "Medium",
          hard: "Hard",
        },
      };
}

export default function FixPlan({ result, aeoResult, privacyResult }: FixPlanProps) {
  const { language } = useLanguage();
  const labels = getLabels(language);
  const suggestions = useMemo(
    () => buildFixSuggestions({ result, aeoResult, privacyResult, language }),
    [result, aeoResult, privacyResult, language],
  );
  const topFix = suggestions[0];

  if (!suggestions.length) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg icon-tile">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-800">{labels.title}</h3>
            <p className="text-sm text-stone-500">{labels.empty}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg icon-tile">
            <Wrench className="h-5 w-5 text-stone-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-800 md:text-2xl">{labels.title}</h3>
            <p className="max-w-2xl text-sm leading-relaxed text-stone-500">{labels.subtitle}</p>
          </div>
        </div>
        {topFix && (
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white/50 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-stone-600">
            <Sparkles size={13} />
            {labels.topMove}: {topFix.title}
          </div>
        )}
      </div>

      <div className="card p-3 md:p-4">
        <div className="space-y-3">
          {suggestions.map((fix, index) => (
            <FixCard key={fix.id} fix={fix} index={index} labels={labels} />
          ))}
        </div>
      </div>
    </section>
  );
}
