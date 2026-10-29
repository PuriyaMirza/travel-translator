import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ChromeGate } from "@/components/ChromeGate";
import { Header } from "@/components/Header";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { SyncProvider } from "@/components/SyncProvider";
import { brand } from "@/lib/brand";
import "./globals.css";

// Fraunces carries the titles (light italic, "WONK" on) — the axes must be
// requested here or font-variation-settings in globals.css has nothing to act on.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Mirrors --bg-main in globals.css so the browser chrome blends into the
  // stone header. Duplicated because Next needs a static value at build
  // time; keep the two in step (also manifest.ts).
  themeColor: "#F2F1EA",
  // Required for env(safe-area-inset-*) to resolve on iOS, or the header
  // bleeds into the Dynamic Island (SPEC.md §9).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="font-sans text-body flex min-h-full flex-col">
        <ChromeGate>
          <Header />
          <OfflineBanner />
        </ChromeGate>
        {children}
        <SyncProvider />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
