"use client";

import dynamic from "next/dynamic";

const ArgosListeningEngineScene = dynamic(
  () => import("./argos-listening-engine-scene").then((mod) => mod.ArgosListeningEngineScene),
  {
    loading: () => <div aria-hidden="true" className="argos-scene-fallback" />,
    ssr: false,
  },
);

export function ArgosSceneLoader() {
  return <ArgosListeningEngineScene />;
}
