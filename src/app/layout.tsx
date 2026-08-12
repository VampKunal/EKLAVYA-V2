import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";

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
  title: "Eklavya AI | Master Any Subject with Your Personal AI Tutor",
  description: "Eklavya analyzes your learning style, tracks your weak points, and delivers personalized quizzes, notes, and AI-driven insights to accelerate your mastery.",
  keywords: ["AI Tutor", "Learning Platform", "Personalized Learning", "Adaptive RAG Learning", "E-learning"],
  authors: [{ name: "Eklavya AI Team" }],
  openGraph: {
    title: "Eklavya AI | Master Any Subject with Your Personal AI Tutor",
    description: "Eklavya analyzes your learning style, tracks your weak points, and delivers personalized quizzes, notes, and AI-driven insights to accelerate your mastery.",
    url: "https://eklavya.ai",
    siteName: "Eklavya AI",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Eklavya AI Learning Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eklavya AI | Master Any Subject with Your Personal AI Tutor",
    description: "Eklavya analyzes your learning style, tracks your weak points, and delivers personalized quizzes, notes, and AI-driven insights to accelerate your mastery.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body>
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
  );
}
