"use client";

import { AlertTriangle, Zap, Info } from "lucide-react";

interface Opportunity {
    title: string;
    description: string;
    impact: string;
    level: "High" | "Medium" | "Low";
}

import { useLanguage } from "@/context/LanguageContext";

export default function OpportunityCard({ opportunity, index }: { opportunity: Opportunity, index: number }) {
    const { t } = useLanguage();
    const getIcon = (level: string) => {
        switch (level) {
            case "High": return <AlertTriangle className="text-rose-600" size={24} />;
            case "Medium": return <Zap className="text-amber-600" size={24} />;
            default: return <Info className="text-stone-500" size={24} />;
        }
    };

    const getBorderColor = (level: string) => {
        switch (level) {
            case "High": return "border-rose-500/30";
            case "Medium": return "border-amber-500/30";
            default: return "border-stone-300/60";
        }
    };

    const getLevelText = (level: string) => {
        switch (level) {
            case "High": return t('high');
            case "Medium": return t('medium');
            default: return t('low');
        }
    };

    return (
        <div
            className={`card p-5 border-l-4 ${opportunity.level === 'High' ? 'border-l-rose-500' : opportunity.level === 'Medium' ? 'border-l-amber-500' : 'border-l-stone-400'} flex flex-col sm:flex-row gap-4 mb-3 overflow-hidden`}
        >
            <div className="mt-1 shrink-0">{getIcon(opportunity.level)}</div>
            <div className="flex-grow min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h4 className="font-bold text-lg leading-tight text-stone-800">{opportunity.title}</h4>
                    <div className="flex items-center gap-2">
                        {opportunity.impact && (
                            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">
                                {opportunity.impact}
                            </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${opportunity.level === 'High' ? 'border-rose-500/25 text-rose-700 bg-rose-500/10' : opportunity.level === 'Medium' ? 'border-amber-500/25 text-amber-700 bg-amber-500/10' : 'border-stone-500/20 text-stone-700 bg-stone-500/10'} font-bold`}>
                            {getLevelText(opportunity.level)}
                        </span>
                    </div>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed break-words"
                    dangerouslySetInnerHTML={{ __html: opportunity.description }} />
            </div>
        </div>
    );
}
