import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroSection } from "@/components/landing/home/HeroSection";
import { StatsStrip } from "@/components/landing/home/StatsStrip";
import { ProblemSection } from "@/components/landing/home/ProblemSection";
import { HowItWorks } from "@/components/landing/home/HowItWorks";
import { LiveTeaser } from "@/components/landing/home/LiveTeaser";
import { CohortsSection } from "@/components/landing/home/CohortsSection";
import { IntegrationSection } from "@/components/landing/home/IntegrationSection";
import { HackathonBand } from "@/components/landing/home/HackathonBand";
import { FinalCta } from "@/components/landing/home/FinalCta";

gsap.registerPlugin(ScrollTrigger);

/**
 * Landing page `/` — dark, cinematic, audio-centric (home.md).
 * Lenis smooth scroll page-wide (lerp 0.1), GSAP ScrollTrigger for all
 * scroll-driven motion, ink-950 + dotted grid texture throughout.
 */
export default function Home() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // ensure triggers measure correctly after fonts/images settle
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      clearTimeout(refresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-ink-950 bg-dotted-grid text-ink-100">
      <LandingNavbar />
      <main>
        <HeroSection />
        <StatsStrip />
        <ProblemSection />
        <HowItWorks />
        <LiveTeaser />
        <CohortsSection />
        <IntegrationSection />
        <HackathonBand />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
