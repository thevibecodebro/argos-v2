"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HOMEPAGE_PRODUCT_CAPTURE_ROUTES } from "@/lib/homepage-product-capture";
import styles from "./landing-page.module.css";

const slides = HOMEPAGE_PRODUCT_CAPTURE_ROUTES;
const ADVANCE_INTERVAL_MS = 6000;

export function LandingProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const isPausedRef = useRef(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Auto-advance is a progressive enhancement: it only starts after mount,
  // never for reduced-motion users, and any interaction hands over control.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (prefersReducedMotion.matches) {
      return;
    }

    setAutoAdvance(true);
    const timer = window.setInterval(() => {
      if (!isPausedRef.current) {
        setActiveIndex((index) => (index + 1) % slides.length);
      }
    }, ADVANCE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const selectSlide = useCallback((index: number) => {
    isPausedRef.current = true;
    setAutoAdvance(false);
    setActiveIndex(((index % slides.length) + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    const activeButton = rail?.querySelector<HTMLButtonElement>('[data-active="true"]');

    if (rail && activeButton) {
      const railRect = rail.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      if (buttonRect.left < railRect.left || buttonRect.right > railRect.right) {
        activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeIndex]);

  const activeSlide = slides[activeIndex];

  return (
    <div
      className={styles["argos-product-showcase"]}
      data-auto={autoAdvance ? "true" : "false"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          isPausedRef.current = false;
        }
      }}
      onFocus={() => {
        isPausedRef.current = true;
      }}
      onPointerEnter={() => {
        isPausedRef.current = true;
      }}
      onPointerLeave={() => {
        isPausedRef.current = false;
      }}
    >
      <div
        aria-label="Argos product areas"
        className={styles["argos-product-showcase-rail"]}
        ref={railRef}
      >
        {slides.map((slide, index) => (
          <button
            aria-controls="argos-showcase-frame"
            aria-current={index === activeIndex}
            aria-label={`Show ${slide.label}`}
            className={styles["argos-product-showcase-tab"]}
            data-active={index === activeIndex ? "true" : "false"}
            key={slide.id}
            onClick={() => selectSlide(index)}
            type="button"
          >
            <span className={styles["argos-product-showcase-tab-index"]} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles["argos-product-showcase-tab-label"]}>{slide.label}</span>
            <span className={styles["argos-product-showcase-tab-track"]} aria-hidden="true">
              <span key={`${slide.id}-${index === activeIndex ? "active" : "idle"}`} />
            </span>
          </button>
        ))}
      </div>

      <figure className={styles["argos-product-showcase-frame"]} id="argos-showcase-frame" data-sheen>
        <div className={styles["argos-product-showcase-viewport"]}>
          {slides.map((slide, index) => (
            <Image
              alt={slide.alt}
              className={styles["argos-product-showcase-image"]}
              data-active={index === activeIndex ? "true" : "false"}
              height={800}
              key={slide.id}
              loading={index === 0 ? "eager" : "lazy"}
              sizes="(max-width: 1024px) 94vw, 900px"
              src={slide.image}
              width={1280}
            />
          ))}
        </div>
        <figcaption aria-live="polite" className={styles["argos-product-showcase-caption"]}>
          <strong>{activeSlide.headline}</strong> <em>{activeSlide.emphasis}</em>
        </figcaption>
      </figure>

      <div className={styles["argos-product-showcase-controls"]}>
        <button
          aria-label="Previous product view"
          className={styles["argos-product-showcase-arrow"]}
          onClick={() => selectSlide(activeIndex - 1)}
          type="button"
        >
          <ArrowIcon direction="left" />
        </button>
        <span className={styles["argos-product-showcase-count"]}>
          {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <button
          aria-label="Next product view"
          className={styles["argos-product-showcase-arrow"]}
          onClick={() => selectSlide(activeIndex + 1)}
          type="button"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={styles["argos-product-showcase-arrow-icon"]}
      fill="none"
      style={direction === "left" ? { transform: "scaleX(-1)" } : undefined}
      viewBox="0 0 20 20"
    >
      <path
        d="M3 10h13m0 0-4.5-4.5M16 10l-4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}
