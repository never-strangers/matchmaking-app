import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Never Strangers",
  description: "Invite-only matching for meaningful connections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-beige-light">
        <header className="bg-beige-light border-b border-beige-frame">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center">
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
              <NavBar />
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}


