"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Megaphone, BarChart3, Wrench, Cookie } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Tracker {
  name: string;
  category: string;
  domain: string;
}

interface PrivacyResult {
  privacyScore: number;
  grade: string;
  trackers: Tracker[];
  thirdPartyDomains: number;
  consentDetected: boolean;
  adCount: number;
  analyticsCount: number;
  functionalCount: number;
  error?: string;
}

interface PrivacyScoreProps {
  result: PrivacyResult | null;
}

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  advertising: { icon: Megaphone,  color: "#f43f5e", bg: "#f43f5e15" },
  analytics:   { icon: BarChart3,  color: "#fbbf24", bg: "#fbbf2415" },
  functional:  { icon: Wrench,     color: "#60a5fa", bg: "#60a5fa15" },
  consent:     { icon: Cookie,     color: "#10b981", bg: "#10b98115" },
  cdn:         { icon: CheckCircle2, color: "#6b7280", bg: "#6b728015" },
};

function gradeColor(grade: string) {
  return { A: "#10b981", B: "#34d399", C: "#fbbf24", D: "#f97316", F: "#f43f5e" }[grade] ?? "#6b7280";
}

export default function PrivacyScore({ result }: PrivacyScoreProps) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const { privacyScore, grade, trackers, thirdPartyDomains, consentDetected, adCount, analyticsCount, functionalCount } = result;
  const color = gradeColor(grade);
  const bg = `${color}15`;

  const isFetchFailed = result.error === "fetch_failed";

  // Group trackers by category (exclude cdn from display)
  const grouped = trackers
    .filter((t) => t.category !== "cdn")
    .reduce<Record<string, Tracker[]>>((acc, t) => {
      acc[t.category] = acc[t.category] || [];
      acc[t.category].push(t);
      return acc;
    }, {});

  const displayedTrackers = trackers.filter((t) => t.category !== "cdn");
  const barPercent = privacyScore;

  const categoryLabel = (cat: string) => ({
    advertising: language === "it" ? "Pubblicità" : "Advertising",
    analytics:   language === "it" ? "Analytics" : "Analytics",
    functional:  language === "it" ? "Funzionali" : "Functional",
    consent:     language === "it" ? "Consenso" : "Consent",
    cdn:         "CDN",
  }[cat] ?? cat);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-6 md:p-8 relative overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{ background: bg }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10" style={{ color }}>
          {grade === "F" || grade === "D" ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{t("privacyTitle")}</h3>
          <p className="text-sm text-slate-400">{t("privacySubtitle")}</p>
        </div>
        <span
          className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full border"
          style={{ color, borderColor: `${color}50`, background: bg }}
        >
          NEW
        </span>
      </div>

      {isFetchFailed && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          <AlertTriangle size={12} className="inline mr-1.5" />
          {t("privacyFetchFailed")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grade card */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.03] gap-1">
          {/* Circular SVG */}
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff08" strokeWidth="10" />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - barPercent / 100) }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color }}>{grade}</span>
              <span className="text-xs text-slate-400">{privacyScore}/100</span>
            </div>
          </div>

          {/* Consent badge */}
          <div className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            consentDetected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 bg-white/5 text-slate-500"
          }`}>
            <Cookie size={11} />
            {consentDetected ? t("privacyConsentYes") : t("privacyConsentNo")}
          </div>

          <div className="text-xs text-slate-500 mt-2 text-center">
            {thirdPartyDomains} {t("privacyThirdParty")}
          </div>
        </div>

        {/* Tracker breakdown */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Summary pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: language === "it" ? "Pubblicità" : "Advertising", count: adCount, cat: "advertising" },
              { label: "Analytics", count: analyticsCount, cat: "analytics" },
              { label: language === "it" ? "Funzionali" : "Functional", count: functionalCount, cat: "functional" },
            ].map(({ label, count, cat }) => {
              const meta = CATEGORY_META[cat];
              return (
                <div
                  key={cat}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
                  style={{
                    color: count > 0 ? meta.color : "#6b7280",
                    borderColor: count > 0 ? `${meta.color}40` : "#6b728030",
                    background: count > 0 ? meta.bg : "#6b728008",
                  }}
                >
                  <meta.icon size={11} />
                  {count} {label}
                </div>
              );
            })}
          </div>

          {/* Score bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{t("privacyScoreLabel")}</span>
              <span style={{ color }}>{privacyScore}/100</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${color}80, ${color})` }}
              />
            </div>
          </div>

          {/* No trackers message or expand button */}
          {displayedTrackers.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
              <CheckCircle2 size={16} />
              {t("privacyNoTrackers")}
            </div>
          ) : (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors self-start"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? t("privacyHideTrackers") : t("privacyShowTrackers", displayedTrackers.length)}
            </button>
          )}

          <AnimatePresence>
            {expanded && displayedTrackers.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
                  {Object.entries(grouped).map(([cat, items]) => {
                    const meta = CATEGORY_META[cat] ?? CATEGORY_META.functional;
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: meta.color }}>
                          <meta.icon size={11} />
                          {categoryLabel(cat)}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((tracker) => (
                            <span
                              key={tracker.domain}
                              className="px-2 py-0.5 rounded text-[10px] font-mono border"
                              style={{ borderColor: `${meta.color}30`, background: meta.bg, color: meta.color }}
                            >
                              {tracker.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-slate-600 leading-relaxed">{t("privacyTip")}</p>
        </div>
      </div>
    </motion.div>
  );
}
