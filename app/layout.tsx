import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
              <nav className="flex space-x-6">
                <Link
                  href="/onboarding"
                  className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
                >
                  Onboarding
                </Link>
                <Link
                  href="/match"
                  className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
                >
                  Match
                </Link>
                <Link
                  href="/events"
                  className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
                >
                  Events
                </Link>
                <Link
                  href="/admin"
                  className="text-gray-medium hover:text-gray-dark text-sm font-medium transition-colors"
                >
                  Admin
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}


