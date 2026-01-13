import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import ImageCarousel from "@/components/landing/ImageCarousel";
import WhySection from "@/components/landing/WhySection";
import FeaturedIn from "@/components/landing/FeaturedIn";
import HowItWorks from "@/components/landing/HowItWorks";
import Faq from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Never Strangers - A New Way to Meet People",
  description:
    "Using an algorithm to find your idea partner at the party itself. We are bringing back the joys of connecting with people organically. Say goodbye to dating apps!",
  alternates: {
    canonical: "https://thisisneverstrangers.com/",
  },
  openGraph: {
    title: "Never Strangers - A New Way to Meet People",
    description:
      "Using an algorithm to find your idea partner at the party itself. We are bringing back the joys of connecting with people organically. Say goodbye to dating apps!",
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
    title: "Never Strangers - A New Way to Meet People",
    description:
      "Using an algorithm to find your idea partner at the party itself. We are bringing back the joys of connecting with people organically. Say goodbye to dating apps!",
    images: ["https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp"],
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <ImageCarousel />
      <WhySection />
      <FeaturedIn />
      <HowItWorks />
      <Faq />
      <Footer />
    </>
  );
}


