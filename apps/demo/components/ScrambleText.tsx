"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>";

/**
 * Settles scrambled glyphs into the target text, left to right.
 * Dependency-free; renders plain text under prefers-reduced-motion.
 */
export function ScrambleText({
  text,
  speed = 26,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(text);
  const frame = useRef(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(text);
      return;
    }
    frame.current = 0;
    const id = setInterval(() => {
      frame.current += 1;
      const settled = Math.floor(frame.current / 2);
      if (settled >= text.length) {
        setDisplay(text);
        clearInterval(id);
        return;
      }
      let next = text.slice(0, settled);
      for (let i = settled; i < text.length; i++) {
        next += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(next);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className} aria-label={text}>
      {display}
    </span>
  );
}
