import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Tektur } from "next/font/google";
import "@sembol/passkey-react/styles.css";
import "./globals.css";
import { Toaster } from "../components/Toast";
import { Providers } from "./providers";

const tektur = Tektur({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tektur",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sembol.xyz"),
  title: {
    default: "Sembol · Passkey wallets for Stellar",
    template: "%s · Sembol",
  },
  description:
    "Sembol turns Face ID into a self-custodial Stellar smart wallet. No seed phrases, no extensions. Open-source React library with a fully themeable wallet UI.",
  keywords: [
    "Stellar wallet",
    "passkey wallet",
    "smart account",
    "Stellar passkeys",
    "WebAuthn wallet",
    "self-custodial wallet",
    "Soroban smart wallet",
    "react wallet sdk",
    "embedded wallet",
  ],
  authors: [{ name: "Sembol contributors", url: "https://github.com/keyboord01/sembol" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://sembol.xyz",
    siteName: "Sembol",
    title: "Sembol · Passkey wallets for Stellar",
    description:
      "The wallet is you. Face ID becomes a self-custodial Stellar smart account: no seed phrases, no extensions, sponsored fees, open source.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sembol · Passkey wallets for Stellar",
    description:
      "The wallet is you. Face ID becomes a self-custodial Stellar smart account: no seed phrases, no extensions, open source.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-sembol-theme="dark"
      className={`${tektur.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <body>
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
