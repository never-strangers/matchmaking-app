import type { Metadata } from "next";
import { Young_Serif, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import RouteGuard from "@/components/RouteGuard";
import DemoDataInit from "@/components/DemoDataInit";
import { SessionBanner } from "@/components/SessionBanner";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import "./globals.css";

const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-young-serif",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const DEFAULT_DESC =
  "Using an algorithm to find your ideal partner at the party itself. We are bringing back the joys of connecting with people organically. Say goodbye to dating apps!";

export const metadata: Metadata = {
  title: {
    default: "Never Strangers - A New Way to Meet People",
    template: "%s | Never Strangers",
  },
  description: DEFAULT_DESC,
  openGraph: {
    title: "Never Strangers - A New Way to Meet People",
    description: DEFAULT_DESC,
    siteName: "Never Strangers",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Never Strangers - A New Way to Meet People",
    description: DEFAULT_DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${youngSerif.variable} ${plusJakarta.variable}`}>
      <body
        className="min-h-screen overflow-x-hidden"
        style={{ backgroundColor: "var(--bg)", fontFamily: "var(--font-sans)", color: "var(--text)" }}
      >
        <RouteGuard>
          {/* ── Header ── */}
          <header
            style={{
              backgroundColor: "var(--bg)",
              borderBottom: "1px solid var(--border)",
              height: "66px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 flex justify-between items-center">
              <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
                <div className="relative w-[120px] h-[56px] sm:w-[160px] sm:h-[75px]">
                  <Image
                    src="/logo.png"
                    alt="Never Strangers"
                    fill
                    className="object-contain object-left"
                    priority
                    sizes="(max-width: 640px) 120px, 160px"
                  />
                </div>
              </Link>
              <NavBar />
            </div>
          </header>

          <SessionBanner />
          <AuthRecoveryRedirect />

          {/* ── Main content — explicit cream bg so no page leaks white ── */}
          <main style={{ backgroundColor: "var(--bg)", minHeight: "calc(100vh - 66px)" }}>
            {children}
          </main>

          <DemoDataInit />
        </RouteGuard>
      </body>
    </html>
  );
}
