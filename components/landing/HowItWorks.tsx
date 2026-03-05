const steps = [
  {
    number: "01",
    title: "Sign Up",
    description:
      "Request an invite and get vetted by our team. We keep it curated.",
  },
  {
    number: "02",
    title: "Book Your Spot",
    description: "Browse upcoming events in your city and RSVP.",
  },
  {
    number: "03",
    title: "Turn Up at the Mixer",
    description: "Check in, meet people, be yourself.",
  },
  {
    number: "04",
    title: "Get Your Matches",
    description:
      "After the event, see who you clicked with. Mutual like? Start chatting.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="px-4 py-14 sm:px-6 sm:py-16 lg:px-20 lg:py-32"
      style={{ backgroundColor: "var(--bg-muted)" }}
    >
      <div className="max-w-7xl mx-auto">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-4 text-center"
          style={{ color: "var(--text-subtle)", letterSpacing: "var(--tracking-label)" }}
        >
          HOW IT WORKS
        </p>
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-8 sm:mb-12 text-center"
          style={{ color: "var(--text)", fontFamily: "var(--font-heading)" }}
        >
          Four steps from stranger to friend.
        </h2>

        <div className="space-y-4 sm:space-y-6">
          {steps.map((step, index) => (
            <div key={index}>
              <div
                className="p-6 sm:p-8 rounded-xl relative"
                style={{
                  backgroundColor: "var(--bg-panel)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-none mb-3 sm:mb-4"
                  style={{ color: "var(--primary)", opacity: "var(--opacity-ghost)" }}
                >
                  {step.number}
                </div>
                <h3
                  className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3"
                  style={{ color: "var(--text)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm sm:text-base leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="text-center my-3 sm:my-4">
                  <span
                    className="text-xl sm:text-2xl"
                    style={{ color: "var(--primary)" }}
                  >
                    ↓
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
