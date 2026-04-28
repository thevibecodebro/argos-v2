"use client";

import { useEffect } from "react";

export function LandingMotionController() {
  useEffect(() => {
    document.documentElement.classList.add("argos-reveal-ready");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".argos-nav-links a[href^='#']"));
    const navLinkBySection = new Map(
      navLinks
        .map((link) => [link.hash.slice(1), link] as const)
        .filter(([sectionId]) => sectionId.length > 0),
    );
    const navSections = Array.from(navLinkBySection.keys())
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => Boolean(section));

    revealTargets.forEach((target, index) => {
      target.style.setProperty("--reveal-index", String(index % 5));
    });

    if (reduceMotion) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      return undefined;
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
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.18,
      },
    );

    revealTargets.forEach((target) => observer.observe(target));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (!visibleEntry) return;

        navLinks.forEach((link) => link.classList.remove("is-active"));
        navLinkBySection.get(visibleEntry.target.id)?.classList.add("is-active");
      },
      {
        rootMargin: "-34% 0px -48% 0px",
        threshold: [0.12, 0.28, 0.44],
      },
    );

    navSections.forEach((section) => sectionObserver.observe(section));

    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      document.documentElement.classList.remove("argos-reveal-ready");
    };
  }, []);

  return null;
}
