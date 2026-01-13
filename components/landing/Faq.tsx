"use client";

import { useState } from "react";
import { FAQ_ITEMS } from "./content";

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h6 className="text-sm md:text-base font-semibold text-gray-medium uppercase tracking-wider mb-8 md:mb-12 text-center">
        Got a question?
      </h6>

      <div className="space-y-4">
        {FAQ_ITEMS.map((item, index) => (
          <div
            key={index}
            className="border-b border-beige-frame last:border-b-0"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full text-left py-4 md:py-6 flex justify-between items-center gap-4 hover:text-red-accent transition-colors"
              aria-expanded={openIndex === index}
            >
              <span className="text-lg md:text-xl font-semibold text-gray-dark">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 flex-shrink-0 text-gray-medium transition-transform ${
                  openIndex === index ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === index && (
              <div className="pb-4 md:pb-6">
                <p className="text-base md:text-lg text-gray-medium leading-relaxed whitespace-pre-line">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
