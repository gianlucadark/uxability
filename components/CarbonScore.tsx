"use client";

import { motion } from "framer-motion";
import { Leaf, Wind, TreePine } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface CarbonScoreProps {
  resourceSummary: any[];
}

function getGrade(g: number) {
  if (g < 0.5) return { grade: "A+", color: "#10b981", bg: "#10b98115", label_it: "Eccellente", label_en: "Excellent" };
  if (g < 1.0) return { grade: "A",  color: "#34d399", bg: "#34d39915", label_it: "Ottimo",     label_en: "Great" };
  if (g < 2.0) return { grade: "B",  color: "#fbbf24", bg: "#fbbf2415", label_it: "Buono",      label_en: "Good" };
  if (g < 4.0) return { grade: "C",  color: "#f97316", bg: "#f9731615", label_it: "Medio",      label_en: "Average" };
  if (g < 6.0) return { grade: "D",  color: "#ef4444", bg: "#ef444415", label_it: "Scarso",     label_en: "Poor" };
  return         { grade: "F",  color: "#dc2626", bg: "#dc262615", label_it: "Critico",    label_en: "Critical" };
}

export default function CarbonScore({ resourceSummary }: CarbonScoreProps) {
  const { t, language } = useLanguage();

  const total = resourceSummary.find((r) => r.resourceType === "total");
  const bytes = total?.transferSize || 0;

  // Sustainable Web Design model: 0.8 kWh/GB × 442 g CO₂/kWh
  const grams = (bytes / 1_073_741_824) * 0.8 * 442;

  // Annual CO₂ for 10,000 visitors/month
  const annualGrams = grams * 10_000 * 12;

  // Average tree absorbs ~21 kg CO₂/year → 57.5 g/day
  const treeDays = annualGrams / (21_000 / 365);

  const { grade, color, bg, label_it, label_en } = getGrade(grams);
  const label = language === "it" ? label_it : label_en;

  // Bar: 0-6g mapped to 0-100%
  const barPercent = Math.min((grams / 6) * 100, 100);
  const avgMarker = (2.1 / 6) * 100;

  const pageSizeKB = bytes / 1024;
  const pageSizeDisplay = pageSizeKB > 1024
    ? `${(pageSizeKB / 1024).toFixed(2)} MB`
    : `${Math.round(pageSizeKB)} KB`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-6 md:p-8 relative overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{ background: bg }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10" style={{ color }}>
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{t("carbonTitle")}</h3>
          <p className="text-sm text-slate-400">{t("carbonSubtitle")}</p>
        </div>
        <span
          className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full border"
          style={{ color, borderColor: `${color}50`, background: bg }}
        >
          NEW
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grade card */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.03] gap-1">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="text-6xl font-black leading-none"
            style={{ color }}
          >
            {grade}
          </motion.div>
          <div className="text-sm font-semibold text-slate-300 mt-1">{label}</div>
          <div className="mt-3 text-center">
            <div className="text-2xl font-bold text-white">{grams.toFixed(2)}g</div>
            <div className="text-xs text-slate-500 mt-0.5">{t("carbonPerVisit")}</div>
          </div>
          <div className="mt-2 text-xs text-slate-600">{pageSizeDisplay} {t("carbonTransferred")}</div>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 flex flex-col gap-4 justify-center">
          {/* Bar vs average */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{t("carbonYourSite")}: <strong className="text-white">{grams.toFixed(2)}g</strong></span>
              <span>{t("carbonAverage")}: 2.1g</span>
            </div>
            <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${color}80, ${color})` }}
              />
              {/* Average marker */}
              <div
                className="absolute top-0 h-full w-[2px] bg-white/40"
                style={{ left: `${avgMarker}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-600 mt-1" style={{ marginLeft: `${avgMarker}%` }}>
              ↑ avg
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5">
                <Wind size={11} />
                <span>{t("carbonAnnual")}</span>
              </div>
              <div className="text-lg font-bold text-white">
                {annualGrams > 1000
                  ? `${(annualGrams / 1000).toFixed(1)} kg`
                  : `${Math.round(annualGrams)} g`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t("carbonAnnualSub")}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5">
                <TreePine size={11} />
                <span>{t("carbonTrees")}</span>
              </div>
              <div className="text-lg font-bold text-white">{Math.ceil(treeDays)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t("carbonTreesSub")}</div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{t("carbonTip")}</p>
        </div>
      </div>
    </motion.div>
  );
}
