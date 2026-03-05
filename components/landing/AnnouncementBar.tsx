import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <div
      className="w-full py-2.5 px-4 flex flex-wrap items-center justify-center gap-3 text-sm"
      style={{ backgroundColor: "var(--primary)", fontFamily: "var(--font-sans)" }}
    >
      <span style={{ color: "#FFFFFF" }}>
        ✦&nbsp;&nbsp;The Great Bali Getaway is here
      </span>
      <Link
        href="/trips"
        className="inline-flex items-center px-4 py-1 text-xs font-semibold transition-opacity hover:opacity-90"
        style={{
          backgroundColor: "#FFFFFF",
          color: "var(--primary)",
          borderRadius: "var(--radius-pill)",
          whiteSpace: "nowrap",
        }}
      >
        Join the waitlist →
      </Link>
    </div>
  );
}
