"use client";

import { useEffect, useRef, useState } from "react";
import { HOMEPAGE_PRODUCT_CAPTURE_ROUTES } from "@/lib/homepage-product-capture";
import styles from "./landing-page.module.css";

const productShowcaseSlides = HOMEPAGE_PRODUCT_CAPTURE_ROUTES;

export function LandingProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasInteractedRef = useRef(false);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    let animationFrame = 0;

    function syncActiveSlide() {
      const trackNode = trackRef.current;

      if (!trackNode) {
        return;
      }

      const trackRect = trackNode.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      let closestIndex = activeIndex;
      let closestDistance = Number.POSITIVE_INFINITY;

      slideRefs.current.forEach((slide, index) => {
        if (!slide) {
          return;
        }

        const slideRect = slide.getBoundingClientRect();
        const slideCenter = slideRect.left + slideRect.width / 2;
        const distance = Math.abs(trackCenter - slideCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex((currentIndex) => (
        currentIndex === closestIndex ? currentIndex : closestIndex
      ));
    }

    function scheduleSync() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(syncActiveSlide);
    }

    scheduleSync();
    track.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      track.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
    };
  }, [activeIndex]);

  useEffect(() => {
    if (!hasInteractedRef.current) {
      return;
    }

    const activeSlide = slideRefs.current[activeIndex];
    const track = trackRef.current;

    if (!activeSlide || !track) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trackRect = track.getBoundingClientRect();
    const slideRect = activeSlide.getBoundingClientRect();
    const targetLeft =
      track.scrollLeft + slideRect.left - trackRect.left - (trackRect.width - slideRect.width) / 2;

    track.scrollTo({
      left: targetLeft,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex]);

  function showSlide(index: number) {
    const nextIndex = (index + productShowcaseSlides.length) % productShowcaseSlides.length;
    hasInteractedRef.current = true;
    setActiveIndex(nextIndex);
  }

  return (
    <section
      aria-label="Argos product coaching walkthrough"
      className={styles["argos-product-preview"]}
      data-product-showcase="product-screenshot-carousel"
      id="product-in-motion"
    >
      <div aria-label="Argos product showcase" className={styles["argos-product-showcase"]}>
        <div className={styles["argos-product-showcase-viewport"]}>
          <div className={styles["argos-product-showcase-track"]} ref={trackRef}>
            {productShowcaseSlides.map((slide, index) => {
              const isActive = index === activeIndex;

              return (
                <article
                  aria-label={`${index + 1} of ${productShowcaseSlides.length}: ${slide.label}`}
                  className={styles["argos-product-showcase-slide"]}
                  data-active={isActive ? "true" : "false"}
                  data-showcase-slide={slide.id}
                  key={slide.id}
                  ref={(node) => {
                    slideRefs.current[index] = node;
                  }}
                >
                  <div className={styles["argos-product-showcase-text"]}>
                    <span className={styles["argos-product-showcase-kicker"]}>{slide.label}</span>
                    <h3>
                      <span>{slide.headline}</span>
                      <strong>{slide.emphasis}</strong>
                    </h3>
                  </div>

                  <figure className={styles["argos-product-showcase-frame"]}>
                    <img
                      alt={slide.alt}
                      decoding="async"
                      loading={index === 0 ? "eager" : "lazy"}
                      src={slide.image}
                    />
                  </figure>
                </article>
              );
            })}
          </div>
        </div>

        <div className={styles["argos-product-showcase-controls"]}>
          <button
            aria-label="Previous product view"
            className={styles["argos-product-showcase-arrow"]}
            onClick={() => showSlide(activeIndex - 1)}
            type="button"
          >
            <ArrowIcon direction="left" />
          </button>

          <div className={styles["argos-product-showcase-dots"]} role="tablist" aria-label="Product views">
            {productShowcaseSlides.map((slide, index) => (
              <button
                aria-current={index === activeIndex ? "true" : undefined}
                aria-label={`Show ${slide.label}`}
                className={styles["argos-product-showcase-dot"]}
                data-active={index === activeIndex ? "true" : "false"}
                key={slide.id}
                onClick={() => showSlide(index)}
                type="button"
              />
            ))}
          </div>

          <button
            aria-label="Next product view"
            className={styles["argos-product-showcase-arrow"]}
            onClick={() => showSlide(activeIndex + 1)}
            type="button"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={styles["argos-product-showcase-arrow-icon"]}
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2.4"
      />
    </svg>
  );
}
