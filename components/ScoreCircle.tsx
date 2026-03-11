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
        if (s >= 90) return "stroke-emerald-400";
        if (s >= 50) return "stroke-amber-400";
        return "stroke-rose-400";
    };

    const getTextColor = (s: number) => {
        if (s >= 90) return "text-emerald-400";
        if (s >= 50) return "text-amber-400";
        return "text-rose-400";
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay }}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-4 card p-6 w-full cursor-pointer hover:-translate-y-1"
        >
            <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke="#334155"
                        strokeWidth="8"
                    />
                    <motion.circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: delay + 0.1 }}
                        className={getColor(score)}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getTextColor(score)}`}>
                        {score}
                    </span>
                </div>
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
        </motion.div>
    );
}
