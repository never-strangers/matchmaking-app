import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import ValueProp from "@/components/landing/ValueProp";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Never Strangers - Meet Your New Connection",
  description:
    "Curated social events where real people meet — no apps, no algorithms, just you. Invite-only mixers designed for meaningful conversation.",
  alternates: {
    canonical: "https://thisisneverstrangers.com/",
  },
  openGraph: {
    title: "Never Strangers - Meet Your New Connection",
    description:
      "Curated social events where real people meet — no apps, no algorithms, just you.",
    url: "https://thisisneverstrangers.com/",
    siteName: "Never Strangers",
    images: [
      {
        url: "https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp",
        width: 1361,
        height: 927,
        alt: "Never Strangers",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Never Strangers - Meet Your New Connection",
    description:
      "Curated social events where real people meet — no apps, no algorithms, just you.",
    images: ["https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp"],
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <ValueProp />
      <HowItWorks />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </>
  );
}
