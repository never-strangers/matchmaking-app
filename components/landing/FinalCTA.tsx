"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useReveal } from "@/hooks/useReveal";

export default function FinalCTA() {
  const ref = useReveal<HTMLElement>();
  const [ctaHref, setCtaHref] = useState("/register");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }: { data: { session: { user: unknown } | null } }) => {
      if (session) setCtaHref("/events");
    });
  }, []);

  return (
    <section
      ref={ref}
      className="reveal-section px-4 sm:px-6 lg:px-20 py-24 lg:py-40 text-center safe-area-inset-bottom"
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(185,15,20,0.18) 0%, transparent 70%), var(--bg)",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(36px, 5vw, 72px)",
            color: "var(--text)",
            lineHeight: 1.1,
            marginBottom: "24px",
          }}
        >
          The guest list is almost{" "}
          <em style={{ color: "var(--primary)", fontStyle: "italic" }}>full.</em>
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(16px, 1.5vw, 20px)",
            color: "var(--text-muted)",
            marginBottom: "40px",
            maxWidth: "480px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Spots go fast. Join now and we&apos;ll let you know when a mixer opens near you.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center font-semibold transition-opacity hover:opacity-85"
            style={{
              backgroundColor: "#080808",
              color: "#FFFFFF",
              borderRadius: "var(--radius-pill)",
              padding: "15px 36px",
              fontSize: "16px",
              fontFamily: "var(--font-sans)",
              minHeight: "var(--touch-min-height)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            I&rsquo;m in →
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center font-semibold transition-colors hover:bg-black/5"
            style={{
              backgroundColor: "transparent",
              color: "var(--text)",
              border: "1.5px solid var(--border-strong)",
              borderRadius: "var(--radius-pill)",
              padding: "15px 36px",
              fontSize: "16px",
              fontFamily: "var(--font-sans)",
              minHeight: "var(--touch-min-height)",
            }}
          >
            See what&apos;s on
          </Link>
        </div>
      </div>
    </section>
  );
}
