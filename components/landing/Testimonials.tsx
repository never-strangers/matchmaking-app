"use client";

import { useReveal } from "@/hooks/useReveal";

const CARDS = [
  {
    quote:
      "I came in skeptical. Left with a coffee date already booked for the next morning. The match was scarily accurate.",
    name: "Sarah T.",
    location: "Singapore",
    highlight: false,
  },
  {
    quote:
      "Never thought an algorithm could get me better than I get myself. The conversation just flowed — like we'd known each other for years.",
    name: "Marcus L.",
    location: "Hong Kong",
    highlight: true,
  },
  {
    quote:
      "The vetting process made me feel safe before I even walked in. Everyone was genuinely there for the right reasons.",
    name: "Priya R.",
    location: "Bangkok",
    highlight: false,
  },
];

const Stars = () => (
  <div className="flex gap-1 mb-4" aria-label="5 stars">
    {[...Array(5)].map((_, i) => (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

export default function Testimonials() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className="reveal-section px-4 sm:px-6 lg:px-20 py-20 lg:py-32"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="max-w-7xl mx-auto">
        <p
          className="uppercase font-semibold mb-4"
          style={{
            color: "var(--primary)",
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            letterSpacing: "0.12em",
          }}
        >
          Real Stories
        </p>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(28px, 3.5vw, 52px)",
            color: "var(--text)",
            lineHeight: 1.12,
            marginBottom: "48px",
          }}
        >
          What they said{" "}
          <em style={{ color: "var(--primary)", fontStyle: "italic" }}>after.</em>
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {CARDS.map((card, i) => (
            <div
              key={i}
              className="flex flex-col p-7"
              style={{
                backgroundColor: card.highlight ? "var(--primary)" : "#FFFFFF",
                borderRadius: "16px",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <Stars />
              <blockquote
                className="flex-1 mb-6"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  fontSize: "clamp(17px, 1.6vw, 21px)",
                  color: card.highlight ? "#FFFFFF" : "var(--text)",
                  lineHeight: 1.55,
                }}
              >
                &ldquo;{card.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: card.highlight ? "rgba(255,255,255,0.2)" : "var(--bg)",
                    color: card.highlight ? "#FFFFFF" : "var(--primary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {card.name[0]}
                </div>
                <div>
                  <p
                    className="font-semibold text-sm"
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: card.highlight ? "#FFFFFF" : "var(--text)",
                    }}
                  >
                    {card.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: card.highlight ? "rgba(255,255,255,0.65)" : "var(--text-muted)",
                    }}
                  >
                    {card.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
