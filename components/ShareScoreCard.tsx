"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Linkedin, Share2, Sparkles, Twitter } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SITE_URL } from "@/lib/site";

type Scores = {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
};

type ShareScoreCardProps = {
    scores: Scores;
    aeoScore: number;
    analyzedUrl: string;
};

const W = 1200;
const H = 630;
const SHARE_URL = SITE_URL;

function clamp(n: number) {
    return Math.max(0, Math.min(100, Math.round(n || 0)));
}

function scoreColor(n: number) {
    if (n >= 80) return "#0f8f68";
    if (n >= 50) return "#b7791f";
    return "#bd3150";
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, font: string) {
    ctx.font = font;
    let value = text;
    while (ctx.measureText(value).width > maxWidth && value.length > 4) {
        value = `${value.slice(0, -4)}...`;
    }
    ctx.fillText(value, x, y);
}

export default function ShareScoreCard({ scores, aeoScore, analyzedUrl }: ShareScoreCardProps) {
    const { language } = useLanguage();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [generated, setGenerated] = useState(false);
    const [generating, setGenerating] = useState(false);

    const hostname = useMemo(() => {
        try {
            return new URL(analyzedUrl).hostname;
        } catch {
            return analyzedUrl;
        }
    }, [analyzedUrl]);

    const s = useMemo(() => ({
        performance: clamp(scores.performance),
        accessibility: clamp(scores.accessibility),
        bestPractices: clamp(scores.bestPractices),
        seo: clamp(scores.seo),
    }), [scores]);

    const aeo = clamp(aeoScore);
    const globalScore = Math.round((s.performance + s.accessibility + s.bestPractices + s.seo + aeo) / 5);

    const shareText = language === "it"
        ? `Ho analizzato ${hostname} su UXAbility: score globale ${globalScore}/100, performance, SEO e AI readiness. Analizza il tuo su ${new URL(SHARE_URL).hostname}`
        : `I audited ${hostname} on UXAbility: global score ${globalScore}/100, performance, SEO and AI readiness. Analyze yours on ${new URL(SHARE_URL).hostname}`;

    useEffect(() => () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
    }, [imageUrl]);

    const generateImage = async () => {
        setGenerating(true);
        await new Promise((resolve) => setTimeout(resolve, 30));

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setGenerating(false);
            return;
        }

        ctx.fillStyle = "#f6f1e8";
        ctx.fillRect(0, 0, W, H);

        const pageGlow = ctx.createRadialGradient(970, 90, 0, 970, 90, 560);
        pageGlow.addColorStop(0, "rgba(212,185,140,0.55)");
        pageGlow.addColorStop(0.5, "rgba(234,216,181,0.20)");
        pageGlow.addColorStop(1, "rgba(246,241,232,0)");
        ctx.fillStyle = pageGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(32,28,24,0.035)";
        for (let x = 42; x < W; x += 42) ctx.fillRect(x, 0, 1, H);
        for (let y = 42; y < H; y += 42) ctx.fillRect(0, y, W, 1);

        ctx.shadowColor = "rgba(32,28,24,0.22)";
        ctx.shadowBlur = 44;
        ctx.shadowOffsetY = 24;
        ctx.fillStyle = "#151311";
        rr(ctx, 48, 44, 1104, 542, 32);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const panel = ctx.createLinearGradient(48, 44, 1152, 586);
        panel.addColorStop(0, "#2b261f");
        panel.addColorStop(0.58, "#191612");
        panel.addColorStop(1, "#0f0d0b");
        ctx.fillStyle = panel;
        rr(ctx, 48, 44, 1104, 542, 32);
        ctx.fill();

        ctx.strokeStyle = "rgba(234,216,181,0.18)";
        ctx.lineWidth = 1;
        rr(ctx, 66, 62, 1068, 506, 24);
        ctx.stroke();

        ctx.fillStyle = "rgba(212,185,140,0.10)";
        rr(ctx, 780, 118, 296, 230, 28);
        ctx.fill();
        ctx.strokeStyle = "rgba(212,185,140,0.24)";
        rr(ctx, 780, 118, 296, 230, 28);
        ctx.stroke();

        ctx.fillStyle = "#d4b98c";
        rr(ctx, 88, 84, 40, 40, 10);
        ctx.fill();
        ctx.fillStyle = "#201c18";
        ctx.font = "900 18px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("UX", 108, 110);

        ctx.textAlign = "left";
        ctx.fillStyle = "#fffaf1";
        ctx.font = "900 25px Arial, sans-serif";
        ctx.fillText("UXABILITY", 144, 105);
        ctx.fillStyle = "rgba(234,216,181,0.62)";
        ctx.font = "700 12px Arial, sans-serif";
        ctx.fillText("GLOBAL WEBSITE AUDIT", 144, 126);

        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,250,241,0.62)";
        fitText(ctx, hostname, W - 88, 109, 360, "600 21px Arial, sans-serif");

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(234,216,181,0.75)";
        ctx.font = "800 14px Arial, sans-serif";
        ctx.fillText(language === "it" ? "SCORECARD PUBBLICA" : "PUBLIC SCORECARD", 88, 184);

        ctx.fillStyle = "#fffaf1";
        ctx.font = "900 64px Arial, sans-serif";
        ctx.fillText(language === "it" ? "Audit globale" : "Global audit", 88, 252);

        ctx.fillStyle = "rgba(255,250,241,0.58)";
        ctx.font = "500 24px Arial, sans-serif";
        ctx.fillText(
            language === "it"
                ? "Una vista sintetica della salute del sito."
                : "A concise view of your website health.",
            88,
            294
        );

        ctx.fillStyle = "rgba(255,250,241,0.38)";
        ctx.font = "500 18px Arial, sans-serif";
        ctx.fillText(
            language === "it"
                ? "Performance, accessibilita, best practice, SEO e AI readiness."
                : "Performance, accessibility, best practices, SEO and AI readiness.",
            88,
            330
        );

        const globalColor = scoreColor(globalScore);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(234,216,181,0.76)";
        ctx.font = "800 15px Arial, sans-serif";
        ctx.fillText(language === "it" ? "SCORE GLOBALE" : "GLOBAL SCORE", 928, 162);
        ctx.fillStyle = globalColor;
        ctx.font = "900 108px Arial, sans-serif";
        ctx.fillText(String(globalScore), 928, 262);
        ctx.fillStyle = "rgba(255,250,241,0.45)";
        ctx.font = "700 23px Arial, sans-serif";
        ctx.fillText("/100", 928, 304);

        ctx.fillStyle = "rgba(255,250,241,0.09)";
        rr(ctx, 852, 320, 152, 34, 17);
        ctx.fill();
        ctx.fillStyle = "rgba(255,250,241,0.68)";
        ctx.font = "700 14px Arial, sans-serif";
        ctx.fillText(new URL(SHARE_URL).hostname, 928, 342);

        const metrics = [
            { label: "PERF", value: s.performance },
            { label: "ACCESS", value: s.accessibility },
            { label: "BEST", value: s.bestPractices },
            { label: "SEO", value: s.seo },
            { label: "AEO", value: aeo },
        ];

        const cardW = 196;
        const cardH = 118;
        const gap = 14;
        const startX = 88;
        const y = 420;

        metrics.forEach((metric, index) => {
            const x = startX + index * (cardW + gap);
            const color = scoreColor(metric.value);

            ctx.fillStyle = "rgba(255,250,241,0.075)";
            rr(ctx, x, y, cardW, cardH, 18);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,250,241,0.12)";
            ctx.lineWidth = 1;
            rr(ctx, x, y, cardW, cardH, 18);
            ctx.stroke();

            ctx.fillStyle = color;
            rr(ctx, x + 18, y + 22, 5, 32, 3);
            ctx.fill();

            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(234,216,181,0.78)";
            ctx.font = "900 13px Arial, sans-serif";
            ctx.fillText(metric.label, x + 34, y + 42);

            ctx.textAlign = "right";
            ctx.fillStyle = color;
            ctx.font = "900 46px Arial, sans-serif";
            ctx.fillText(String(metric.value), x + cardW - 22, y + 63);

            const barX = x + 34;
            const barY = y + 88;
            const barW = cardW - 68;
            ctx.fillStyle = "rgba(255,250,241,0.12)";
            rr(ctx, barX, barY, barW, 6, 3);
            ctx.fill();
            ctx.fillStyle = color;
            rr(ctx, barX, barY, barW * (metric.value / 100), 6, 3);
            ctx.fill();
        });

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255,250,241,0.34)";
        ctx.font = "600 13px Arial, sans-serif";
        ctx.fillText(language === "it" ? "Condivisibile su LinkedIn e X" : "Ready to share on LinkedIn and X", 88, 560);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
        if (!blob) {
            setGenerating(false);
            return;
        }

        if (imageUrl) URL.revokeObjectURL(imageUrl);
        setImageBlob(blob);
        setImageUrl(URL.createObjectURL(blob));
        setGenerated(true);
        setGenerating(false);
    };

    const download = () => {
        if (!imageUrl) return;
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `uxability-${hostname.replace(/[^a-z0-9.-]/gi, "_")}.png`;
        a.click();
    };

    const shareNative = async () => {
        if (!imageBlob) return;
        const file = new File([imageBlob], "uxability-score.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ text: shareText, url: SHARE_URL, files: [file] });
            return;
        }
        await navigator.clipboard.writeText(`${shareText} ${SHARE_URL}`);
    };

    const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
    const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SHARE_URL)}`;

    return (
        <div className="card p-5 md:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-stone-900">
                        {language === "it" ? "Condividi gli score globali" : "Share global scores"}
                    </h3>
                    <p className="text-stone-500 text-sm mt-0.5">
                        {language === "it"
                            ? "Genera una card 1200x630 pronta per LinkedIn e X."
                            : "Generate a 1200x630 card ready for LinkedIn and X."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={generateImage}
                    disabled={generating}
                    className="btn-primary flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shrink-0 disabled:opacity-60"
                >
                    <Sparkles size={16} className={generating ? "animate-spin" : ""} />
                    {generating
                        ? (language === "it" ? "Generazione..." : "Generating...")
                        : generated
                            ? (language === "it" ? "Rigenera" : "Regenerate")
                            : (language === "it" ? "Genera card" : "Generate card")}
                </button>
            </div>

            {imageUrl && (
                <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Audit score card" className="w-full aspect-[1.905/1] object-cover" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={download}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl premium-surface hover:border-stone-400 transition-all text-sm font-semibold text-stone-800"
                        >
                            <Download size={15} />
                            {language === "it" ? "Scarica PNG" : "Download PNG"}
                        </button>

                        <button
                            type="button"
                            onClick={shareNative}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl premium-surface hover:border-stone-400 transition-all text-sm font-semibold text-stone-800"
                        >
                            <Share2 size={15} />
                            {language === "it" ? "Condividi" : "Share"}
                        </button>

                        <a
                            href={linkedInHref}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0077b5] hover:bg-[#006399] transition-colors text-sm font-semibold text-white"
                        >
                            <Linkedin size={15} />
                            LinkedIn
                        </a>

                        <a
                            href={xHref}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-700 transition-colors text-sm font-semibold text-white"
                        >
                            <Twitter size={15} />
                            X / Twitter
                        </a>
                    </div>

                    <p className="text-xs text-stone-400 italic px-1">{shareText}</p>
                </div>
            )}
        </div>
    );
}
