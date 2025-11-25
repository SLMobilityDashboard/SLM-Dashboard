// ============================================
// 1. Root Layout (app/layout.tsx)
// ============================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "../components/SessionProviderWrapper";
import Head from "next/head";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lencar E-Mobility Analytics Dashboard",
  description:
    "Performance and data analysis for Lencar's e-mobility fleet and charging infrastructure.",
  icons: {
    icon: {
      url: "/favicon.ico",
      type: "image/x-icon",
    },
  },
  openGraph: {
    title: "Lencar E-Mobility Analytics Dashboard",
    description:
      "Performance and data analysis for Lencar's e-mobility fleet and charging infrastructure.",
    url: "https://slm-dashboard-e757.vercel.app/",
    siteName: "Lencar Analytics",
    images: [
      {
        url: "/og-image.png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lencar E-Mobility Analytics Dashboard",
    description:
      "Performance and data analysis for Lencar's e-mobility fleet and charging infrastructure.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Head>
        <meta name="favicon" content="/favicon.ico" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
