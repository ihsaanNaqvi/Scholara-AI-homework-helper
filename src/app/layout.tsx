import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Scholara — Your AI Study Companion",
  description: "Stuck on a Science or Maths question? Upload a photo, PDF, or type it out and get a clear, step-by-step explanation instantly.",
  keywords:    ["homework help", "AI tutor", "GCSE", "science", "maths", "study", "Scholara"],
  openGraph: {
    title:       "Scholara — Your AI Study Companion",
    description: "Clear, step-by-step help with Science and Maths. Upload a photo, PDF, or just type your question.",
    type:        "website",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
