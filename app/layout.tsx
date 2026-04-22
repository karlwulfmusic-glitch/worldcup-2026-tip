import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 1. Ladda fonten centralt
const vmFont = localFont({
  src: "../public/regermany2006-font/Regermany2006-x4Jq.ttf",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wulfens VM-Tips",
  description: "Det ultimata tipset för VM 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      {/* 2. Applicera fonten och standard-tracking på hela body */}
      <body className={`${vmFont.className} min-h-full flex flex-col tracking-normal`}>
        {children}
      </body>
    </html>
  );
}