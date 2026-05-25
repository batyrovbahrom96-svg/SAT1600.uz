import type { Metadata } from "next";
import type { Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = "https://www.sattest.uz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "SATTEST.UZ",
  title: {
    default: "SATTEST.UZ | Digital SAT Practice Platform",
    template: "%s | SATTEST.UZ"
  },
  description: "Premium Digital SAT mock tests, adaptive practice, score analytics, and progress history for ambitious students.",
  keywords: [
    "SATTEST",
    "SATTEST.UZ",
    "Digital SAT",
    "SAT practice",
    "SAT mock tests",
    "Uzbekistan SAT",
    "SAT analytics"
  ],
  authors: [{ name: "SATTEST.UZ" }],
  creator: "SATTEST.UZ",
  publisher: "SATTEST.UZ",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "SATTEST.UZ",
    title: "SATTEST.UZ | Digital SAT Practice Platform",
    description: "Practice, improve, and achieve with premium Digital SAT mock tests and analytics.",
    images: [
      {
        url: "/assets/brand/social-preview.png",
        width: 1200,
        height: 630,
        alt: "SATTEST.UZ Digital SAT Practice Platform"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "SATTEST.UZ | Digital SAT Practice Platform",
    description: "Premium Digital SAT mock tests, adaptive practice, score analytics, and progress history.",
    images: ["/assets/brand/social-preview.png"]
  },
  appleWebApp: {
    capable: true,
    title: "SATTEST.UZ",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#101112",
  colorScheme: "dark light"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
