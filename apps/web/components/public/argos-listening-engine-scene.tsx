"use client";

import { useEffect, useRef } from "react";

const forgeFrames = [
  {
    key: "furnace",
    label: "Listening Furnace",
    fallback: "/argos-forge/listening-furnace.png",
    src: "/argos-forge/listening-furnace.webp",
  },
  {
    key: "anvil",
    label: "Rubric Anvil",
    fallback: "/argos-forge/rubric-anvil.png",
    src: "/argos-forge/rubric-anvil.webp",
  },
  {
    key: "tempering",
    label: "Moment Tempering",
    fallback: "/argos-forge/moment-tempering.png",
    src: "/argos-forge/moment-tempering.webp",
  },
  {
    key: "casting",
    label: "Roleplay Casting",
    fallback: "/argos-forge/roleplay-casting.png",
    src: "/argos-forge/roleplay-casting.webp",
  },
] as const;

const filmSections = [
  { id: "platform", frame: 0 },
  { id: "features", frame: 1 },
  { id: "detail", frame: 2 },
  { id: "trust", frame: 2.35 },
  { id: "access", frame: 3 },
] as const;

export function ArgosListeningEngineScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const depthRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stops = measureFilmStops();
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastScrollY = window.scrollY;
    let velocityTimer: number | undefined;

    const setFrame = () => {
      frame = 0;
      const reduceMotion = reduceQuery.matches;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = reduceMotion ? 0.08 : clamp(window.scrollY / scrollable, 0, 1);
      const anchor = window.scrollY + window.innerHeight * 0.52;
      const filmFrame = reduceMotion ? 0 : getFilmFrame(anchor, stops);
      const scrollDelta = reduceMotion ? 0 : clamp(Math.abs(window.scrollY - lastScrollY) / 420, 0, 1);
      lastScrollY = window.scrollY;
      const opacities = forgeFrames.map((_, index) => frameOpacity(index, filmFrame));

      frameRefs.current.forEach((layer, index) => {
        if (!layer) return;
        const opacity = opacities[index];
        const distance = index - filmFrame;
        const scale = 1.035 + progress * 0.035 + Math.abs(distance) * 0.008;
        const driftX =
          distance * -1.8 + (progress - 0.5) * (index + 1) * 0.65 + pointerX * (0.7 + index * 0.18);
        const driftY = -progress * (index + 1) * 0.35 + distance * 0.22 + pointerY * (0.48 + index * 0.12);
        layer.style.opacity = String(opacity);
        layer.style.transform = `translate3d(${driftX}vw, ${driftY}vh, 0) scale(${scale})`;
      });

      depthRefs.current.forEach((layer, index) => {
        if (!layer) return;
        const opacity = opacities[index];
        const distance = index - filmFrame;
        const depthScale = 1.09 + progress * 0.055 + opacity * 0.018;
        const depthX = distance * -3.8 + pointerX * (2.4 + index * 0.44) + progress * (index + 1) * 0.42;
        const depthY = distance * 0.36 + pointerY * (1.7 + index * 0.36) - progress * (index + 1) * 0.42;
        layer.style.opacity = String(opacity * (0.36 + opacity * 0.34));
        layer.style.transform = `translate3d(${depthX}vw, ${depthY}vh, 0) scale(${depthScale})`;
      });

      root.style.setProperty("--forge-progress", String(progress));
      root.style.setProperty("--forge-stage", String(filmFrame / 3));
      root.style.setProperty("--forge-scan", String(frameOpacity(1, filmFrame)));
      root.style.setProperty("--forge-temper", String(frameOpacity(2, filmFrame)));
      root.style.setProperty("--forge-cast", String(frameOpacity(3, filmFrame)));
      root.style.setProperty("--forge-furnace", String(opacities[0]));
      root.style.setProperty("--forge-anvil", String(opacities[1]));
      root.style.setProperty("--forge-velocity", String(scrollDelta));
      root.style.setProperty("--forge-pointer-x", String(reduceMotion ? 0 : pointerX));
      root.style.setProperty("--forge-pointer-y", String(reduceMotion ? 0 : pointerY));

      if (!reduceMotion && scrollDelta > 0.015) {
        window.clearTimeout(velocityTimer);
        velocityTimer = window.setTimeout(requestFrame, 120);
      }
    };

    const requestFrame = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(setFrame);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reduceQuery.matches) return;
      pointerX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      requestFrame();
    };

    const requestMeasure = () => {
      stops = measureFilmStops();
      requestFrame();
    };

    forgeFrames.forEach((filmFrame) => {
      const image = new window.Image();
      image.src = filmFrame.src;
    });

    setFrame();
    reduceQuery.addEventListener("change", requestMeasure);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestMeasure, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(velocityTimer);
      reduceQuery.removeEventListener("change", requestMeasure);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", requestFrame);
      window.removeEventListener("resize", requestMeasure);
    };
  }, []);

  return (
    <div aria-hidden="true" className="argos-scene-canvas argos-forge-film" ref={rootRef}>
      {forgeFrames.map((frame, index) => (
        <div
          className="argos-forge-frame"
          key={frame.src}
          ref={(node) => {
            frameRefs.current[index] = node;
          }}
          style={{
            backgroundImage: `image-set(url("${frame.src}") type("image/webp"), url("${frame.fallback}") type("image/png"))`,
          }}
          data-frame={frame.key}
        >
          <span>{frame.label}</span>
        </div>
      ))}
      <div className="argos-forge-depth-stack">
        {forgeFrames.map((frame, index) => (
          <div
            className="argos-forge-depth-layer"
            data-depth={frame.key}
            key={`${frame.src}-depth`}
            ref={(node) => {
              depthRefs.current[index] = node;
            }}
            style={{
              backgroundImage: `image-set(url("${frame.src}") type("image/webp"), url("${frame.fallback}") type("image/png"))`,
            }}
          >
            <span>{frame.label} foreground</span>
          </div>
        ))}
      </div>
      <div className="argos-forge-heat-field" />
      <div className="argos-forge-aperture" />
      <div className="argos-forge-signal-path">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="argos-forge-light-sweep" />
      <div className="argos-forge-ribbons">
        <span />
        <span />
        <span />
      </div>
      <div className="argos-forge-sparks">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="argos-forge-vignette" />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothRange(value: number, start: number, end: number) {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function measureFilmStops() {
  const stops: Array<{ center: number; frame: number }> = [];

  filmSections.forEach((section) => {
    const element = document.getElementById(section.id);
    if (!element) return;
    const center = element.offsetTop + Math.min(element.offsetHeight, window.innerHeight * 1.05) * 0.52;
    stops.push({ center, frame: section.frame });
  });

  return stops;
}

function getFilmFrame(anchor: number, stops: Array<{ center: number; frame: number }>) {
  if (stops.length === 0) return 0;
  if (anchor <= stops[0].center) return stops[0].frame;

  for (let index = 0; index < stops.length - 1; index += 1) {
    const current = stops[index];
    const next = stops[index + 1];
    if (anchor >= current.center && anchor <= next.center) {
      const local = smoothRange(anchor, current.center, next.center);
      return current.frame + (next.frame - current.frame) * local;
    }
  }

  return stops[stops.length - 1].frame;
}

function frameOpacity(index: number, filmFrame: number) {
  const distance = Math.abs(index - filmFrame);
  const base = clamp(1 - distance, 0, 1);
  return index === 0 ? Math.max(base, 0.08) : base;
}
