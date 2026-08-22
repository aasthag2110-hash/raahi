import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./raahi.css";
import "./navigation.css";
import "./editorial.css";
import "./field-notebook.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raahi — No signal. Still a plan. Still together.",
  description: "Download the trek, understand what changed, and keep your trail party coordinated after connectivity disappears.",
  icons: {
    icon: "/raahi-logo.png",
    shortcut: "/raahi-logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Raahi — No signal. Still a plan. Still together.",
    description: "Offline trek planning, evidence-aware decisions, and Trail Party coordination.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Raahi — No signal. Still a plan. Still together.",
    description: "Offline trek planning, evidence-aware decisions, and Trail Party coordination.",
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
