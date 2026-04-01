"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const POLAROIDS = [
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2025/12/Screenshot-2024-12-02-at-5.32.35-PM-1.webp",
    city: "Singapore",
    rotate: "3deg",
    zIndex: 1,
    top: "40px",
    left: "0px",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp",
    city: "Hong Kong",
    rotate: "-4.5deg",
    zIndex: 3,
    top: "0px",
    left: "120px",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/02/Photo-123-1.webp",
    city: "Bangkok",
    rotate: "2deg",
    zIndex: 2,
    top: "60px",
    left: "240px",
  },
];

const MOBILE_PHOTOS = [
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2025/12/Screenshot-2024-12-02-at-5.32.35-PM-1.webp",
    city: "Singapore",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp",
    city: "Hong Kong",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/02/Photo-123-1.webp",
    city: "Bangkok",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2025/12/Screenshot-2024-12-02-at-5.32.35-PM-1.webp",
    city: "Manila",
  },
];

export default function Hero() {
  const polaroidRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [ctaHref, setCtaHref] = useState("/register");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }: { data: { session: { user: unknown } | null } }) => {
      if (session) setCtaHref("/events");
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY, currentTarget } = e as MouseEvent & { currentTarget: Window };
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (clientX - cx) / cx;
      const dy = (clientY - cy) / cy;

      polaroidRefs.current.forEach((el, i) => {
        if (!el) return;
        const factor = (i + 1) * 6;
        el.style.transform = `rotate(${POLAROIDS[i].rotate}) translate(${dx * factor}px, ${dy * factor}px)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section style={{ backgroundColor: "var(--bg)" }}>
      <style>{`
        @keyframes mobileScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .hero-mobile-track {
          display: flex;
          animation: mobileScroll 22s linear infinite;
          will-change: transform;
        }
        .hero-mobile-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── Mobile photo strip (hidden on desktop) ── */}
      <div className="overflow-hidden lg:hidden" style={{ backgroundColor: "var(--bg)" }}>
        <div className="hero-mobile-track py-4">
          {[...MOBILE_PHOTOS, ...MOBILE_PHOTOS].map((photo, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 mx-2 overflow-hidden"
              style={{ width: "200px", height: "260px", borderRadius: "12px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.city}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }}
              />
              <span
                className="absolute bottom-3 left-0 right-0 flex justify-center"
              >
                <span
                  className="text-xs font-semibold px-3 py-1"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "#fff",
                    borderRadius: "var(--radius-pill)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {photo.city}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main hero content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 py-12 sm:py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <h1
              data-testid="home-title"
              className="mb-6 leading-[1.08]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(48px, 5.5vw, 88px)",
                color: "var(--text)",
              }}
            >
              Like you&apos;ve known them{" "}
              <em style={{ color: "var(--primary)", fontStyle: "italic" }}>
                for years.
              </em>
            </h1>

            <p
              className="mb-8 leading-relaxed"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(16px, 1.5vw, 20px)",
                color: "var(--text-muted)",
                maxWidth: "480px",
              }}
            >
              Think of it as a party thrown by friends{" "}
              <strong style={{ color: "var(--text)" }}>
                who have very good taste.
              </strong>
            </p>

            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center font-semibold transition-opacity hover:opacity-85"
              style={{
                backgroundColor: "#080808",
                color: "#FFFFFF",
                borderRadius: "var(--radius-pill)",
                padding: "14px 32px",
                fontSize: "16px",
                fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
                minHeight: "var(--touch-min-height)",
              }}
            >
              I&rsquo;m in →
            </Link>
          </div>

          {/* Right — polaroids (desktop only) */}
          <div
            className="relative hidden lg:block"
            style={{ height: "460px" }}
          >
            {POLAROIDS.map((card, i) => (
              <div
                key={card.city}
                ref={(el) => { polaroidRefs.current[i] = el; }}
                className="absolute"
                style={{
                  top: card.top,
                  left: card.left,
                  zIndex: card.zIndex,
                  transform: `rotate(${card.rotate})`,
                  transition: "transform 0.1s ease-out",
                  width: "210px",
                  backgroundColor: "#FFFFFF",
                  border: "9px solid #FFFFFF",
                  paddingBottom: "34px",
                  boxShadow: "var(--shadow-card)",
                  borderRadius: "2px",
                }}
              >
                <div style={{ width: "100%", height: "260px", overflow: "hidden", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.src}
                    alt={`Never Strangers ${card.city}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                  <span
                    className="text-xs font-bold tracking-wide px-3 py-1"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "#FFFFFF",
                      borderRadius: "var(--radius-pill)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {card.city}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
