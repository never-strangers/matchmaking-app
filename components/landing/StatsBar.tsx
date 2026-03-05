const STATS = [
  { value: "7", label: "Cities across Asia" },
  { value: "30K+", label: "Verified Members" },
  { value: "100", label: "Guests max per event" },
  { value: "100%", label: "Manually reviewed" },
];

export default function StatsBar() {
  return (
    <div className="w-full" style={{ backgroundColor: "var(--secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-0"
          style={{ minHeight: "80px" }}
        >
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center text-center py-5 px-4"
            >
              <span
                className="text-2xl sm:text-3xl font-bold leading-none"
                style={{
                  color: "var(--primary-foreground)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {stat.value}
              </span>
              <span
                className="text-xs uppercase mt-1.5 leading-tight"
                style={{
                  color: "var(--primary-foreground)",
                  opacity: 0.65,
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "var(--tracking-label)",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
