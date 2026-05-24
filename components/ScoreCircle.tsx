"use client";

import { useId } from "react";
import { motion } from "framer-motion";

interface ScoreCircleProps {
    score: number;
    label: string;
    delay?: number;
    onClick?: () => void;
}

export default function ScoreCircle({ score, label, delay = 0, onClick }: ScoreCircleProps) {
    const gradientId = useId().replace(/:/g, "");
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 90) {
            return {
                start: "#7fd8ba",
                end: "#0f8f68",
                text: "text-[var(--success)]",
                glow: "drop-shadow(0 10px 18px rgba(15,143,104,0.24))",
            };
        }
        if (s >= 50) {
            return {
                start: "#e7c97f",
                end: "#b7791f",
                text: "text-[var(--warning)]",
                glow: "drop-shadow(0 10px 18px rgba(183,121,31,0.26))",
            };
        }
        return {
            start: "#e38da0",
            end: "#bd3150",
            text: "text-[var(--danger)]",
            glow: "drop-shadow(0 10px 18px rgba(189,49,80,0.24))",
        };
    };

    const colors = getColor(score);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay }}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-4 card p-6 w-full cursor-pointer hover:-translate-y-1.5 group overflow-hidden"
        >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-stone-900/20 to-transparent" />
            <div className="relative w-28 h-28 flex items-center justify-center">
                <svg
                    className="w-full h-full -rotate-90"
                    style={{ filter: colors.glow }}
                >
                    <defs>
                        <linearGradient id={gradientId} x1="16" y1="16" x2="96" y2="96" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor={colors.start} />
                            <stop offset="100%" stopColor={colors.end} />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(214,211,209,0.72)"
                        strokeWidth="8"
                    />
                    <motion.circle
                        cx="56"
                        cy="56"
                        r={radius}
                        fill="transparent"
                        stroke={`url(#${gradientId})`}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.6, ease: "easeOut", delay: delay + 0.1 }}
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
                <span className="section-label text-stone-400 group-hover:text-stone-600 transition-colors block">
                    {label}
                </span>
            </div>
        </motion.div>
    );
}
