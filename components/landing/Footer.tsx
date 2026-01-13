import Link from "next/link";
import { SOCIAL_LINKS } from "./content";

export default function Footer() {
  return (
    <footer className="bg-beige-frame border-t border-beige-frame mt-16 md:mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col items-center gap-8 md:gap-12">
          {/* Join a Mixer Link */}
          <Link
            href="/booking"
            className="text-lg md:text-xl font-semibold text-gray-dark hover:text-red-accent transition-colors"
          >
            Join a Mixer
          </Link>

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <a
              href={SOCIAL_LINKS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-medium hover:text-red-accent transition-colors px-4 py-2"
            >
              TikTok
            </a>
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-medium hover:text-red-accent transition-colors px-4 py-2"
            >
              Instagram
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-medium hover:text-red-accent transition-colors px-4 py-2"
            >
              Facebook
            </a>
            <a
              href={SOCIAL_LINKS.contact}
              className="text-gray-medium hover:text-red-accent transition-colors px-4 py-2"
            >
              Contact
            </a>
          </div>

          {/* Copyright and Tagline */}
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-gray-medium">©2026. All rights reserved.</p>
            <p className="text-base md:text-lg font-normal text-gray-dark">
              We all start as strangers.
            </p>
            <Link
              href="/privacy-policy"
              className="text-sm text-gray-medium hover:text-red-accent transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
