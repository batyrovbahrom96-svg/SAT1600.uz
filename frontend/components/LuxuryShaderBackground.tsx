"use client";

import { useEffect, useRef } from "react";

const shaderColors = [
  [215, 204, 149],
  [143, 241, 198],
  [153, 215, 255],
  [255, 255, 255]
] as const;

function drawShader(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#070808";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "screen";

  const longSide = Math.max(width, height);

  shaderColors.forEach(([r, g, b], index) => {
    const phase = time * (0.00018 + index * 0.000035) + index * 1.74;
    const x = width * (0.5 + Math.cos(phase) * (0.24 + index * 0.025));
    const y = height * (0.4 + Math.sin(phase * 1.17) * (0.22 + index * 0.018));
    const radius = longSide * (0.44 - index * 0.045);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.34 - index * 0.036})`);
    gradient.addColorStop(0.42, `rgba(${r}, ${g}, ${b}, ${0.14 - index * 0.014})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.38, longSide * 0.1, width * 0.5, height * 0.5, longSide * 0.72);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.68, "rgba(0, 0, 0, 0.08)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.48)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function now() {
  return window.performance?.now?.() ?? Date.now();
}

export function LuxuryShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return undefined;

    let frame = 0;
    let lastFrameAt = 0;
    let width = 0;
    let height = 0;
    const frameInterval = reducedMotion ? Number.POSITIVE_INFINITY : 1000 / 24;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(window.innerWidth * dpr));
      height = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      drawShader(ctx, width, height, now());
    };

    const tick = (now: number) => {
      if (!document.hidden && now - lastFrameAt >= frameInterval) {
        lastFrameAt = now;
        drawShader(ctx, width, height, now);
      }
      frame = window.requestAnimationFrame(tick);
    };

    resize();
    if (!reducedMotion) {
      frame = window.requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="luxury-shader-bg" aria-hidden="true" />;
}
