import Image from "next/image";
import { FEATURED_IN_LOGOS } from "./content";

export default function FeaturedIn() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-dark mb-8 md:mb-12 text-center">
        Featured in
      </h2>

      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
        {FEATURED_IN_LOGOS.map((logo, index) => (
          <div
            key={index}
            className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              className="object-contain opacity-70 hover:opacity-100 transition-opacity"
              sizes="(max-width: 768px) 128px, 160px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
