import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 data-testid="home-title" className="text-5xl md:text-6xl font-bold text-gray-dark mb-6">
          Meet your new <span className="text-red-accent">friend.</span>
        </h1>
        <p className="text-xl text-gray-medium mb-12">
          Invite-only matching for meaningful connections.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/onboarding"
            data-testid="home-cta-onboarding"
            className="bg-red-accent text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Book Your Slot
          </Link>
          <Link
            href="/register"
            data-testid="home-cta-match"
            className="bg-gray-dark text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Link>
        </div>
        <p className="text-sm text-gray-medium mt-8">
          Now in Singapore, Kuala Lumpur, Manila, Bangkok and Hong Kong.
        </p>
      </div>
    </div>
  );
}


