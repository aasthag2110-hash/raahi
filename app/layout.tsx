import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./raahi.css";
import "./navigation.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raahi — Offline mountain decision support",
  description: "Know what changed before you take the next step.",
  icons: {
    icon: "/raahi-logo.png",
    shortcut: "/raahi-logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Raahi — Offline mountain decision support",
    description: "The map shows the trail. Raahi shows what changed.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Raahi — Offline mountain decision support",
    description: "The map shows the trail. Raahi shows what changed.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
