"use client";

import Link from "next/link";
import Image from "next/image";
import { CITIES } from "./content";

export default function Hero() {
  const citiesText = `Now in ${CITIES.slice(0, 3).join(", ")}`;

  return (
    <section
      className="px-4 py-14 sm:px-6 sm:py-16 lg:px-20 lg:py-20 xl:py-32"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
        <div className="min-w-0">
          <h1
            data-testid="home-title"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-[1.1] sm:leading-tight tracking-tight"
            style={{ color: "var(--text)", fontFamily: "'Cabinet Grotesk', system-ui, sans-serif" }}
          >
            Meet your new{" "}
            <span style={{ color: "var(--primary)" }}>soulmate</span>.
          </h1>
          <p
            className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 max-w-lg leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Curated social events where real people meet — no apps, no algorithms, just you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-5 sm:mb-6">
            <Link
              href="/register"
              className="touch-manipulation inline-flex items-center justify-center min-h-[48px] w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.98]"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                boxShadow: "var(--shadow-terra)",
              }}
            >
              Get Your Invite
            </Link>
          </div>
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
            {citiesText}
          </p>
        </div>
        <div className="mt-4 sm:mt-6 lg:mt-0">
          <div
            className="rounded-2xl overflow-hidden w-full max-w-md sm:max-w-none mx-auto lg:mx-0"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <Image
              src="/landing/carousel-7.webp"
              alt="People connecting at a Never Strangers event"
              width={600}
              height={800}
              className="w-full h-auto object-cover aspect-[3/4]"
              priority
              sizes="(max-width: 640px) 448px, (max-width: 1024px) 50vw, 600px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
