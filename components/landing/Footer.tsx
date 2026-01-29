import Link from "next/link";
import Image from "next/image";
import { SOCIAL_LINKS } from "./content";

export default function Footer() {
  return (
    <footer
      className="px-4 py-12 sm:px-6 sm:py-16 lg:px-20 lg:py-20"
      style={{ backgroundColor: "var(--text)", color: "var(--primary-foreground)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
          <div>
            <div className="relative mb-4 sm:mb-6 w-[130px] h-[61px] sm:w-[180px] sm:h-[85px]">
              <Image
                src="/logo.png"
                alt="Never Strangers"
                fill
                className="object-contain object-left"
                style={{ filter: "brightness(0) invert(1)" }}
                sizes="(max-width: 640px) 130px, 180px"
              />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">About</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>
                <Link
                  href="/"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Cities
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Connect</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
              <li>
                <Link
                  href="/privacy-policy"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="block py-1 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div
          className="pt-6 sm:pt-8 border-t text-center text-xs sm:text-sm"
          style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
        >
          <p style={{ color: "var(--text-subtle)" }}>
            © 2026 Never Strangers. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
