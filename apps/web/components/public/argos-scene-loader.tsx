"use client";

import dynamic from "next/dynamic";
import styles from "./landing-page.module.css";

const ArgosListeningEngineScene = dynamic(
  () => import("./argos-listening-engine-scene").then((mod) => mod.ArgosListeningEngineScene),
  {
    loading: () => <div aria-hidden="true" className={styles["argos-scene-fallback"]} />,
    ssr: false,
  },
);

export function ArgosSceneLoader() {
  return <ArgosListeningEngineScene />;
}
