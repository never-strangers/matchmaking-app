import Link from "next/link";
import Image from "next/image";
import { SOCIAL_LINKS } from "./content";

export default function Footer() {
  return (
    <footer
      className="px-6 py-16 lg:px-20 lg:py-20"
      style={{ backgroundColor: "var(--text)", color: "var(--primary-foreground)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="relative mb-6" style={{ width: "180px", height: "85px" }}>
              <Image
                src="/logo.png"
                alt="Never Strangers"
                fill
                className="object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Cities
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
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
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "var(--primary-foreground)" }}
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div
          className="pt-8 border-t text-center text-sm"
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
