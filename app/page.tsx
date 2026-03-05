import type { Metadata } from "next";
import AnnouncementBar from "@/components/landing/AnnouncementBar";
import Hero from "@/components/landing/Hero";
import PressBar from "@/components/landing/PressBar";
import CityTicker from "@/components/landing/CityTicker";
import PhotoScroll from "@/components/landing/PhotoScroll";
import Manifesto from "@/components/landing/Manifesto";
import Testimonials from "@/components/landing/Testimonials";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const LANDING_DESC =
  "Using an algorithm to find your ideal partner at the party itself. We are bringing back the joys of connecting with people organically. Say goodbye to dating apps!";

export const metadata: Metadata = {
  title: "Never Strangers - A New Way to Meet People",
  description: LANDING_DESC,
  alternates: {
    canonical: "https://thisisneverstrangers.com/",
  },
  openGraph: {
    title: "Never Strangers - A New Way to Meet People",
    description: LANDING_DESC,
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
    description: LANDING_DESC,
    images: ["https://thisisneverstrangers.com/wp-content/uploads/2026/01/1-2.webp"],
  },
};

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Hero />
      <PressBar />
      <CityTicker />
      <PhotoScroll />
      <Manifesto />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </>
  );
}
