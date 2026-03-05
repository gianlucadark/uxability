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
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.06)" }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="flex flex-col items-center gap-4 glass p-6 rounded-2xl w-full cursor-pointer transition-colors"
        >
            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                    />
                    <motion.circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: delay + 0.3 }}
                        className={getColor(score)}
                        strokeLinecap="round"
                    />
                </svg>
                <span className={`absolute text-2xl font-bold ${getTextColor(score)}`}>
                    {score}
                </span>
            </div>
            <span className="text-sm font-medium uppercase tracking-wider opacity-70">{label}</span>
        </motion.div>
    );
}
