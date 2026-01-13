"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { LANDING_CAROUSEL_IMAGES } from "./content";

const AUTOPLAY_DELAY = 5000; // 5 seconds
const VISIBLE_IMAGES = 3; // Show 3 images side-by-side

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, LANDING_CAROUSEL_IMAGES.length - VISIBLE_IMAGES);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, AUTOPLAY_DELAY);

    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, LANDING_CAROUSEL_IMAGES.length - VISIBLE_IMAGES);
      return prev === 0 ? maxIndex : prev - 1;
    });
  };

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, LANDING_CAROUSEL_IMAGES.length - VISIBLE_IMAGES);
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-dark mb-8 md:mb-12 text-center">
        We all start as <em className="not-italic font-normal">Strangers.</em>
      </h2>

      <div className="relative w-full max-w-7xl mx-auto">
        {/* Carousel Container */}
        <div className="relative overflow-hidden w-full">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${(currentIndex * 100) / VISIBLE_IMAGES}%)`,
            }}
          >
            {LANDING_CAROUSEL_IMAGES.map((src, index) => (
              <div
                key={index}
                className="relative flex-shrink-0"
                style={{ 
                  width: `${100 / VISIBLE_IMAGES}%`,
                  aspectRatio: '4/3',
                }}
              >
                <Image
                  src={src}
                  alt={`Carousel image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes={`(max-width: 768px) ${100 / VISIBLE_IMAGES}vw, (max-width: 1200px) ${80 / VISIBLE_IMAGES}vw, ${1200 / VISIBLE_IMAGES}px`}
                  priority={index < VISIBLE_IMAGES}
                />
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full shadow-lg transition-all z-10 backdrop-blur-sm"
            aria-label="Previous images"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full shadow-lg transition-all z-10 backdrop-blur-sm"
            aria-label="Next images"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
