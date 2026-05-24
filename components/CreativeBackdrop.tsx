"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring } from "framer-motion";
import Lenis from "lenis";

export default function CreativeBackdrop() {
  const rawX = useMotionValue(-120);
  const rawY = useMotionValue(-120);
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.35 });
  const [active, setActive] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 1,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    if (!media.matches) return;

    const onPointerMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const isInteractive = Boolean(
        target?.closest("a, button, input, textarea, select, summary, [role='button'], [tabindex]:not([tabindex='-1'])")
      );

      rawX.set(event.clientX);
      rawY.set(event.clientY);
      setActive(true);
      setInteractive(isInteractive);
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    const onPointerLeave = () => {
      setActive(false);
      setInteractive(false);
      setPressed(false);
    };

    const onPointerDown = () => setPressed(true);
    const onPointerUp = () => setPressed(false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [rawX, rawY]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="scroll-progress"
        style={{ scaleY }}
      />

      <div className="creative-backdrop" aria-hidden="true">
        <motion.div
          className="creative-backdrop__spotlight"
          style={{ x: rawX, y: rawY, opacity: active ? 1 : 0.72 }}
        />
        <div className="creative-backdrop__beam" />
        <div className="creative-backdrop__grid" />
        <div className="creative-backdrop__focus-frame">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="creative-backdrop__a11y-mark">
          <span />
          <span />
          <span />
        </div>
        <div className="creative-backdrop__contrast-stack">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="creative-backdrop__ruler creative-backdrop__ruler--left">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={`left-${index}`} />
          ))}
        </div>
        <div className="creative-backdrop__ruler creative-backdrop__ruler--right">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={`right-${index}`} />
          ))}
        </div>
        <div className="creative-backdrop__blueprint creative-backdrop__blueprint--left" />
        <div className="creative-backdrop__blueprint creative-backdrop__blueprint--right" />
        <div className="creative-backdrop__console">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <motion.div
        aria-hidden="true"
        className={`cursor-orbit${interactive ? " cursor-orbit--interactive" : ""}${pressed ? " cursor-orbit--pressed" : ""}`}
        style={{
          x: rawX,
          y: rawY,
          opacity: active ? 1 : 0,
        }}
      >
        <span className="cursor-orbit__ring" />
        <span className="cursor-orbit__scan" />
        <i className="cursor-orbit__corner cursor-orbit__corner--tl" />
        <i className="cursor-orbit__corner cursor-orbit__corner--tr" />
        <i className="cursor-orbit__corner cursor-orbit__corner--br" />
        <i className="cursor-orbit__corner cursor-orbit__corner--bl" />
      </motion.div>
    </>
  );
}
