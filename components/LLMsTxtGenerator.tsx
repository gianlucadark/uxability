"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileCode, Download, Copy, CheckCheck, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface PageResult {
    url: string;
    seoMetadata: {
        title: string;
        description: string;
    };
}

interface LLMsTxtGeneratorProps {
    results: PageResult[];
    llmsTxtScore: number;
}

function truncateAtWord(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.lastIndexOf(" ", max);
    return (cut > 0 ? text.slice(0, cut) : text.slice(0, max)) + "…";
}

function pageLabel(res: PageResult, siteName: string): string {
    try {
        const segments = new URL(res.url).pathname.split("/").filter(Boolean);
        if (segments.length === 0) return "Home";

        // Prefer the page-specific part of the <title> (strip site name)
        if (res.seoMetadata.title) {
            const parts = res.seoMetadata.title.split(/\s*[-|·—\/]\s*/);
            const specific = parts.find(
                p => p.trim().toLowerCase() !== siteName.toLowerCase() && p.trim().length > 1
            );
            if (specific) return specific.trim();
        }

        // Fallback: prettify slug
        return segments[segments.length - 1]
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    } catch {
        return "Page";
    }
}

function formatLink(res: PageResult, siteName: string): string {
    const label = pageLabel(res, siteName);
    const desc = res.seoMetadata.description
        ? `: ${truncateAtWord(res.seoMetadata.description, 150)}`
        : "";
    return `- [${label}](${res.url})${desc}`;
}

function buildFileContent(results: PageResult[]): string {
    if (!results || results.length === 0) return "";

    const main = results[0];
    const hostname = (() => {
        try {
            return new URL(main.url).hostname.replace(/^www\./, "").split(".")[0];
        } catch { return main.url; }
    })();

    const siteName = main.seoMetadata.title
        ? main.seoMetadata.title.split(/\s*[-|·—\/]\s*/)[0].trim()
        : hostname;

    const siteDesc = main.seoMetadata.description || "";
    const lines: string[] = [`# ${siteName}`];
    if (siteDesc) lines.push("", `> ${siteDesc}`);

    // With few pages keep everything in ## Pages.
    // With many pages, depth-2+ go in ## Optional so LLMs can skip them if context is short.
    const useSplit = results.length > 4;
    const main_pages: PageResult[] = [];
    const optional: PageResult[] = [];

    for (const res of results) {
        try {
            const depth = new URL(res.url).pathname.split("/").filter(Boolean).length;
            (useSplit && depth >= 2 ? optional : main_pages).push(res);
        } catch {
            main_pages.push(res);
        }
    }

    lines.push("", "## Pages", "");
    for (let i = 0; i < main_pages.length; i++) {
        const res = main_pages[i];
        // Omit description for homepage if it duplicates the site-level blockquote
        const isHomepage = i === 0 && (() => {
            try { return new URL(res.url).pathname === "/"; } catch { return false; }
        })();
        const descSameAsSiteDesc = isHomepage && siteDesc &&
            res.seoMetadata.description?.slice(0, 60) === siteDesc.slice(0, 60);
        if (descSameAsSiteDesc) {
            lines.push(`- [Home](${res.url})`);
        } else {
            lines.push(formatLink(res, siteName));
        }
    }

    if (optional.length > 0) {
        lines.push("", "## Optional", "");
        for (const res of optional) lines.push(formatLink(res, siteName));
    }

    return lines.join("\n");
}

export default function LLMsTxtGenerator({ results, llmsTxtScore }: LLMsTxtGeneratorProps) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const fileContent = useMemo(() => buildFileContent(results), [results]);
    const hasFile = llmsTxtScore >= 100;

    const handleDownload = () => {
        const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "llms.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(fileContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg icon-tile">
                        <FileCode className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                                {t("llmsTxtTitle")}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-stone-900/8 text-stone-700 border border-stone-900/15">
                                NEW
                            </span>
                        </div>
                        <p className="text-stone-600 text-sm">{t("llmsTxtSubtitle")}</p>
                    </div>
                </div>
            </div>

            {/* Intro explainer */}
            <div className="p-4 rounded-xl premium-surface space-y-2">
                <p className="text-stone-600 text-sm leading-relaxed">{t("llmsTxtWhatIsBody")}</p>
                <p className="text-stone-500 text-xs leading-relaxed italic">{t("llmsTxtWhatIsNote")}</p>
            </div>

            {/* Current status */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                    hasFile
                        ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-800"
                        : "bg-amber-500/8 border-amber-500/25 text-amber-800"
                }`}
            >
                {hasFile
                    ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    : <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                }
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {hasFile ? t("llmsTxtPresent") : t("llmsTxtNotPresent")}
                    </span>
                    <p className="text-xs mt-1 leading-relaxed opacity-80">
                        {hasFile ? t("llmsTxtPresentDesc") : t("llmsTxtNotPresentDesc")}
                    </p>
                </div>
            </motion.div>

            {/* Generator card */}
            <div className="relative">
                <div className="absolute -inset-1 rounded-2xl opacity-10 blur-xl bg-stone-900" />
                <div className="relative premium-surface rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h4 className="text-base font-bold text-stone-900">{t("llmsTxtGeneratorTitle")}</h4>
                            <p className="text-xs text-stone-500 mt-0.5">{t("llmsTxtGeneratorSubtitle")}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg premium-surface hover:border-stone-400 transition-all text-xs font-semibold text-stone-700"
                            >
                                {copied
                                    ? <CheckCheck size={13} className="text-emerald-600" />
                                    : <Copy size={13} />
                                }
                                {copied ? t("llmsTxtCopied") : t("llmsTxtCopy")}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-xs font-semibold"
                            >
                                <Download size={13} />
                                {t("llmsTxtDownload")}
                            </button>
                        </div>
                    </div>

                    <pre className="bg-stone-950 text-stone-300 text-xs leading-relaxed rounded-xl p-4 overflow-x-auto font-mono whitespace-pre-wrap border border-stone-800">
                        {fileContent}
                    </pre>

                    <div className="flex items-start gap-2 text-xs text-stone-500 p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>{t("llmsTxtDeployHint")}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
