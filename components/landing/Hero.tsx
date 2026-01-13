"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CITIES } from "./content";

const ROTATING_WORDS = ["date", "friend"];
const ROTATION_DELAY = 1500; // 1500ms

export default function Hero() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, ROTATION_DELAY);

    return () => clearInterval(interval);
  }, []);

  const citiesText = `Now in ${CITIES.join(", ")}.`;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-dark mb-8 md:mb-12">
        <span className="inline-block">Meet your new</span>{" "}
        <span className="text-red-accent inline-block min-w-[120px] md:min-w-[150px] text-left relative">
          <span
            key={currentWordIndex}
            className="inline-block animate-fade-in"
          >
            {ROTATING_WORDS[currentWordIndex]}.
          </span>
        </span>
      </h1>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 md:mb-12">
        <Link
          href="/booking"
          className="bg-red-accent text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity w-full sm:w-auto text-center"
        >
          Book Your Slot
        </Link>
        <Link
          href="/register"
          className="bg-gray-dark text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity w-full sm:w-auto text-center"
        >
          Sign Up
        </Link>
      </div>

      <p className="text-sm md:text-base text-gray-medium">{citiesText}</p>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </section>
  );
}
