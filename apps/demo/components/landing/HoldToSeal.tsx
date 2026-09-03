"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePasskeyWallet } from "@sembol/passkey-react";
import { SembolMark } from "../Brand";

const HOLD_MS = 650;
const TAP_MS = 250;
const R = 44;
const CIRC = 2 * Math.PI * R;

/**
 * The signature CTA: press and hold to stamp your seal, like holding for
 * Face ID. A quick tap works too, and so does the keyboard - the hold is
 * the flourish, not a gate. The whole row is the button.
 */
export function HoldToSeal({
  label = "Hold to create yours",
  sublabel = "or just tap · free on testnet",
}: {
  label?: string;
  sublabel?: string;
}) {
  const router = useRouter();
  const { isConnected } = usePasskeyWallet();
  const href = isConnected ? "/dashboard" : "/wallet";

  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const holding = useRef(false);
  const startAt = useRef(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const finish = () => {
    if (done) return;
    setDone(true);
    setProgress(1);
    setTimeout(() => router.push(href), 340);
  };

  const loop = (t: number) => {
    if (!holding.current) return;
    const p = Math.min(1, (t - startAt.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      holding.current = false;
      finish();
      return;
    }
    raf.current = requestAnimationFrame(loop);
  };

  const press = (event: React.PointerEvent) => {
    if (done) return;
    event.preventDefault();
    holding.current = true;
    startAt.current = performance.now();
    raf.current = requestAnimationFrame(loop);
  };

  const release = () => {
    if (done || !holding.current) return;
    holding.current = false;
    cancelAnimationFrame(raf.current);
    if (performance.now() - startAt.current <= TAP_MS) {
      finish(); // a tap is a signature too
    } else {
      setProgress(0);
    }
  };

  const cancel = () => {
    if (done) return;
    holding.current = false;
    cancelAnimationFrame(raf.current);
    setProgress(0);
  };

  const pressed = progress > 0.02;

  return (
    <button
      type="button"
      aria-label="Create your wallet"
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          finish();
        }
      }}
      className="group flex touch-none items-center gap-5 text-left select-none"
    >
      <span
        className={`relative grid h-[6.5rem] w-[6.5rem] shrink-0 place-items-center ${done ? "stamp" : ""}`}
      >
        {/* progress ring */}
        <svg className="absolute inset-0" viewBox="0 0 104 104" aria-hidden>
          <circle cx="52" cy="52" r={R} fill="none" stroke="var(--color-hairline)" strokeWidth="2" />
          <circle
            cx="52"
            cy="52"
            r={R}
            fill="none"
            stroke="var(--color-gold-bright)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            transform="rotate(-90 52 52)"
          />
        </svg>
        {/* the seal: solid gold at rest, pressed darker while holding */}
        <span
          className={`halo grid h-[4.6rem] w-[4.6rem] place-items-center rounded-full transition-transform duration-200 ${
            pressed ? "scale-95" : "group-hover:scale-105"
          } bg-gradient-to-b from-gold-bright to-gold text-ink`}
        >
          <SembolMark size={34} title="" />
        </span>
      </span>
      <span>
        <span className="block text-[17px] font-semibold transition-colors group-hover:text-gold-bright">
          {label}
        </span>
        <span className="mt-0.5 block text-sm text-faint">{sublabel}</span>
      </span>
    </button>
  );
}
