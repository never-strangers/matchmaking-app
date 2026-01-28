import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import RouteGuard from "@/components/RouteGuard";
import DemoDataInit from "@/components/DemoDataInit";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Never Strangers - A New Way to Meet People",
    template: "%s | Never Strangers",
  },
  description:
    "Using an algorithm to find your idea partner at the party itself. We are bringing back the joys of connecting with people organically. Say goodbye to dating apps!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
        <RouteGuard>
          <header className="border-b" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
            <div className="max-w-7xl mx-auto px-6 lg:px-20">
              <div className="flex justify-between items-center h-20 gap-3">
                <div className="flex items-center flex-shrink-0">
                  <Link 
                    href="/" 
                    className="hover:opacity-80 transition-opacity"
                  >
                    <div className="relative" style={{ width: '180px', height: '85px' }}>
                      <Image
                        src="/logo.png"
                        alt="Never Strangers"
                        fill
                        className="object-contain"
                        priority
                        sizes="180px"
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
          <main>{children}</main>
          <DemoDataInit />
        </RouteGuard>
      </body>
    </html>
  );
}


