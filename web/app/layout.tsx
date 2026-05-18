import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jion · AI × RWA on Mantle",
  description:
    "Daily auto-tokenization of top-volume stocks with AI routing on Mantle.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
