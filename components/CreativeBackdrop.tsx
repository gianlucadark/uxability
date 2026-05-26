"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring } from "framer-motion";

export default function CreativeBackdrop() {
  const rawX = useMotionValue(-120);
  const rawY = useMotionValue(-120);
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.35 });
  const [active, setActive] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const activeRef = useRef(false);
  const interactiveRef = useRef(false);
  const pressedRef = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    if (reduceMotion.matches || !finePointer.matches) return;

    let frame = 0;
    let destroyed = false;
    let cleanup: (() => void) | null = null;

    const startSmoothScroll = async () => {
      const { default: Lenis } = await import("lenis");
      if (destroyed) return;

      const lenis = new Lenis({
        duration: 0.95,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.82,
        touchMultiplier: 1,
      });

      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };

      frame = requestAnimationFrame(raf);
      cleanup = () => {
        cancelAnimationFrame(frame);
        lenis.destroy();
      };
    };

    let idleCallbackId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(() => void startSmoothScroll(), { timeout: 1600 });
    } else {
      timeoutId = globalThis.setTimeout(() => void startSmoothScroll(), 900);
    }

    return () => {
      destroyed = true;
      if (idleCallbackId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
      cleanup?.();
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
      if (!activeRef.current) {
        activeRef.current = true;
        setActive(true);
      }
      if (interactiveRef.current !== isInteractive) {
        interactiveRef.current = isInteractive;
        setInteractive(isInteractive);
      }
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    const onPointerLeave = () => {
      activeRef.current = false;
      interactiveRef.current = false;
      pressedRef.current = false;
      setActive(false);
      setInteractive(false);
      setPressed(false);
    };

    const onPointerDown = () => {
      if (!pressedRef.current) {
        pressedRef.current = true;
        setPressed(true);
      }
    };
    const onPointerUp = () => {
      if (pressedRef.current) {
        pressedRef.current = false;
        setPressed(false);
      }
    };

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
