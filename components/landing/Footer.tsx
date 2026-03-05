import Link from "next/link";
import Image from "next/image";
import { SOCIAL_LINKS } from "./content";

export default function Footer() {
  return (
    <footer
      className="px-4 py-14 sm:px-6 lg:px-20 lg:py-20 text-center"
      style={{ backgroundColor: "#080808" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative w-[140px] h-[66px] sm:w-[180px] sm:h-[85px]">
          <Image
            src="/logo.png"
            alt="Never Strangers"
            fill
            className="object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
            sizes="(max-width: 640px) 140px, 180px"
          />
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
            }}
          >
            Instagram
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <a
            href={SOCIAL_LINKS.contact}
            className="transition-opacity hover:opacity-70"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
            }}
          >
            Contact
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <Link
            href="/privacy-policy"
            className="transition-opacity hover:opacity-70"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
            }}
          >
            Privacy
          </Link>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            fontSize: "clamp(20px, 2.5vw, 30px)",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          We all start as strangers.
        </p>

        {/* Copyright */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          © 2026 Never Strangers. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
