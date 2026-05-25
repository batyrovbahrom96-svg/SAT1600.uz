import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, Timer } from "lucide-react";

export default function Home() {
  const features = [
    { title: "Adaptive engine", body: "Module 1 performance routes Module 2 difficulty.", Icon: BrainCircuit },
    { title: "Timed Bluebook mode", body: "Locked modules, review marks, navigator, and auto-submit.", Icon: Timer },
    { title: "Analytics layer", body: "Strengths, pitfalls, careless mistakes, graph performance.", Icon: BarChart3 }
  ];

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#a1a1a1]">
      <section className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[60%_40%]">
        <div className="flex flex-col justify-center bg-[#0f0f0f] px-8 py-14 lg:px-16 xl:px-24">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-[#a1a1a1]">Digital SAT platform for Uzbekistan</p>
          <h1 className="max-w-3xl text-5xl font-black leading-tight text-white md:text-7xl">SAT1600.uz</h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-[#a1a1a1]">
            Full mock tests, adaptive modules, topic analytics, graph questions, and score history in one production-ready platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="flex items-center gap-2 border border-white bg-white px-5 py-3 font-bold text-black transition-all duration-200 ease-in-out hover:bg-[#0f0f0f] hover:text-white" href="/register">
              Start mock test <ArrowRight size={18} />
            </Link>
            <Link className="border border-[#2a2a2a] bg-[#181818] px-5 py-3 font-bold text-[#a1a1a1] transition-all duration-200 ease-in-out hover:border-white hover:text-white" href="/login">
              Login
            </Link>
          </div>
        </div>
        <div className="grid content-center gap-0 border-l border-[#2a2a2a] bg-[#181818] px-8 py-14 lg:px-10 xl:px-16">
          {features.map(({ title, body, Icon }) => (
            <div className="border-b border-[#2a2a2a] px-0 py-8 transition-all duration-200 ease-in-out last:border-b-0 hover:border-white" key={title}>
              <div className="mb-4 flex size-11 items-center justify-center border border-[#2a2a2a] bg-[#0f0f0f] text-white">
                <Icon size={22} />
              </div>
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-2 text-lg leading-7 text-[#a1a1a1]">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
