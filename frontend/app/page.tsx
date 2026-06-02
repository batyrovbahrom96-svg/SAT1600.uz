"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";
import { studentResults, type StudentResult } from "@/lib/student-results";

const trustItems = [
  "Real SAT format",
  "Adaptive difficulty",
  "Used by Richmond School students"
];

export default function Home() {
  const [activeVideo, setActiveVideo] = useState<StudentResult | null>(null);
  const resultsTrackRef = useRef<HTMLDivElement | null>(null);

  function scrollResults(direction: -1 | 1) {
    const track = resultsTrackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>("[data-result-card]");
    const distance = firstCard ? firstCard.offsetWidth + 18 : 360;
    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">
            Digital SAT platform for Uzbekistan
          </p>
          <h1 className="mt-7 max-w-4xl text-6xl font-light leading-[0.96] text-white md:text-8xl">
            Train like top SAT students.
          </h1>
          <p className="mt-7 max-w-2xl text-xl font-light leading-9 text-white/58">
            Full-length SAT simulations engineered for real score improvement.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-14 items-center gap-4 border border-white bg-white px-7 text-xs font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-transparent hover:text-white"
              href="/mock-test"
            >
              Start Mock Test <ArrowRight size={18} />
            </Link>
            <Link
              className="inline-flex h-14 items-center gap-4 border border-white/15 bg-white/[0.035] px-7 text-xs font-black uppercase tracking-[0.22em] text-white/72 transition-colors hover:border-white/40 hover:text-white"
              href="/results/demo"
            >
              See Score Report
            </Link>
          </div>
        </div>

        <div className="border border-white/12 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
          <div className="grid gap-4 sm:grid-cols-2">
            {studentResults.slice(0, 2).map((result) => (
              <button
                className="group relative min-h-[430px] overflow-hidden border border-white/12 bg-black text-left"
                data-result-card
                key={result.name}
                onClick={() => setActiveVideo(result)}
                type="button"
              >
                <video
                  className="absolute inset-0 h-full w-full object-cover opacity-82 transition-transform duration-700 group-hover:scale-105"
                  src={result.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                <span className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white backdrop-blur-sm">
                  <Play size={18} fill="currentColor" />
                </span>
                <span className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="block text-3xl font-black leading-tight text-white">{result.name}</span>
                  <span className="mt-3 block text-lg font-black uppercase tracking-[0.16em] text-white/78">{result.score}</span>
                  <span className="mt-2 block text-sm font-black uppercase tracking-[0.18em] text-white/70">{result.improvement}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Real results</p>
              <h2 className="mt-4 max-w-4xl text-5xl font-light leading-tight text-white md:text-7xl">
                You are not far from this result.
              </h2>
            </div>
            <Link
              className="inline-flex h-14 w-fit items-center gap-4 border border-white bg-white px-7 text-xs font-black uppercase tracking-[0.22em] text-black transition-colors hover:bg-transparent hover:text-white"
              href="/mock-test"
            >
              Try the Test <ArrowRight size={18} />
            </Link>
          </div>

          <div className="relative mt-10">
            <div
              className="flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              ref={resultsTrackRef}
            >
              {studentResults.map((result) => (
                <button
                  className="group relative h-[520px] w-[330px] shrink-0 snap-start overflow-hidden border border-white/12 bg-black text-left md:w-[390px]"
                  data-result-card
                  key={result.name}
                  onClick={() => setActiveVideo(result)}
                  type="button"
                >
                  <video
                    className="absolute inset-0 h-full w-full object-cover opacity-82 transition-transform duration-700 group-hover:scale-105"
                    src={result.video}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-transparent" />
                  <span className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white backdrop-blur-sm">
                    <Play size={18} fill="currentColor" />
                  </span>
                  <span className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="block text-3xl font-black leading-tight text-white">{result.name}</span>
                    <span className="mt-3 block text-lg font-black uppercase tracking-[0.16em] text-white/78">{result.score}</span>
                    <span className="mt-2 block text-sm font-black uppercase tracking-[0.18em] text-white/70">{result.improvement}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-white/40"
                onClick={() => scrollResults(-1)}
                type="button"
                aria-label="Previous student result"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-white/40"
                onClick={() => scrollResults(1)}
                type="button"
                aria-label="Next student result"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {trustItems.map((item) => (
            <div className="border border-white/10 bg-white/[0.035] p-7" key={item}>
              <CheckCircle2 className="text-white/70" size={26} />
              <h3 className="mt-8 text-3xl font-light text-white">{item}</h3>
            </div>
          ))}
        </div>
      </section>

      {activeVideo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button className="absolute inset-0" onClick={() => setActiveVideo(null)} type="button" aria-label="Close video" />
          <div className="relative z-10 w-full max-w-3xl border border-white/12 bg-[#101112] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.62)]">
            <button
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white"
              onClick={() => setActiveVideo(null)}
              type="button"
              aria-label="Close video"
            >
              <X size={18} />
            </button>
            <video className="max-h-[78vh] w-full bg-black object-contain" src={activeVideo.video} autoPlay controls playsInline />
            <div className="grid gap-1 px-2 py-4">
              <strong className="text-2xl text-white">{activeVideo.name}</strong>
              <span className="text-sm font-black uppercase tracking-[0.18em] text-white/62">{activeVideo.score}</span>
              <span className="text-sm font-black uppercase tracking-[0.18em] text-white/62">{activeVideo.improvement}</span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
