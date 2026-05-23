"use client";

import { motion } from "framer-motion";

interface ScoreCircleProps {
    score: number;
    label: string;
    delay?: number;
    onClick?: () => void;
}

export default function ScoreCircle({ score, label, delay = 0, onClick }: ScoreCircleProps) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 90) return { stroke: "stroke-emerald-400", text: "text-emerald-400", glow: "drop-shadow(0 0 12px rgba(52,211,153,0.55))" };
        if (s >= 50) return { stroke: "stroke-amber-400", text: "text-amber-400", glow: "drop-shadow(0 0 12px rgba(251,191,36,0.55))" };
        return { stroke: "stroke-rose-400", text: "text-rose-400", glow: "drop-shadow(0 0 12px rgba(251,113,133,0.55))" };
    };

    const colors = getColor(score);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay }}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-4 card p-6 w-full cursor-pointer hover:-translate-y-1.5 group"
        >
            <div className="relative w-28 h-28 flex items-center justify-center">
                <svg
                    className="w-full h-full -rotate-90"
                    style={{ filter: colors.glow }}
                >
                    <circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(30,41,59,0.8)"
                        strokeWidth="7"
                    />
                    <motion.circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.6, ease: "easeOut", delay: delay + 0.1 }}
                        className={colors.stroke}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black tabular-nums ${colors.text}`}>
                        {score}
                    </span>
                </div>
            </div>
            <div className="text-center space-y-1">
                <span className="section-label text-slate-500 group-hover:text-slate-400 transition-colors block">
                    {label}
                </span>
            </div>
        </motion.div>
    );
}
