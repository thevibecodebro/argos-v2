import styles from "./landing-page.module.css";
import type { CSSProperties } from "react";

const fallbackLayers = [
  { src: "/argos-forge/listening-furnace.webp", className: "layer-a" },
  { src: "/argos-forge/rubric-anvil.webp", className: "layer-b" },
] as const;

export function ArgosListeningEngineScene() {
  return (
    <div aria-hidden="true" className={cx(styles["argos-scene-canvas"], styles["argos-forge-film"])}>
      {fallbackLayers.map((layer) => (
        <span
          className={cx(styles["argos-scene-fallback"], styles[layer.className])}
          key={layer.src}
          style={{ "--scene-layer": `url(${layer.src})` } as CSSProperties}
          data-layer={layer.className}
        />
      ))}
    </div>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
