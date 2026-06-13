"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Script from "next/script";

// app/page.tsx
// Horizontal scroll on features: GSAP ScrollTrigger (pin + scrub)
// All other animations: pure CSS keyframes — zero other libraries.

type LordIconConfig = {
  src: string;
  trigger: string;
  delay?: number;
  state?: string;
  style: CSSProperties;
};

type ShowcaseItem = {
  title: string;
  desc: string;
  image?: string;
  icon?: LordIconConfig;
};

const showcaseItems: ShowcaseItem[] = [
  {
    title: "Secure Token Wrapping",
    desc: "Experience seamless conversion of standard ERC-20 tokens into fully encrypted confidential assets with a single click.",
    icon: {
      src: "https://cdn.lordicon.com/csujbpgj.json",
      trigger: "loop",
      state: "loop-cycle",
      style: { width: "150px", height: "150px" },
    },
  },
  {
    title: "On-Chain Privacy",
    desc: "Your balances are encrypted using FHE technology, ensuring only you can access your financial data.",
    icon: {
      src: "https://cdn.lordicon.com/rhmhivzj.json",
      trigger: "loop",
      state: "loop-spin",
      style: { width: "150px", height: "150px" },
    },
  },
  {
    title: "Real-Time Analytics",
    desc: "Track Total Value Shielded and transaction volumes across all supported pairs in real time.",
    icon: {
      src: "https://cdn.lordicon.com/xowcggal.json",
      trigger: "loop",
      state: "loop-all",
      style: { width: "150px", height: "150px" },
    },
  },
  {
    title: "Testnet Faucet",
    desc: "Get free test tokens on Sepolia to experiment with all Latise features without spending real assets.",
    icon: {
      src: "https://cdn.lordicon.com/rnvphzfj.json",
      trigger: "loop",
      state: "loop-rotate",
      style: { width: "150px", height: "150px" },
    },
  },
];

export default function Home() {

  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef  = useRef<HTMLDivElement>(null);
  const showcaseCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const heroInlineIconRef = useRef<HTMLSpanElement>(null);
  const [heroIconMorphed, setHeroIconMorphed] = useState(false);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;

    const init = async () => {
      // Dynamic import keeps GSAP out of the SSR bundle
      const { default: gsap }   = await import("gsap");
      const { ScrollTrigger }   = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const sticky = stickyRef.current;
      const track  = trackRef.current;
      if (!sticky || !track) return;

      ctx = gsap.context(() => {
        gsap.to(track, {
          // Slide the track left until its right edge meets the viewport right edge
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: sticky,          // pin this element
            start: "top top",         // when its top hits the viewport top
            end: () =>
              `+=${track.scrollWidth - window.innerWidth}`,
            scrub: 1,                 // 1-second lag = buttery smooth
            pin: true,                // GSAP owns the pinning (no manual height math)
            anticipatePin: 1,         // prevents the brief jump on fast scrolls
            invalidateOnRefresh: true // recalculates on window resize
          },
        });
      }, sticky);
    };

    init();
    return () => ctx?.revert();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.transitionDelay = `${i * 0.1}s`;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1
      }
    );

    showcaseCardsRef.current.forEach(card => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = heroInlineIconRef.current;
    if (!target || heroIconMorphed) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          observer.unobserve(entry.target);
          timeoutId = setTimeout(() => {
            setHeroIconMorphed(true);
          }, 3000);
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [heroIconMorphed]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const wrapper = document.createElement("div");
      wrapper.className = "click-burst";
      wrapper.style.cssText = `left:${e.clientX}px; top:${e.clientY}px;`;

      const icon = document.createElement("span");
      icon.className = "nav-logo-icon";
      wrapper.appendChild(icon);
      document.body.appendChild(wrapper);

      wrapper.addEventListener("animationend", () => wrapper.remove());
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);
  const heroIconProps = heroIconMorphed
    ? { trigger: "morph", state: "morph-coins" }
    : { trigger: "in", state: "in-reveal", delay: 1500 };

  return (
    <>
      <style>{`
        /* ── Reset & base ───────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #ffffff;
          color: #1a1a1a;
          -webkit-font-smoothing: antialiased;
          font-family: "Google Sans", sans-serif;
        }

        /* ── Colour tokens ──────────────────────────────────────── */
        :root {
          --green-dark:   #0d3b2e;
          --green-mid:    #1a5c44;
          --green-btn:    #1b5e42;
          --green-btn-hv: #174d38;
          --text-muted:   #6b6b6b;
          --nav-text:     #2c2c2c;
        }

        .page-wrapper { overflow-x: hidden; }

        /* ══════════════════════════════════════════════════════════
           NAV
        ══════════════════════════════════════════════════════════ */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 48px;
          height: 72px;
          position: sticky;
          top: 0;
          background: #fff;
          z-index: 100;
          border-bottom: 1px solid transparent;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--green-dark);
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.3px;
          font-family: var(--font-dm-sans), sans-serif;
        }
        @keyframes clickIconPop {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(0.2); }
          45%  { opacity: 1; transform: translate(-50%, -50%) scale(0.6); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        .click-burst {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          animation: clickIconPop 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .nav-logo-icon {
          width: 28px;
          height: 28px;
          position: relative;
          flex-shrink: 0;
        }
        .nav-logo-icon::before,
        .nav-logo-icon::after {
          content: "";
          position: absolute;
          top: 2px; left: 2px;
          width: 24px; height: 24px;
        }
        .nav-logo-icon::before {
          background: linear-gradient(
            to bottom,
            transparent 4px,
            var(--green-dark) 4px, var(--green-dark) 6.5px,
            transparent 6.5px, transparent 14.5px,
            var(--green-dark) 14.5px, var(--green-dark) 17.5px,
            transparent 17.5px
          );
        }
        .nav-logo-icon::after {
          background: linear-gradient(
            to right,
            transparent 4px,
            var(--green-dark) 4px, var(--green-dark) 6.5px,
            transparent 6.5px, transparent 14.5px,
            var(--green-dark) 14.5px, var(--green-dark) 17.5px,
            transparent 17.5px
          );
        }
        .nav-links {
          display: flex; align-items: center; gap: 36px; list-style: none;
        }
        .nav-links a {
          text-decoration: none; color: var(--nav-text);
          font-size: 15px; font-weight: 400;
          display: flex; align-items: center; gap: 4px;
          transition: color 0.15s;
        }
        .nav-links a:hover { color: var(--green-dark); }
        .nav-chevron { width: 14px; height: 14px; opacity: 0.55; }
        .nav-actions { display: flex; align-items: center; gap: 24px; }
        .btn-contact {
          background: var(--green-btn); color: #fff;
          border: none; border-radius: 3.75rem; padding: 12px 28px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-contact:hover { background: var(--green-btn-hv); transform: scale(0.99); }
        .btn-contact .arrow-icon { transform: translateX(0); transition: transform 0.15s ease; }
        .btn-contact:hover .arrow-icon { transform: translateX(4px); }
        .nav-signin {
          color: var(--nav-text); font-size: 15px;
          text-decoration: none; font-weight: 400; transition: color 0.15s;
        }
        .nav-signin:hover { color: var(--green-dark); }

        /* ══════════════════════════════════════════════════════════
           HERO
        ══════════════════════════════════════════════════════════ */
        .hero {
          text-align: center;
          padding: 100px 24px 80px;
          max-width: 900px;
          margin: 0 auto;
        }
        .hero-headline {
          font-size: clamp(42px, 6vw, 72px);
          font-weight: 700; line-height: 1.12;
          color: var(--green-dark); letter-spacing: -1.5px;
          margin-bottom: 24px;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .hero-inline-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          margin-left: 10px;
          // transform: translateY(10px);
        }

        @keyframes wave {
          0%   { transform: translateY(0px); }
          25%  { transform: translateY(-10px); }
          50%  { transform: translateY(0px); }
          75%  { transform: translateY(4px); }
          100% { transform: translateY(0px); }
        }
        .wave-char {
          display: inline-block;
          animation: wave 0.8s ease forwards;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .wave-space { display: inline-block; width: 0.28em; }

        .hero-subtext {
          font-size: 17px; color: var(--text-muted); line-height: 1.65;
          max-width: 540px; margin: 0 auto 40px;
          opacity: 0; transform: translateY(16px);
          animation: fadeUp 0.6s ease 0.85s forwards;
        }
        .btn-cta {
          display: inline-block; background: var(--green-btn); color: #fff;
          border-radius: 13px; padding: 16px 48px; font-size: 17px; font-weight: 600;
          text-decoration: none; cursor: pointer; border: none;
          transition: background 0.15s, box-shadow 0.15s;
          opacity: 0; animation: fadeUp 0.6s ease 1s forwards;
          box-shadow: 0 4px 16px rgba(27, 94, 66, 0.25);
        }
        .btn-cta:hover {
          background: var(--green-btn-hv);
          
          box-shadow: 0 8px 24px rgba(27, 94, 66, 0.3);
        }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

        /* ══════════════════════════════════════════════════════════
           CARD GRID
        ══════════════════════════════════════════════════════════ */
        .cards-section {
          padding: 0 32px 100px;
          max-width: 1500px;
          margin: 0 auto;
          overflow: hidden;
        }
        .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

        @keyframes cardRise {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card {
          border-radius: 20px; padding: 36px 30px 0;
          height: 360px; display: flex;
          flex-direction: column; justify-content: space-between;
          overflow: hidden; position: relative;
          opacity: 0;
          cursor: pointer;
          animation: cardRise 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .card:nth-child(1) { animation-delay: 1.1s; }
        .card:nth-child(2) { animation-delay: 1.25s; }
        .card:nth-child(3) { animation-delay: 1.4s; }
        .card:nth-child(4) { animation-delay: 1.55s; }

        .card-mint   { background: #d6ede6; }
        .card-purple { background: #5b4b8a; }
        .card-dark   { background: #0d3b2e; }
        .card-cream  { background: #e8dfd0; }

        .card-text { font-size: 18px; font-weight: 500; line-height: 1.5; max-width: 250px; }
        .card-mint   .card-text { color: #0d3b2e; }
        .card-purple .card-text { color: #ffffff; }
        .card-dark   .card-text { color: #ffffff; }
        .card-cream  .card-text { color: #2a2a2a; }

        .card-small-writing{
            font-size: 16px;  font-weight: 400; line-height: 1.5;
        }

        .card-illustration {
          margin-top: 32px; height: 110px;
          position: relative; display: flex;
          align-items: flex-end; justify-content: flex-end;
        }

        .coins-image {
          object-fit: contain;
        }

        .illus-mint  { width: 100%; height: 100%; position: relative; overflow: hidden; }
        .illus-mint::before {
          content: ""; position: absolute;
          bottom: -10px; left: 50%; transform: translateX(-50%);
          width: 180px; height: 140px;
          background: var(--green-dark);
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }

        .illus-purple { width: 100%; height: 100%; position: relative; overflow: hidden; }
        .illus-purple::before {
          content: ""; position: absolute;
          bottom: -20px; right: -10px;
          width: 130px; height: 130px;
          background: #e05a2b; border-radius: 50%;
        }
        .illus-purple::after {
          content: ""; position: absolute;
          bottom: 20px; right: 30px;
          width: 90px; height: 90px;
          border: 14px solid #f5f5f5; border-radius: 50%;
          clip-path: polygon(0% 0%, 60% 0%, 60% 100%, 0% 100%);
        }

        .illus-dark { width: 100%; height: 100%; position: relative; overflow: hidden; }
        .illus-dark::before {
          content: ""; position: absolute;
          bottom: -10px; left: 10px;
          width: 130px; height: 130px;
          background: #1e7a58;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
        .illus-dark::after {
          content: ""; position: absolute;
          bottom: -10px; left: 44px;
          width: 80px; height: 80px;
          background: #2ba876;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }

        .illus-cream { width: 100%; height: 100%; position: relative; overflow: hidden; }
        .illus-cream::before {
          content: ""; position: absolute;
          bottom: -30px; right: 10px;
          width: 110px; height: 110px;
          background: #e05a2b; border-radius: 50%;
        }
        .illus-cream::after {
          content: ""; position: absolute;
          bottom: 38px; right: 22px;
          width: 86px; height: 12px;
          background: #c44d24; border-radius: 4px;
        }

        /* ══════════════════════════════════════════════════════════
           FEATURES — GSAP-driven horizontal scroll
           
           .features          → background container only; GSAP injects
                                 a spacer div after .features-sticky to
                                 hold the scroll distance.
           .features-sticky   → the element GSAP pins (100vh tall).
                                 overflow:hidden clips the moving track.
           .features-header   → stationary eyebrow + heading
           .features-track    → the wide flex row GSAP translates on X
        ══════════════════════════════════════════════════════════ */
        .features {
          background: #f8f9f7;
          /* No padding, no manual height — GSAP owns all of that */
        }

        .features-sticky {
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 40px;
          overflow: hidden;          /* clips the track as it scrolls */
          background: #f8f9f7;       /* repeated so the GSAP-fixed clone matches */
        }

        .features-header {
          padding: 0 48px;
          flex-shrink: 0;
        }

        .features-eyebrow {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--green-mid);
          margin-bottom: 16px;
        }

        .features-heading {
          font-size: clamp(34px, 4.5vw, 56px);
          font-weight: 700;
          color: var(--green-dark);
          letter-spacing: -0.8px;
          max-width: 640px;
          font-family: var(--font-dm-sans), sans-serif;
        }

        /* Wide flex row — wider than the viewport; GSAP translates it */
        .features-track {
          display: flex;
          flex-wrap: nowrap;
          gap: 20px;
          padding: 0 48px;
          flex-shrink: 0;
          will-change: transform;
        }

        /* ── Feature card ───────────────────────────────────────── */
        .feature-item {
          flex-shrink: 0;            /* never collapse inside the flex track */
          text-align: left;
          padding: 32px;
          border-radius: 16px;
          border: 1px solid #e8ede9;
          width: 600px;              /* Increased width for desktop */
          min-height: 400px;
          cursor: pointer;
        }

        .feature-icon {
          width: 100px; height: 100px;
          background: #ffffffff; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px; font-size: 20px;
        }
        .feature-title {
          font-size: 25px; font-weight: 600;
          font-family: var(--font-dm-sans), sans-serif;
          margin-bottom: 12px;
        }
        .feature-desc {
          font-size: 14px;  line-height: 1.65;
        }

        /* ══════════════════════════════════════════════════════════
           FOOTER
        ══════════════════════════════════════════════════════════ */
        /* ══════════════════════════════════════════════════════════
           FOOTER — cream + oversized wordmark
        ══════════════════════════════════════════════════════════ */
        .footer-new {
          background: #f5f5e6;
          overflow: hidden;
        }

        /* ── Three columns ── */
        .footer-cols {
          display: flex;
          justify-content: space-between;
          padding: 80px 64px 60px;
          gap: 40px;
        }

        .footer-col-new {
          flex: 1;
        }

        .footer-col-heading {
          font-size: 28px;
          font-weight: 400;
          color: #b0b09a;
          margin-bottom: 28px;
          font-family: var(--font-dm-sans), "Google Sans", sans-serif;
          letter-spacing: -0.3px;
        }

        .footer-col-new ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .footer-col-new ul a {
          text-decoration: none;
          color: #1a1a1a;
          font-size: 16px;
          font-weight: 600;
          transition: opacity 0.15s;
        }
        .footer-col-new ul a:hover { opacity: 0.55; }

        /* ── Wordmark row ── */
        .footer-wordmark-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 0 40px;
          height: 220px;          /* controls how much of the wordmark shows */
          overflow: hidden;
        }

        /* Scaled-up lattice icon */
        .footer-big-icon {
          display: block;
          flex-shrink: 0;
          width: 170px;
          height: 170px;
          position: relative;
          align-self: flex-end;
          margin-bottom: -20px;   /* lets it bleed off the bottom edge */
        }

        .footer-big-icon::before,
        .footer-big-icon::after {
          content: "";
          position: absolute;
          top: 11px; left: 11px;
          width: 148px; height: 148px;
        }

        .footer-big-icon::before {
          background: linear-gradient(
            to bottom,
            transparent 24px,
            #1a1a1a 24px, #1a1a1a 38px,
            transparent 38px, transparent 86px,
            #1a1a1a 86px, #1a1a1a 107px,
            transparent 107px
          );
        }

        .footer-big-icon::after {
          background: linear-gradient(
            to right,
            transparent 24px,
            #1a1a1a 24px, #1a1a1a 38px,
            transparent 38px, transparent 86px,
            #1a1a1a 86px, #1a1a1a 107px,
            transparent 107px
          );
        }

        /* Oversized wordmark — cropped at the bottom */
        .footer-wordmark {
          font-size: clamp(120px, 20vw, 240px);
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -4px;
          line-height: 1;
          font-family: var(--font-dm-sans), "Google Sans", sans-serif;
          white-space: nowrap;
          align-self: flex-end;
          margin-bottom: -0.12em; /* crop the descender line just like the reference */
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .footer-cols {
            flex-direction: column;
            padding: 48px 24px 40px;
          }
          .footer-wordmark-row {
            padding: 0 20px;
            height: 140px;
          }
          .footer-big-icon {
            width: 80px;
            height: 80px;
          }
        }

        /* ══════════════════════════════════════════════════════════
           RESPONSIVE
        ══════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .nav { padding: 0 20px; }
          .nav-links { display: none; }
          .hero { padding: 64px 20px 60px; }
          .cards-section { padding: 0 16px 80px; }
          .cards-grid { grid-template-columns: 1fr; }
          .features-header { padding: 0 20px; }
          .features-track { padding: 0 20px; }
          .card { height: 320px; }
        }
        @media (max-width: 500px) {
          .feature-item { width: 330px; min-height: 290px; }
          .feature-title {
            font-size: 18px;
          }
          .feature-desc {
          font-size: 12px;  line-height: 1.65;
          }
          .hero-subtext {font-size: 14px; color: var(--text-muted); line-height: 1.65;}
          .card-small-writing{
            font-size: 13px;  line-height: 1.65;
          }

          .btn-contact {
            border: none; border-radius: 3.75rem; padding: 10px 22px;
            font-size: 12px; font-weight: 500; cursor: pointer;

          }
          .btn-cta {
            border-radius: 10px; padding: 14px 36px; font-size: 14px; font-weight: 600;
          }
          .coins-image{
            width: 100px;
            height: 100px;
          }
        }

        /* Reduced-motion: skip the pin, wrap cards normally */
        /* ── New section with 4 cards ─────────────────────────────────── */
        .showcase-section {
          padding: 100px 32px;
          max-width: 1500px;
          margin: 0 auto;
          background: #ffffff;
        }
        .showcase-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .showcase-eyebrow {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--green-mid);
          margin-bottom: 16px;
        }
        .showcase-heading {
          font-size: clamp(34px, 4.5vw, 56px);
          font-weight: 700;
          color: var(--green-dark);
          font-family: var(--font-dm-sans), sans-serif;
          letter-spacing: -0.8px;
        }
        .showcase-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .showcase-card {
          width: 100%;
          max-width: 550px;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          opacity: 0;
          transform: translateY(40px);
          margin-bottom: 80px;
        }
        .showcase-card:hover {
          transform: translateY(-4px);
          
        }
        .showcase-card.visible {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .showcase-card-image {
          width: 100%;
          height: 240px;
          object-fit: cover;
        }
        .showcase-card-icon {
          width: 100%;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }
        .showcase-card-content {
          padding: 28px 24px 32px;
        }
        .showcase-card-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--green-dark);
          margin-bottom: 10px;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .showcase-card-desc {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        @media (max-width: 1024px) {
          .showcase-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .hero-inline-icon {
            margin-left: 6px;
            transform: translateY(4px);
            display: none;
          }
          .showcase-section {
            padding: 80px 16px;
          }
          .showcase-grid {
            grid-template-columns: 1fr;
          }
          .showcase-card-image {
            height: 250px;
          }
            .showcase-card {
              margin-bottom: 40px;
            }

        }
        @media (min-width: 1025px) {
          .showcase-grid {
            grid-template-columns: repeat(2, minmax(0, 550px));
            justify-content: center;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .wave-char, .hero-subtext, .btn-cta, .card, .showcase-card {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .features-track {
            flex-wrap: wrap;
            transform: none !important;
          }
        }
      `}</style>

      <div className="page-wrapper">

        {/* ── NAV ─────────────────────────────────────────────────── */}
        <nav className="nav">
          <a href="#" className="nav-logo">
            <span className="nav-logo-icon" aria-hidden="true" />
            Latise
          </a>
          <ul className="nav-links">
            {["Dashboard", "Wrap & Shield"].map((item) => (
              <li key={item}>
                <a href="#">
                  {item}
                  <svg className="nav-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <div className="nav-actions">
            <a href="/dashboard" className="btn-contact">
              Get started
              <svg className="arrow-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 8h8m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="hero">
          <h1 className="hero-headline" aria-label="The simplest way to shield your tokens.">
            <WavyText text="The simplest way to shield your tokens" />
            <span
              ref={heroInlineIconRef}
              className="hero-inline-icon"
              aria-hidden="true"
            >
              <lord-icon
                src="https://cdn.lordicon.com/ymgusxed.json"
                {...heroIconProps}
                style={{ width: "clamp(42px, 6vw, 72px)", height: "clamp(42px, 6vw, 72px)" }}
              />
            </span>.
          </h1>
          <p className="hero-subtext">
            Convert any ERC-20 into its confidential counterpart. Balances live on chain, only you can read them.
          </p>
          <a href="#" className="btn-cta">Start exploring</a>
        </section>

        {/* ── CARD GRID ───────────────────────────────────────────── */}
        <section className="cards-section" aria-label="Product capabilities">
          <div className="cards-grid">
            <div className="card card-mint">
              <p className="card-text feature-title">Wrap & Shield</p>
              <p className="card-text card-small-writing" >
                Deposit any supported ERC-20 and receive a confidential token 1:1. 
              </p>
              <div className="card-illustration">
                <Image 
                  src="/coins_fl.png" 
                  alt="Coins" 
                  width={180} 
                  height={180} 
                  className="coins-image"
                  loading="eager"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="card card-purple" >
              <p className="card-text feature-title" > Unwrap Anytime</p>
              <p className="card-text card-small-writing">
                Redeem your confidential tokens back to ERC-20 whenever you want.
              </p>
              <div className="card-illustration">
                <Image 
                  src="/unwrap.png" 
                  alt="Unwrap" 
                  width={180} 
                  height={180} 
                  className="coins-image"
                  loading="eager"
                  aria-hidden="true"
                />
              </div>
            </div>
            {/* <div className="card card-dark">
              <p className="card-text">Issue branded debit cards (physical and virtual) to your customers with our API infrastructure.</p>
              <div className="card-illustration"><div className="illus-dark" aria-hidden="true" /></div>
            </div>
            <div className="card card-cream">
              <p className="card-text">Accelerate your lending services with Latise&apos;s APIs for efficient loan management.</p>
              <div className="card-illustration"><div className="illus-cream" aria-hidden="true" /></div>
            </div>  */}
          </div>
        </section>
        
        {/* Lordicon script */}
        <Script
          src="https://cdn.lordicon.com/lordicon.js"
          strategy="afterInteractive"
        />
        
        {/* ── SHOWCASE SECTION ───────────────────────────────────── */}
        <section className="showcase-section" aria-label="Showcase">
          <div className="showcase-header">
            <p className="showcase-eyebrow">Showcase</p>
            <h2 className="showcase-heading">See Latise in action</h2>
          </div>
          <div className="showcase-grid">
            {showcaseItems.map((item, i) => (
              <div 
                key={item.title} 
                className="showcase-card"
                ref={(el) => { showcaseCardsRef.current[i] = el; }}
              >
                {item.icon ? (
                  <div className="showcase-card-icon">
                    <lord-icon
                      src={item.icon.src}
                      trigger={item.icon.trigger}
                      state={item.icon.state}
                      style={item.icon.style}
                    />
                  </div>
                ) : item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={440}
                    height={240}
                    className="showcase-card-image"
                    priority={i < 2}
                  />
                ) : null}
                <div className="showcase-card-content">
                  <h3 className="showcase-card-title">{item.title}</h3>
                  <p className="showcase-card-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* ── FEATURES ─────────────────────────────────────────────
            stickyRef → the element GSAP pins to the viewport.
            trackRef  → the wide row GSAP translates left.
        ─────────────────────────────────────────────────────────── */}
        <section className="features" id="products">
          <div className="features-sticky" ref={stickyRef}>

            <div className="features-header">
              <p className="features-eyebrow">Why Latise</p>
              <h2 className="features-heading">Everything you need to go private on chain</h2>
            </div>

            <div className="features-track" ref={trackRef}>
              {[
                { iconSrc: "https://cdn.lordicon.com/yaxbmvvh.json", trigger: "hover", state: "hover-unfold", title: "Live Registry",         bg: "#d6ede6", color:"#0d3b2e", desc: "Every ERC-20 ↔ ERC-7984 wrapper pair, pulled directly from the registry contract. Always current, nothing hardcoded." },
                { iconSrc: "https://cdn.lordicon.com/jznyltqt.json", trigger: "hover", title: "One-Click Wrapping",     bg: "#5b4b8a", color:"#ffffff", desc: "One approval, one transaction. No complex setup, no multistep flows. Connect your wallet and wrap in under 30 seconds." },
                { iconSrc: "https://cdn.lordicon.com/drdlomqk.json", trigger: "hover", title: "Encrypted Balances",    bg: "#0d3b2e", color:"#ffffff", desc: "Your cToken balance is FHE-encrypted on-chain. No block explorer or wallet scanner can read it. Only you can." },
                { iconSrc: "https://cdn.lordicon.com/ddgirohb.json", trigger: "hover", title: "Client-Side Decryption",bg: "#e8dfd0", color:"#2a2a2a", desc: "Hit Reveal and your balance decrypts locally using your wallet signature. The plaintext never touches a server." },
                { iconSrc: "https://cdn.lordicon.com/jazzayho.json", trigger: "hover", title: "TVS Analytics",         bg: "#ef9b86", color:"#2a2a2a", desc: "Track Total Value Shielded per wrapper in real time. Wrap and unwrap volume, top pairs, all queried directly from the contract." },
                { iconSrc: "https://cdn.lordicon.com/ymgusxed.json", trigger: "hover", title: "Sepolia Faucet",        bg: "#caa3f0", color:"#000000", desc: "Testing on testnet? Request free cUSDT mock tokens instantly. One request per wallet every 24 hours, contract-enforced." },
              ].map((f) => (
                <div className="feature-item" key={f.title} style={{ backgroundColor: f.bg, color: f.color }}>
                  <div className="feature-icon" aria-hidden="true">
                    <lord-icon
                      src={f.iconSrc}
                      trigger={f.trigger}
                      state={f.state}
                      style={{ width: "70px", height: "70px" }}
                    />
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer className="footer-new">

          {/* ── Link columns ── */}
          <div className="footer-cols">
            {[
              {
                heading: "Company",
                links: ["About",  "Media Kit"],
              },
              {
                heading: "Product",
                links: ["Use Cases",  "For Developers"],
              },
              {
                heading: "Resources",
                links: ["Documentation", "Help Center"],
              },
            ].map((col) => (
              <div className="footer-col-new" key={col.heading}>
                <h4 className="footer-col-heading">{col.heading}</h4>
                <ul>
                  {col.links.map((link) => (
                    <li key={link}><a href="#">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Oversized wordmark ── */}
          <div className="footer-wordmark-row">
            
            <span className="footer-wordmark">Latise</span>
          </div>

        </footer>

      </div>
    </>
  );
}

/* ── WavyText ─────────────────────────────────────────────────────────────── */
function WavyText({ text, startIndex = 0 }: { text: string; startIndex?: number }) {
  const BASE_DELAY   = 20;
  const CHAR_STAGGER = 20;
  return (
    <>
      {text.split("").map((char, i) => {
        const delay = BASE_DELAY + (startIndex + i) * CHAR_STAGGER;
        if (char === " ") return <span key={i} className="wave-space" aria-hidden="true" />;
        return (
          <span key={i} className="wave-char" aria-hidden="true" style={{ animationDelay: `${delay}ms` }}>
            {char}
          </span>
        );
      })}
    </>
  );
}
