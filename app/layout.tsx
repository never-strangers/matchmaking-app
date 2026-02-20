import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import RouteGuard from "@/components/RouteGuard";
import DemoDataInit from "@/components/DemoDataInit";
import { SessionBanner } from "@/components/SessionBanner";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "var(--bg)" }}>
        <RouteGuard>
          <header className="border-b" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
              <div className="flex justify-between items-center h-16 sm:h-20 gap-2 sm:gap-3">
                <div className="flex items-center flex-shrink-0 min-w-0">
                  <Link 
                    href="/" 
                    className="hover:opacity-80 transition-opacity block"
                  >
                    <div className="relative w-[130px] h-[61px] sm:w-[180px] sm:h-[85px]">
                      <Image
                        src="/logo.png"
                        alt="Never Strangers"
                        fill
                        className="object-contain object-left"
                        priority
                        sizes="(max-width: 640px) 130px, 180px"
                      />
                    </div>
                  </Link>
                </div>
                <div className="min-w-0 flex-1 flex justify-end">
                  <NavBar />
                </div>
              </div>
            </div>
          </header>
          <SessionBanner />
          <AuthRecoveryRedirect />
          <main>{children}</main>
          <DemoDataInit />
        </RouteGuard>
      </body>
    </html>
  );
}


