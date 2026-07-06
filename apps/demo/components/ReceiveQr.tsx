"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Address as a scannable QR panel. Rendered light-on-dark page but the code
 * itself stays dark-on-light, which is what camera scanners expect.
 */
export function ReceiveQr({ address }: { address: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(address, {
      margin: 1,
      width: 440,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0e0d", light: "#eef4f0" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR code for wallet address ${address}`}
        className="h-44 w-44 border border-hairline"
      />
      <p className="max-w-xs text-sm leading-relaxed text-dim">
        Scan from another device to grab this address instantly. The code encodes the raw
        contract address.
      </p>
    </div>
  );
}
