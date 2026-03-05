export default function CityTicker() {
  const cities =
    "Singapore · Kuala Lumpur · Manila · Bangkok · Hong Kong · Cebu · Ho Chi Minh City · ";

  return (
    <div
      className="w-full overflow-hidden py-3"
      style={{ backgroundColor: "var(--primary)" }}
    >
      <style>{`
        @keyframes tick {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .city-ticker-track {
          display: flex;
          white-space: nowrap;
          animation: tick 24s linear infinite;
          will-change: transform;
        }
        .city-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="city-ticker-track">
        {[0, 1, 2, 3].map((n) => (
          <span
            key={n}
            style={{
              color: "#FFFFFF",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontSize: "15px",
              paddingRight: "2rem",
              opacity: 0.92,
            }}
          >
            {cities}
          </span>
        ))}
      </div>
    </div>
  );
}
