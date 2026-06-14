"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

type SplineSceneProps = {
  scene: string;
  className?: string;
};

export function SplineScene({ scene, className }: SplineSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "360px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={className} aria-label={shouldLoad ? undefined : "Loading 3D scene"}>
      {shouldLoad ? (
        <Suspense fallback={<div className="spline-scene-loader" aria-label="Loading 3D scene"><span /></div>}>
          <Spline scene={scene} className="spline-scene-canvas" />
        </Suspense>
      ) : (
        <div className="spline-scene-loader" aria-label="Loading 3D scene">
          <span />
        </div>
      )}
    </div>
  );
}
