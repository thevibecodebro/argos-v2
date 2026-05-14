"use client";

import { useEffect } from "react";
import styles from "./landing-page.module.css";

export function LandingMotionController() {
  useEffect(() => {
    document.documentElement.classList.add(styles["argos-reveal-ready"]);

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("[data-landing-nav-links='true'] a[href^='#']"),
    );
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

    let revealObserver: IntersectionObserver | undefined;
    let activeSectionId = "";
    let activeFrame = 0;

    const getSectionVisibilityScore = (section: HTMLElement) => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const topBoundary = Math.min(96, viewportHeight * 0.18);
      const bottomBoundary = viewportHeight * 0.86;
      const visibleTop = Math.max(rect.top, topBoundary);
      const visibleBottom = Math.min(rect.bottom, bottomBoundary);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      if (visibleHeight <= 0) return 0;

      const center = rect.top + rect.height / 2;
      const viewportCenter = (topBoundary + bottomBoundary) / 2;
      const centerBias = Math.max(0, 1 - Math.abs(center - viewportCenter) / viewportHeight);
      const sectionHeight = Math.max(1, Math.min(rect.height, bottomBoundary - topBoundary));

      return visibleHeight / sectionHeight + centerBias * 0.14;
    };

    const setActiveSection = (sectionId: string) => {
      if (activeSectionId === sectionId) return;
      activeSectionId = sectionId;

      navLinks.forEach((link) => {
        const isActive = link.hash.slice(1) === sectionId;
        link.classList.toggle(styles["is-active"], isActive);

        if (isActive) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const updateActiveSection = () => {
      activeFrame = 0;

      const dominantSection = navSections
        .map((section) => ({ section, score: getSectionVisibilityScore(section) }))
        .sort((first, second) => second.score - first.score)[0];

      setActiveSection(dominantSection && dominantSection.score > 0 ? dominantSection.section.id : "");
    };

    const requestActiveSectionUpdate = () => {
      if (activeFrame) return;
      activeFrame = window.requestAnimationFrame(updateActiveSection);
    };

    if (reduceMotionQuery.matches) {
      revealTargets.forEach((target) => target.classList.add(styles["is-visible"]));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add(styles["is-visible"]);
              revealObserver?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: "0px 0px -4% 0px",
          threshold: 0.24,
        },
      );

      revealTargets.forEach((target) => revealObserver?.observe(target));
    }

    const handleReducedMotionChange = () => {
      if (reduceMotionQuery.matches) {
        revealTargets.forEach((target) => target.classList.add(styles["is-visible"]));
      }
    };

    updateActiveSection();
    reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    window.addEventListener("hashchange", requestActiveSectionUpdate);
    window.addEventListener("resize", requestActiveSectionUpdate, { passive: true });
    window.addEventListener("scroll", requestActiveSectionUpdate, { passive: true });

    return () => {
      if (activeFrame) window.cancelAnimationFrame(activeFrame);
      revealObserver?.disconnect();
      reduceMotionQuery.removeEventListener("change", handleReducedMotionChange);
      window.removeEventListener("hashchange", requestActiveSectionUpdate);
      window.removeEventListener("resize", requestActiveSectionUpdate);
      window.removeEventListener("scroll", requestActiveSectionUpdate);
      navLinks.forEach((link) => {
        link.classList.remove(styles["is-active"]);
        link.removeAttribute("aria-current");
      });
      document.documentElement.classList.remove(styles["argos-reveal-ready"]);
    };
  }, []);

  return null;
}
