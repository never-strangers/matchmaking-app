"use client";

import { useEffect, useRef } from "react";

/**
 * Attaches an IntersectionObserver to the returned ref.
 * Elements with class `reveal-section` inside the observed root
 * fade up when they enter the viewport.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const style = document.createElement("style");
    style.textContent = `
      .reveal-section {
        opacity: 0;
        transform: translateY(22px);
        transition: opacity 0.7s ease, transform 0.7s ease;
      }
      .reveal-section.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    if (!document.head.querySelector("[data-reveal-styles]")) {
      style.setAttribute("data-reveal-styles", "true");
      document.head.appendChild(style);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
