"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Zap, Info } from "lucide-react";

interface Opportunity {
    title: string;
    description: string;
    impact: string;
    level: "High" | "Medium" | "Low";
}

export default function OpportunityCard({ opportunity, index }: { opportunity: Opportunity, index: number }) {
    const getIcon = (level: string) => {
        switch (level) {
            case "High": return <AlertTriangle className="text-rose-400" size={24} />;
            case "Medium": return <Zap className="text-amber-400" size={24} />;
            default: return <Info className="text-cyan-400" size={24} />;
        }
    };

    const getBorderColor = (level: string) => {
        switch (level) {
            case "High": return "border-rose-500/30";
            case "Medium": return "border-amber-500/30";
            default: return "border-cyan-500/30";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
            className={`glass p-5 rounded-xl border-l-4 ${getBorderColor(opportunity.level)} flex gap-4`}
        >
            <div className="mt-1">{getIcon(opportunity.level)}</div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-lg">{opportunity.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getBorderColor(opportunity.level)}`}>
                        {opportunity.impact}
                    </span>
                </div>
                <p className="text-sm opacity-70 leading-relaxed text-zinc-300"
                    dangerouslySetInnerHTML={{ __html: opportunity.description }} />
            </div>
        </motion.div>
    );
}
