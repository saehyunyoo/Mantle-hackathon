import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AgentationDev } from "@/components/agentation-dev";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jion · Daily Trending RWA Tokens",
  description:
    "Auto-tokenize the daily top-volume stocks per market. AI finds the best trade & liquidity routes across Mantle DeFi. RWA × AI on Mantle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Nav />
        {children}
        {process.env.NODE_ENV === "development" && <AgentationDev />}
      </body>
    </html>
  );
}
