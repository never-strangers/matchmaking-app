import Link from "next/link";
import { HOW_IT_WORKS_STEPS } from "./content";

export default function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h6 className="text-sm md:text-base font-semibold text-gray-medium uppercase tracking-wider mb-8 md:mb-12 text-center">
        How it Works
      </h6>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <div key={step.number} className="flex flex-col">
            <h3 className="text-xl md:text-2xl font-bold text-gray-dark mb-4">
              {step.number}) {step.title}
            </h3>
            <p className="text-base md:text-lg text-gray-medium leading-relaxed">
              {step.linkText && step.linkUrl ? (
                <>
                  {step.text.substring(0, step.text.indexOf(step.linkText))}
                  <Link
                    href={step.linkUrl}
                    className="underline hover:no-underline text-red-accent"
                  >
                    {step.linkText}
                  </Link>
                  {step.text.substring(step.text.indexOf(step.linkText) + step.linkText.length)}
                </>
              ) : (
                step.text
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
