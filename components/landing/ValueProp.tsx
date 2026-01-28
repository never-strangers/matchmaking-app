"use client";

export default function ValueProp() {
  const valueCards = [
    {
      icon: "🔒",
      title: "Invite-Only",
      description: "Vetted members only. Safe, curated, real.",
    },
    {
      icon: "🎯",
      title: "Matched for You",
      description: "Answer 10 questions, we do the rest.",
    },
    {
      icon: "💬",
      title: "Real Connections",
      description: "Meet in person, chat after if you both click.",
    },
  ];

  return (
    <section
      className="px-6 py-20 lg:px-20 lg:py-32"
      style={{ backgroundColor: "var(--bg-panel)" }}
    >
      <div className="max-w-7xl mx-auto">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--text-subtle)", letterSpacing: "0.08em" }}
        >
          WHY NEVER STRANGERS
        </p>
        <h2
          className="text-4xl lg:text-5xl font-bold mb-6"
          style={{ color: "var(--text)", fontFamily: "'Cabinet Grotesk', system-ui, sans-serif" }}
        >
          More than just a social mixer.
        </h2>
        <p
          className="text-lg lg:text-xl mb-12 max-w-2xl leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          We bring back the joy of connecting with people organically. Say goodbye to online apps — with a little help from us, we&apos;ll find your ideal match at a mixer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {valueCards.map((card, index) => (
            <div
              key={index}
              className="p-8 rounded-xl transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: "var(--text)" }}
              >
                {card.title}
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
