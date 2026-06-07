"use client";

import { lazy, Suspense } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

type SplineSceneProps = {
  scene: string;
  className?: string;
};

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="spline-scene-loader" aria-label="Loading 3D scene">
          <span />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
