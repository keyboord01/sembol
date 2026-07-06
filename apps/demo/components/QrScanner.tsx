"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ADDRESS_RE = /[GC][A-Z2-7]{55}/;

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

/**
 * Camera QR scanner using the native BarcodeDetector API (Chrome, Edge,
 * Android, Safari 17+). Falls back to a clear message where unsupported.
 * Extracts the first Stellar address (G… or C…) found in any scanned code.
 */
export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (address: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const start = async () => {
      const DetectorCtor = (
        window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }
      ).BarcodeDetector;
      if (!DetectorCtor) {
        setError("QR scanning isn't supported in this browser. Paste the address instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        setError("Camera access was denied. Paste the address instead.");
        return;
      }
      if (cancelled || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      const detector = new DetectorCtor({ formats: ["qr_code"] });
      timer = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes) {
            const match = ADDRESS_RE.exec(code.rawValue ?? "");
            if (match) {
              onResult(match[0]);
              return;
            }
          }
        } catch {
          /* keep scanning */
        }
      }, 250);
    };

    void start();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
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
      <p className="microlabel text-dim">Point the camera at an address QR</p>
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
            className="h-[min(70vw,420px)] w-[min(70vw,420px)] border border-hairline object-cover"
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
        className="microlabel h-11 border border-hairline px-6 text-fg transition-colors hover:border-long hover:text-long"
      >
        Cancel
      </button>
    </div>,
    document.body,
  );
}
