"use client";

import { motion } from "framer-motion";
import { Zap, Activity, Clock, MousePointer2, AlertCircle, Info, CheckCircle2, Globe, Type, Database } from "lucide-react";

interface FieldDataBadgesProps {
    fieldData: any;
}

export default function FieldDataBadges({ fieldData }: FieldDataBadgesProps) {
    if (!fieldData || !fieldData.metrics) {
        return (
            <div className="glass p-12 rounded-[2.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.01]">
                <div className="p-6 rounded-full bg-white/5 border border-white/10 opacity-30">
                    <Info size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold opacity-80">Dati Utenti Reali non disponibili</h3>
                    <p className="text-sm opacity-40 max-w-lg leading-relaxed">
                        Google Chrome User Experience Report (CrUX) non dispone ancora di sufficiente traffico per questo URL negli ultimi 28 giorni per generare un report statistico affidabile.
                    </p>
                </div>
            </div>
        );
    }

    const metrics = fieldData.metrics;

    const getStatusText = (category: string) => {
        if (category === "FAST" || category === "GOOD") return "Eccellente";
        if (category === "AVERAGE" || category === "NEEDS_IMPROVEMENT") return "Migliorabile";
        return "Critico";
    };

    const getStatusColor = (category: string) => {
        if (category === "FAST" || category === "GOOD") return "from-emerald-400 to-emerald-600";
        if (category === "AVERAGE" || category === "NEEDS_IMPROVEMENT") return "from-amber-400 to-amber-600";
        return "from-rose-400 to-rose-600";
    };

    const metricInfo: Record<string, { label: string; desc: string; icon: any }> = {
        "LARGEST_CONTENTFUL_PAINT_MS": {
            label: "Visualizz. Contenuto (LCP)",
            desc: "L'istante in cui l'utente vede l'elemento principale (hero image, titolo). È fondamentale per la percezione di velocità.",
            icon: <Zap size={20} />
        },
        "FIRST_INPUT_DELAY_MS": {
            label: "Reattività al Click (FID)",
            desc: "Il tempo che intercorre tra l'interazione (es. click) e la risposta del browser. Influenza quanto il sito sembra 'scattante'.",
            icon: <Clock size={20} />
        },
        "CUMULATIVE_LAYOUT_SHIFT_SCORE": {
            label: "Stabilità Visiva (CLS)",
            desc: "Misura se gli elementi si muovono mentre la pagina carica. Evita che l'utente clicchi il pulsante sbagliato per errore.",
            icon: <Activity size={20} />
        },
        "INTERACTION_TO_NEXT_PAINT": {
            label: "Fluidità Interazione (INP)",
            desc: "Valuta quanto il sito risponde prontamente ad ogni azione compiuta dall'utente durante l'intera permanenza.",
            icon: <MousePointer2 size={20} />
        },
        "EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT": {
            label: "Fluidità Interazione (INP)",
            desc: "Valuta quanto il sito risponde prontamente ad ogni azione compiuta dall'utente durante l'intera permanenza.",
            icon: <MousePointer2 size={20} />
        },
        "FIRST_CONTENTFUL_PAINT_MS": {
            label: "Prima Apparizione (FCP)",
            desc: "Misura il tempo impiegato per visualizzare il primo bit di contenuto (testo o immagine) sullo schermo.",
            icon: <Type size={20} />
        },
        "EXPERIMENTAL_TIME_TO_FIRST_BYTE_MS": {
            label: "Risposta Server (TTFB)",
            desc: "Il tempo che il server impiega per inviare il primo byte di dati in risposta a una richiesta.",
            icon: <Database size={20} />
        }
    };

    const metricArray = Object.entries(metrics)
        .map(([key, value]: [string, any]) => {
            const info = metricInfo[key] || {
                label: key.replace(/_/g, " ").toLowerCase(),
                desc: "Metrica aggiuntiva rilevata dall'esperienza utente reale.",
                icon: <Activity size={20} />
            };
            return {
                key,
                ...info,
                value: key.includes("SCORE") ? (value.percentile / 100).toFixed(2) : `${(value.percentile / 1000).toFixed(2)}s`,
                status: value.category,
                distributions: value.distributions
            };
        });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                            <Globe className="w-6 h-6" />
                        </div>
                        <h3 className="text-3xl font-black font-display text-white">Core Web Vitals</h3>
                    </div>
                    <p className="text-zinc-500 font-medium max-w-xl text-sm italic">
                        Questi dati riflettono l'esperienza attuale dei tuoi navigatori reali (Chrome UX Report). Google li utilizza per il posizionamento SEO.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl shadow-inner">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Veloce
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Normale
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Lento
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {metricArray.map((metric, i) => (
                    <motion.div
                        key={metric.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="group relative glass rounded-[2rem] p-8 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden"
                    >
                        {/* Status Glow Background */}
                        <div className={`absolute -right-20 -top-20 w-48 h-48 blur-[100px] opacity-10 bg-gradient-to-br ${getStatusColor(metric.status)}`} />

                        <div className="flex items-start justify-between relative z-10">
                            <div className="space-y-4 flex-grow pr-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-black/20 text-white/80`}>
                                        {metric.icon}
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{metric.label}</h4>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-5xl font-black font-mono tracking-tighter text-white">
                                        {metric.value}
                                    </div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest inline-flex px-2 py-0.5 rounded bg-gradient-to-r text-white ${getStatusColor(metric.status)}`}>
                                        {getStatusText(metric.status)}
                                    </div>
                                </div>

                                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                                    {metric.desc}
                                </p>
                            </div>

                            <div className="flex flex-col gap-1 items-end pt-2">
                                <div className="h-40 w-1.5 rounded-full bg-black/40 overflow-hidden flex flex-col-reverse">
                                    {metric.distributions.map((d: any, idx: number) => (
                                        <div
                                            key={idx}
                                            style={{ height: `${d.proportion * 100}%` }}
                                            className={idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-amber-500" : "bg-rose-500"}
                                        />
                                    ))}
                                </div>
                                <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest mt-2 origin-center rotate-90">Distr.</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {fieldData.overall_category && (
                <div className="relative overflow-hidden p-8 glass rounded-[2rem] border border-white/10 flex items-center gap-6 bg-gradient-to-r from-white/5 to-white/[0.02]">
                    <div className={`p-5 rounded-2xl ${fieldData.overall_category === "FAST" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]"}`}>
                        {fieldData.overall_category === "FAST" ? (
                            <CheckCircle2 size={32} />
                        ) : (
                            <AlertCircle size={32} />
                        )}
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold">Verdetto Esperienza Utente</h4>
                        <p className="text-zinc-500 text-sm leading-snug">
                            Basandosi sugli utenti reali, il tuo sito <span className={`font-black uppercase tracking-widest ${fieldData.overall_category === "FAST" ? "text-emerald-400" : "text-rose-400"}`}>{fieldData.overall_category === "FAST" ? "supera" : "non supera"}</span> i parametri di qualità imposti da Google per una navigazione eccellente.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
