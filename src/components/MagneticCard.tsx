"use client";

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import React, { useRef, useState } from "react";

export default function MagneticCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["14deg", "-14deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-14deg", "14deg"]);

  // توهج يتبع الإصبع/الفأرة
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["15%", "85%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["15%", "85%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    // القيم ضمن نطاق ±50% من مركز البطاقة
    x.set((e.clientX - rect.left - rect.width / 2) / rect.width);
    y.set((e.clientY - rect.top - rect.height / 2) / rect.height);
  };

  const handleMouseLeave = () => {
    if (shouldReduceMotion) return;
    x.set(0);
    y.set(0);
    setActive(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches[0];
    x.set((t.clientX - rect.left - rect.width / 2) / rect.width);
    y.set((t.clientY - rect.top - rect.height / 2) / rect.height);
    setActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches[0];
    x.set((t.clientX - rect.left - rect.width / 2) / rect.width);
    y.set((t.clientY - rect.top - rect.height / 2) / rect.height);
  };

  const handleTouchEnd = () => {
    if (shouldReduceMotion) return;
    x.set(0);
    y.set(0);
    setActive(false);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={shouldReduceMotion ? {} : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="h-full w-full relative perspective-[1200px]"
    >
      <motion.div
        style={shouldReduceMotion ? {} : { transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
        className="h-full w-full transition-shadow duration-300 hover:shadow-2xl hover:shadow-accent/20 rounded-2xl relative"
      >
        {/* توهج زجاجي يتبع اللمس */}
        <motion.div
          aria-hidden
          style={{ left: glareX, top: glareY, opacity: active ? 1 : 0 }}
          className="pointer-events-none absolute z-20 w-24 h-24 -ml-12 -mt-12 rounded-full bg-white/25 dark:bg-white/10 blur-2xl transition-opacity duration-300"
        />
        {children}
      </motion.div>
    </motion.div>
  );
}
