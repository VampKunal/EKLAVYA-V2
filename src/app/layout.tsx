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
  title: "Eklavya AI | Intelligent Learning Platform",
  description: "Eklavya AI is a next-generation learning platform powered by artificial intelligence, offering personalized courses, real-time doubts resolution, and analytics.",
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
