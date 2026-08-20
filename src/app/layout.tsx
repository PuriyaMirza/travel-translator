import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { brand } from "@/lib/brand";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Mirrors --brand in globals.css. Duplicated because Next needs a static
  // value at build time; keep the two in step.
  themeColor: "#B91C1C",
  // Required for env(safe-area-inset-*) to resolve on iOS, or the header
  // bleeds into the Dynamic Island (SPEC.md §9).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="font-sans text-body flex min-h-full flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
