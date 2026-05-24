"use client";

import { motion } from "framer-motion";
import { Leaf, Wind, TreePine } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface CarbonScoreProps {
  resourceSummary: any[];
}

function getGrade(g: number) {
  if (g < 0.5) return { grade: "A+", color: "#0f8f68", bg: "#dff3ea", label_it: "Eccellente", label_en: "Excellent" };
  if (g < 1.0) return { grade: "A",  color: "#2f9f78", bg: "#dff3ea", label_it: "Ottimo",     label_en: "Great" };
  if (g < 2.0) return { grade: "B",  color: "#b7791f", bg: "#f6ead2", label_it: "Buono",      label_en: "Good" };
  if (g < 4.0) return { grade: "C",  color: "#a66b22", bg: "#f6ead2", label_it: "Medio",      label_en: "Average" };
  if (g < 6.0) return { grade: "D",  color: "#bd3150", bg: "#f4dde3", label_it: "Scarso",     label_en: "Poor" };
  return         { grade: "F",  color: "#9f2944", bg: "#f4dde3", label_it: "Critico",    label_en: "Critical" };
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
      className="card p-4 md:p-5 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg icon-tile" style={{ color }}>
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-stone-900">{t("carbonTitle")}</h3>
          <p className="text-sm leading-snug text-stone-600">{t("carbonSubtitle")}</p>
        </div>
        <span
          className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full border"
          style={{ color, borderColor: `${color}50`, background: bg }}
        >
          NEW
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-4 items-start">
        {/* Grade card */}
        <div className="flex w-full flex-col items-center p-3 md:p-4 rounded-xl premium-surface gap-0.5 self-start">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="text-5xl md:text-6xl font-black leading-none"
            style={{ color }}
          >
            {grade}
          </motion.div>
          <div className="text-sm font-semibold text-stone-500 mt-1">{label}</div>
          <div className="mt-1.5 text-center">
            <div className="text-2xl font-bold text-stone-900">{grams.toFixed(2)}g</div>
            <div className="text-xs text-stone-400 mt-0.5">{t("carbonPerVisit")}</div>
          </div>
          <div className="mt-1 text-xs text-stone-300">{pageSizeDisplay} {t("carbonTransferred")}</div>
        </div>

        {/* Stats */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Bar vs average */}
          <div>
            <div className="flex justify-between text-xs text-stone-400 mb-2">
              <span>{t("carbonYourSite")}: <strong className="text-stone-800">{grams.toFixed(2)}g</strong></span>
              <span>{t("carbonAverage")}: 2.1g</span>
            </div>
            <div className="relative h-3 bg-stone-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${color}80, ${color})` }}
              />
              {/* Average marker */}
              <div
                className="absolute top-0 h-full w-[2px] bg-stone-400/60"
                style={{ left: `${avgMarker}%` }}
              />
            </div>
            <div className="text-[10px] text-stone-500 mt-1" style={{ marginLeft: `${avgMarker}%` }}>
              ↑ avg
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 md:p-4 rounded-xl premium-surface">
              <div className="flex items-center gap-1.5 text-stone-400 text-xs mb-1.5">
                <Wind size={11} />
                <span>{t("carbonAnnual")}</span>
              </div>
              <div className="text-lg font-bold text-stone-900">
                {annualGrams > 1000
                  ? `${(annualGrams / 1000).toFixed(1)} kg`
                  : `${Math.round(annualGrams)} g`}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">{t("carbonAnnualSub")}</div>
            </div>
            <div className="p-3 md:p-4 rounded-xl premium-surface">
              <div className="flex items-center gap-1.5 text-stone-400 text-xs mb-1.5">
                <TreePine size={11} />
                <span>{t("carbonTrees")}</span>
              </div>
              <div className="text-lg font-bold text-stone-900">{Math.ceil(treeDays)}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">{t("carbonTreesSub")}</div>
            </div>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">{t("carbonTip")}</p>
        </div>
      </div>
    </motion.div>
  );
}
