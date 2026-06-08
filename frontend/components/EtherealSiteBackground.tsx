"use client";

import { animate, type AnimationPlaybackControls, useMotionValue } from "framer-motion";
import { useEffect, useId, useRef } from "react";

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number) {
  if (fromLow === fromHigh) return toLow;
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

function useInstanceId() {
  return `shadowoverlay-${useId().replace(/:/g, "")}`;
}

export function EtherealSiteBackground() {
  const id = useInstanceId();
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
  const hueRotateMotionValue = useMotionValue(180);
  const hueRotateAnimation = useRef<AnimationPlaybackControls | null>(null);
  const scale = 64;
  const speed = 54;
  const displacementScale = mapRange(scale, 1, 100, 20, 100);
  const animationDuration = mapRange(speed, 1, 100, 1000, 50);

  useEffect(() => {
    if (!feColorMatrixRef.current) return undefined;

    hueRotateAnimation.current?.stop();
    hueRotateMotionValue.set(0);
    hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
      delay: 0,
      duration: animationDuration / 25,
      ease: "linear",
      onUpdate: (value) => {
        feColorMatrixRef.current?.setAttribute("values", String(value));
      },
      repeat: Infinity,
      repeatDelay: 0,
      repeatType: "loop"
    });

    return () => {
      hueRotateAnimation.current?.stop();
    };
  }, [animationDuration, hueRotateMotionValue]);

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
