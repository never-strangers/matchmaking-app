import type { Metadata } from "next";
import Link from "next/link";
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
              <Link 
                href="/" 
                className="flex items-baseline gap-1 hover:opacity-80 transition-opacity group"
              >
                <span className="text-base lowercase text-gray-dark font-sans tracking-tight">
                  never
                </span>
                <span className="text-4xl italic text-red-accent font-serif font-bold leading-none">
                  Strangers
                </span>
              </Link>
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


