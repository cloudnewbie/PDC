import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Github } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Live demo", href: "#live-demo" },
  { label: "Integration", href: "#integration" },
];

/**
 * Landing navbar (design.md §6.1) — fixed, blurred dark bar; shrinks
 * 72px → 56px after 40px of scroll; active anchor gets a teal underline
 * that slides with framer `layoutId`.
 */
export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      // track which section is in view
      let current = "";
      for (const l of LINKS) {
        const el = document.querySelector(l.href);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = l.href;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-ink-700 bg-ink-950/70 backdrop-blur-xl transition-all duration-300",
        scrolled ? "h-14" : "h-[72px]",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="PDC logo" className="h-7 w-7" />
          <span className="text-[15px] font-semibold text-ink-100">Post-Discharge Check</span>
          <span className="rounded border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-teal-400">
            PDC
          </span>
        </Link>

        {/* center links */}
        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={scrollTo(l.href)}
              className={cn(
                "relative py-1 text-[13px] font-medium transition-colors",
                active === l.href ? "text-ink-100" : "text-ink-400 hover:text-ink-100",
              )}
            >
              {l.label}
              {active === l.href && (
                <motion.span
                  layoutId="landing-nav-underline"
                  className="absolute inset-x-0 -bottom-[2px] h-[2px] rounded-full bg-teal-400"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </a>
          ))}
        </nav>

        {/* right */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hidden text-ink-400 transition-colors hover:text-ink-100 sm:block"
          >
            <Github className="h-[18px] w-[18px]" />
          </a>
          <Link
            to="/app"
            className="rounded-xl bg-teal-500 px-4 py-2 text-[13px] font-semibold text-white shadow-teal-glow transition-colors hover:bg-teal-600"
          >
            Open the app →
          </Link>
        </div>
      </div>
    </header>
  );
}
