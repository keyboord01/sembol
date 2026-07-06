"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";

const ADDRESS_RE = /[GC][A-Z2-7]{55}/;

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

/**
 * Camera QR scanner. Prefers the native BarcodeDetector API (Chrome / Edge /
 * Android) and falls back to a JS decoder (jsQR) everywhere else - notably
 * iOS Safari and Firefox, which have no BarcodeDetector. Extracts the first
 * Stellar address (G… or C…) found in any scanned code.
 */
export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (address: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const finish = (value: string) => {
      const match = ADDRESS_RE.exec(value);
      if (match) {
        onResult(match[0]);
        return true;
      }
      return false;
    };

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't access the camera. Paste the address instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        setError("Camera access was blocked. Allow camera access, or paste the address instead.");
        return;
      }
      if (cancelled || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      // iOS needs these set for inline playback to actually start.
      videoRef.current.setAttribute("playsinline", "true");
      await videoRef.current.play().catch(() => undefined);
      setScanning(true);

      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;

      if (DetectorCtor) {
        // Native fast path.
        const detector = new DetectorCtor({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            for (const code of codes) if (finish(code.rawValue ?? "")) return;
          } catch {
            /* keep scanning */
          }
        }, 220);
        return;
      }

      // JS fallback (iOS Safari, Firefox): decode frames off a canvas.
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setError("QR decoding isn't available here. Paste the address instead.");
        return;
      }
      const tick = () => {
        if (cancelled) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height, {
            inversionAttempts: "dontInvert",
          });
          if (result && finish(result.data)) return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    void start();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-5 bg-ink/95 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Scan a QR code"
    >
      <p className="microlabel text-dim">
        {scanning ? "Point the camera at an address QR" : "Starting camera…"}
      </p>
      {error ? (
        <p className="max-w-sm border-l-2 border-amber py-1 pl-3 text-sm text-amber" role="alert">
          {error}
        </p>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-[min(72vw,420px)] w-[min(72vw,420px)] border border-hairline bg-surface object-cover"
          />
          <span aria-hidden className="absolute -top-px -left-px h-5 w-5 border-t-2 border-l-2 border-long" />
          <span aria-hidden className="absolute -top-px -right-px h-5 w-5 border-t-2 border-r-2 border-long" />
          <span aria-hidden className="absolute -bottom-px -left-px h-5 w-5 border-b-2 border-l-2 border-long" />
          <span aria-hidden className="absolute -right-px -bottom-px h-5 w-5 border-r-2 border-b-2 border-long" />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="microlabel h-11 cursor-pointer border border-hairline px-6 text-fg transition-colors hover:border-long hover:text-long"
      >
        {error ? "Close" : "Cancel"}
      </button>
    </div>,
    document.body,
  );
}
