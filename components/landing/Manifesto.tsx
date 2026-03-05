"use client";

import { useReveal } from "@/hooks/useReveal";

const FEATURES = [
  {
    title: "Every guest is manually reviewed",
    body:
      "We read every application. No bots, no auto-approvals. If you're in, the room already trusts you.",
  },
  {
    title: "The algorithm does the heavy lifting",
    body:
      "Answer 20 questions. Nobel Prize-winning economics + relationship science finds who you'll actually click with.",
  },
];

const STATS = [
  { value: "7", label: "Cities across Asia" },
  { value: "30K+", label: "Verified members" },
  { value: "100", label: "Guests max per event" },
  { value: "100%", label: "Manually reviewed" },
];

export default function Manifesto() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className="reveal-section px-4 sm:px-6 lg:px-20 py-20 lg:py-32"
      style={{ backgroundColor: "var(--bg-panel)" }}
    >
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        {/* Left */}
        <div>
          <p
            className="uppercase font-semibold mb-4"
            style={{
              color: "var(--primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              letterSpacing: "0.12em",
            }}
          >
            Our Standard
          </p>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(28px, 3.5vw, 52px)",
              color: "var(--text)",
              lineHeight: 1.12,
              marginBottom: "40px",
            }}
          >
            Most let anyone in.{" "}
            <em style={{ color: "var(--primary)", fontStyle: "italic" }}>
              We don&apos;t.
            </em>
          </h2>

          <div className="flex flex-col gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-6 transition-all"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderLeftColor = "var(--primary)";
                  (e.currentTarget as HTMLDivElement).style.borderLeftWidth = "3px";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderLeftColor = "var(--border)";
                  (e.currentTarget as HTMLDivElement).style.borderLeftWidth = "1px";
                }}
              >
                <h3
                  className="font-semibold mb-2"
                  style={{ fontFamily: "var(--font-sans)", color: "var(--text)", fontSize: "16px" }}
                >
                  {f.title}
                </h3>
                <p style={{ fontFamily: "var(--font-sans)", color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-6">
          {/* Quote block */}
          <div
            className="p-8"
            style={{ backgroundColor: "#080808", borderRadius: "16px" }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "72px",
                color: "var(--primary)",
                lineHeight: 1,
                marginBottom: "8px",
                opacity: 0.9,
              }}
            >
              &ldquo;
            </div>
            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                fontSize: "clamp(18px, 2vw, 24px)",
                color: "#F3F1E8",
                lineHeight: 1.5,
                marginBottom: "24px",
              }}
            >
              I met my co-founder at a Never Strangers mixer. Best Tuesday night ever.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "rgba(243,241,232,0.5)" }}>
              — Sarah L., Singapore
            </p>
          </div>

          {/* Stats grid */}
          <div
            className="grid grid-cols-2 gap-px overflow-hidden"
            style={{ borderRadius: "16px", backgroundColor: "var(--border)" }}
          >
            {STATS.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center text-center py-8 px-4"
                style={{ backgroundColor: "var(--bg)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(32px, 4vw, 48px)",
                    color: "var(--text)",
                    lineHeight: 1,
                    marginBottom: "6px",
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
