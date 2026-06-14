"use client";

import { useEffect, useId, useRef } from "react";

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number) {
  if (fromLow === fromHigh) return toLow;
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

function useInstanceId() {
  return `shadowoverlay-${useId().replace(/:/g, "")}`;
}

function now() {
  return window.performance?.now?.() ?? Date.now();
}

export function EtherealSiteBackground() {
  const id = useInstanceId();
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
  const scale = 64;
  const speed = 54;
  const displacementScale = mapRange(scale, 1, 100, 20, 100);
  const animationDuration = mapRange(speed, 1, 100, 1000, 50);

  useEffect(() => {
    if (!feColorMatrixRef.current) return undefined;

    let frameId = 0;
    let lastFrameAt = 0;
    const frameInterval = 1000 / 30;
    const startedAt = now();
    const durationMs = (animationDuration / 25) * 1000;
    const tick = (now: number) => {
      if (now - lastFrameAt >= frameInterval) {
        lastFrameAt = now;
        const progress = ((now - startedAt) % durationMs) / durationMs;
        feColorMatrixRef.current?.setAttribute("values", String(progress * 360));
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [animationDuration]);

  return (
    <div className="site-ethereal-bg" aria-hidden="true">
      <div
        className="site-ethereal-bg__shadow"
        style={{
          filter: `url(#${id}) blur(4px)`,
          inset: -displacementScale
        }}
      >
        <svg className="site-ethereal-bg__filter">
          <defs>
            <filter id={id}>
              <feTurbulence
                baseFrequency={`${mapRange(scale, 0, 100, 0.001, 0.0005)},${mapRange(scale, 0, 100, 0.004, 0.002)}`}
                numOctaves="2"
                result="undulation"
                seed="0"
                type="turbulence"
              />
              <feColorMatrix ref={feColorMatrixRef} in="undulation" type="hueRotate" values="180" />
              <feColorMatrix
                in="dist"
                result="circulation"
                type="matrix"
                values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
              />
              <feDisplacementMap in="SourceGraphic" in2="circulation" result="dist" scale={displacementScale} />
              <feDisplacementMap in="dist" in2="undulation" result="output" scale={displacementScale} />
            </filter>
          </defs>
        </svg>
        <div className="site-ethereal-bg__mask" />
      </div>
      <div className="site-ethereal-bg__noise" />
    </div>
  );
}
