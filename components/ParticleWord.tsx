"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  seed: number;
  alpha: number;
  color: string;
};

const WORD = "UXABILITY";
const PARTICLE_CAP = 1250;

const easeOutExpo = (value: number) => (
  value >= 1 ? 1 : 1 - Math.pow(2, -10 * value)
);

const easeInOutCubic = (value: number) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
);

function createParticles(width: number, height: number, dpr: number): Particle[] {
  const buffer = document.createElement("canvas");
  const ctx = buffer.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const logicalWidth = Math.max(280, Math.floor(width));
  const logicalHeight = Math.max(92, Math.floor(height));
  buffer.width = Math.floor(logicalWidth * dpr);
  buffer.height = Math.floor(logicalHeight * dpr);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  const fontSize = Math.min(logicalWidth / 7.9, logicalHeight * 0.68);
  ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${Math.max(0.4, fontSize * 0.018)}px`;
  ctx.fillStyle = "#201c18";
  ctx.fillText(WORD, logicalWidth / 2, logicalHeight / 2 + fontSize * 0.04);

  const image = ctx.getImageData(0, 0, buffer.width, buffer.height);
  const points: Array<{ x: number; y: number; alpha: number }> = [];
  const step = Math.max(4, Math.floor(Math.min(logicalWidth, logicalHeight) / 23));

  for (let y = 0; y < buffer.height; y += step * dpr) {
    for (let x = 0; x < buffer.width; x += step * dpr) {
      const index = (Math.floor(y) * buffer.width + Math.floor(x)) * 4 + 3;
      const alpha = image.data[index];
      if (alpha > 32) {
        points.push({
          x: x / dpr,
          y: y / dpr,
          alpha: alpha / 255,
        });
      }
    }
  }

  const stride = Math.max(1, Math.ceil(points.length / PARTICLE_CAP));
  return points
    .filter((_, index) => index % stride === 0)
    .map((point, index) => {
      const angle = index * 2.399963 + point.x * 0.011;
      const radius = Math.max(logicalWidth, logicalHeight) * (0.34 + ((index * 37) % 100) / 170);
      const sideBias = index % 2 === 0 ? -1 : 1;
      const sx = logicalWidth / 2 + Math.cos(angle) * radius + sideBias * logicalWidth * 0.12;
      const sy = logicalHeight / 2 + Math.sin(angle * 0.82) * radius * 0.55;

      return {
        x: sx,
        y: sy,
        sx,
        sy,
        tx: point.x,
        ty: point.y,
        vx: 0,
        vy: 0,
        size: 1.15 + ((index * 19) % 10) * 0.09,
        seed: angle,
        alpha: 0.3 + point.alpha * 0.66,
        color: index % 5 === 0 ? "#b99b68" : index % 7 === 0 ? "#5f5650" : "#201c18",
      };
    });
}

export default function ParticleWord() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = createParticles(rect.width, rect.height, dpr);
      startRef.current = performance.now();
    };

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const particles = particlesRef.current;
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cycle = reduceMotion ? 0.7 : ((now - startRef.current) % 7800) / 7800;
      const gatherProgress = cycle < 0.62
        ? easeOutExpo(cycle / 0.62)
        : cycle < 0.9
          ? 1
          : easeInOutCubic(1 - ((cycle - 0.9) / 0.1)) * 0.82;

      const glow = ctx.createRadialGradient(
        rect.width / 2,
        rect.height / 2,
        0,
        rect.width / 2,
        rect.height / 2,
        rect.width * 0.55,
      );
      glow.addColorStop(0, "rgba(212, 185, 140, 0.16)");
      glow.addColorStop(0.52, "rgba(255, 250, 241, 0.06)");
      glow.addColorStop(1, "rgba(255, 250, 241, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, rect.width, rect.height);

      particles.forEach((particle) => {
        const floatX = Math.cos(now * 0.0012 + particle.seed) * (7.5 * (1 - gatherProgress) + 1.1);
        const floatY = Math.sin(now * 0.0015 + particle.seed * 1.3) * (6 * (1 - gatherProgress) + 1.4);
        const targetX = particle.tx + floatX * 0.28;
        const targetY = particle.ty + floatY * 0.34;
        const scatterX = particle.sx + floatX;
        const scatterY = particle.sy + floatY;

        const nextX = scatterX + (targetX - scatterX) * gatherProgress;
        const nextY = scatterY + (targetY - scatterY) * gatherProgress;
        particle.vx += (nextX - particle.x) * 0.12;
        particle.vy += (nextY - particle.y) * 0.12;
        particle.vx *= 0.76;
        particle.vy *= 0.76;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const pulse = 0.78 + Math.sin(now * 0.003 + particle.seed) * 0.22;
        ctx.globalAlpha = particle.alpha * (0.35 + gatherProgress * 0.72);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      if (!reduceMotion) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="particle-word" aria-hidden="true">
      <canvas ref={canvasRef} className="particle-word__canvas" />
      <div className="particle-word__scanline" />
    </div>
  );
}
