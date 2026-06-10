// app/layout.tsx
// Location: zama-registry/app/layout.tsx
// Root layout for the Zama Confidential Wrapper Registry.
// Sets DM Sans as the global typeface via next/font/google,
// applies dark-mode base styles, and wires up smooth scroll.

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  // Full axis range: weight 100–1000, optical size 9–40
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Latise — The Confidential Asset Gateway",
  description:
    "The premier privacy gateway for Confidential ERC-20 tokens on the Zama Protocol. Wrap, unwrap, decrypt balances, and explore all ERC-7984 pairs on Sepolia and Ethereum mainnet.",
  keywords: [
    "Zama",
    "FHE",
    "confidential tokens",
    "ERC-7984",
    "privacy DeFi",
    "wrap",
    "unwrap",
    "encrypted balance",
  ],
  openGraph: {
    title: "Latise — The Confidential Asset Gateway",
    description:
      "Wrap standard ERC-20s into fully encrypted ERC-7984 tokens. Your balances, your privacy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      // light mode is the default — no class toggle needed
      style={{ colorScheme: "light" }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}