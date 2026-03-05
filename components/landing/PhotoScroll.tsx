"use client";

const PHOTO_CARDS = [
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2025/12/Screenshot-2024-12-02-at-5.32.35-PM-1.webp",
    city: "SINGAPORE",
    event: "Winter Mixer",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp",
    city: "HONG KONG",
    event: "Rooftop Social",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/02/Photo-123-1.webp",
    city: "BANGKOK",
    event: "Garden Party",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2025/12/Screenshot-2024-12-02-at-5.32.35-PM-1.webp",
    city: "MANILA",
    event: "Dinner Mixer",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp",
    city: "KUALA LUMPUR",
    event: "Cocktail Evening",
  },
  {
    src: "https://thisisneverstrangers.com/wp-content/uploads/2026/02/Photo-123-1.webp",
    city: "CEBU",
    event: "Beach Social",
  },
];

export default function PhotoScroll() {
  return (
    <section style={{ backgroundColor: "var(--bg)", paddingTop: "80px", paddingBottom: "80px" }}>
      <style>{`
        @keyframes photoScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .photo-scroll-track {
          display: flex;
          animation: photoScroll 30s linear infinite;
          will-change: transform;
        }
        .photo-scroll-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Section header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 mb-10">
        <p
          className="uppercase font-semibold mb-3"
          style={{
            color: "var(--primary)",
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            letterSpacing: "0.12em",
          }}
        >
          The Crowd
        </p>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 3.5vw, 52px)", color: "var(--text)", lineHeight: 1.12 }}>
          Anywhere.{" "}
          <em style={{ color: "var(--primary)", fontStyle: "italic" }}>
            Always the right crowd.
          </em>
        </h2>
      </div>

      {/* Scrolling strip */}
      <div className="overflow-hidden">
        <div className="photo-scroll-track" style={{ gap: "16px", padding: "8px 8px" }}>
          {[...PHOTO_CARDS, ...PHOTO_CARDS].map((card, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 overflow-hidden"
              style={{
                width: "clamp(240px, 22vw, 320px)",
                height: "clamp(310px, 28vw, 410px)",
                borderRadius: "16px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.src}
                alt={`${card.city} ${card.event}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }}
              />
              {/* Labels */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  {card.city}
                </p>
                <p
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "var(--font-heading)",
                    fontSize: "18px",
                    fontStyle: "italic",
                    lineHeight: 1.2,
                  }}
                >
                  {card.event}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
