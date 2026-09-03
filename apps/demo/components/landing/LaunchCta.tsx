"use client";

import Link from "next/link";
import { usePasskeyWallet } from "@sembol/passkey-react";
import { ArrowRightIcon } from "../icons";

/**
 * The landing page's main button. Wallet-aware: connected visitors get
 * "Open my wallet", everyone else gets the create flow.
 */
export function LaunchCta({
  size = "lg",
  label = "Create a wallet in 30 seconds",
  className = "",
}: {
  size?: "lg" | "sm";
  label?: string;
  className?: string;
}) {
  const { isConnected } = usePasskeyWallet();
  const href = isConnected ? "/dashboard" : "/wallet";
  const text = isConnected ? "Open my wallet" : label;
  const sizing = size === "lg" ? "h-13 px-7 text-base" : "h-10 px-5 text-sm";

  return (
    <Link href={href} className={`btn-gold ${sizing} ${className}`}>
      {text}
      <ArrowRightIcon size={size === "lg" ? 18 : 15} />
    </Link>
  );
}
