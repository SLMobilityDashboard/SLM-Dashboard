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
  // ADDED: Essential metatags for social media sharing (Open Graph)
  openGraph: {
    title: "Lencar E-Mobility Analytics Dashboard",
    description:
      "Performance and data analysis for Lencar's e-mobility fleet and charging infrastructure.",
    url: "https://[Your-App-Domain-Here].com", // IMPORTANT: Update this URL for deployment
    siteName: "Lencar Analytics",
    images: [
      // Add a full, publicly accessible image URL (e.g., '/og-image.png') here for social sharing.
      // Note: Data URIs are generally NOT compatible with Open Graph image previews.
    ],
    locale: "en_US",
    type: "website",
  },
  // ADDED: Essential metatags for Twitter sharing
  twitter: {
    card: "summary_large_image",
    title: "Lencar E-Mobility Analytics Dashboard",
    description:
      "Performance and data analysis for Lencar's e-mobility fleet and charging infrastructure.",
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
        {/* Wrap children in SessionProvider via a Client Component */}
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
