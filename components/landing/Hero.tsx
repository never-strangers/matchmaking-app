"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CITIES } from "./content";

export default function Hero() {
  const citiesText = `Now in ${CITIES.slice(0, 3).join(", ")}`;

  return (
    <section
      className="px-6 py-20 lg:px-20 lg:py-32"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1
            className="text-5xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight"
            style={{ color: "var(--text)", fontFamily: "'Cabinet Grotesk', system-ui, sans-serif" }}
          >
            Meet your new{" "}
            <span style={{ color: "var(--primary)" }}>connection</span>.
          </h1>
          <p
            className="text-lg lg:text-xl mb-8 max-w-lg leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Curated social events where real people meet — no apps, no algorithms, just you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
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
        <div className="mt-8 lg:mt-0">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <Image
              src="/landing/carousel-1.webp"
              alt="People connecting at a Never Strangers event"
              width={600}
              height={800}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
