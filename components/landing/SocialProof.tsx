import Image from "next/image";
import { FEATURED_IN_LOGOS } from "./content";

export default function SocialProof() {
  return (
    <section
      className="px-4 py-14 sm:px-6 sm:py-16 lg:px-20 lg:py-20 xl:py-32 text-center"
      style={{ backgroundColor: "var(--bg-panel)" }}
    >
      <div className="max-w-7xl mx-auto">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-6 sm:mb-8"
          style={{ color: "var(--text-subtle)", letterSpacing: "0.08em" }}
        >
          FEATURED IN
        </p>

        <div className="grid grid-cols-2 gap-4 sm:gap-8 max-w-md mx-auto mb-8 sm:mb-12">
          {FEATURED_IN_LOGOS.map((logo, index) => (
            <div
              key={index}
              className="relative w-full aspect-video"
              style={{ filter: "grayscale(100%)", opacity: 0.6 }}
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, 200px"
              />
            </div>
          ))}
        </div>

        <div
          className="w-full max-w-2xl mx-auto mb-4"
          style={{ borderTop: "1px solid var(--border)" }}
        ></div>

        <blockquote
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl italic mb-4 max-w-2xl mx-auto leading-relaxed px-1"
          style={{
            color: "var(--text)",
            fontFamily: "'Lora', Georgia, serif",
          }}
        >
          &quot;I met my co-founder at a Never Strangers mixer. Best Tuesday night ever.&quot;
        </blockquote>
        <p
          className="text-sm"
          style={{ color: "var(--text-subtle)" }}
        >
          — Sarah L., Singapore
        </p>
      </div>
    </section>
  );
}
