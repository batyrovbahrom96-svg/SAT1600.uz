import Link from "next/link";
import { ArrowRight, CheckCircle2, Crown, Target, Zap } from "lucide-react";
import { LuxuryNavbar } from "@/components/LuxuryNavbar";

const plans = [
  {
    name: "Free Plan",
    price: "Free",
    description: "Start with one realistic SAT diagnostic and see where you stand.",
    features: ["1 mock test", "Limited practice"],
    href: "/mock-test",
    cta: "Start Free",
    icon: Target,
    featured: false
  },
  {
    name: "Pro Plan",
    price: "$9/month",
    description: "For students who want daily targeted practice after the diagnostic.",
    features: ["Unlimited practice", "Full analytics", "Weakness targeting", "Progress tracking"],
    href: "/register",
    cta: "Start Pro",
    icon: Zap,
    featured: true
  },
  {
    name: "SAT Elite Program",
    price: "$99",
    description: "High-touch preparation for students serious about reaching 1400+.",
    features: ["Platform access", "Personal guidance", "Strategy sessions"],
    href: "/register",
    cta: "Join Elite Program",
    icon: Crown,
    featured: false
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#101112] text-white">
      <LuxuryNavbar />

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        <div className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/45">Pricing</p>
            <h1 className="mt-6 max-w-5xl text-6xl font-light leading-[0.98] text-white md:text-8xl">
              You are close to 1400. Now choose the path.
            </h1>
          </div>
          <p className="max-w-xl text-xl font-light leading-9 text-white/55">
            The test shows the pain. The plan turns that pain into daily work: analytics,
            weak-skill drills, and a clear route toward score growth.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <article
                className={`flex min-h-[520px] flex-col border p-7 ${
                  plan.featured
                    ? "border-white bg-white text-black shadow-[0_30px_90px_rgba(255,255,255,0.08)]"
                    : "border-white/10 bg-white/[0.035] text-white"
                }`}
                key={plan.name}
              >
                <div className={`flex h-16 w-16 items-center justify-center border ${plan.featured ? "border-black/10 bg-black text-white" : "border-white/10 bg-black/20 text-white/70"}`}>
                  <Icon size={28} />
                </div>
                <p className={`mt-8 text-[10px] font-black uppercase tracking-[0.32em] ${plan.featured ? "text-black/48" : "text-white/42"}`}>
                  {plan.name}
                </p>
                <div className="mt-4 text-5xl font-light leading-none">{plan.price}</div>
                <p className={`mt-5 min-h-[90px] text-base font-light leading-7 ${plan.featured ? "text-black/62" : "text-white/55"}`}>
                  {plan.description}
                </p>

                <div className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <div className="flex items-center gap-3" key={feature}>
                      <CheckCircle2 size={18} className={plan.featured ? "text-black" : "text-white/70"} />
                      <span className={`text-sm font-black uppercase tracking-[0.14em] ${plan.featured ? "text-black/70" : "text-white/70"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  className={`mt-auto inline-flex h-14 items-center justify-between border px-5 text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                    plan.featured
                      ? "border-black bg-black text-white hover:bg-transparent hover:text-black"
                      : "border-white bg-white text-black hover:bg-transparent hover:text-white"
                  }`}
                  href={plan.href}
                >
                  {plan.cta} <ArrowRight size={18} />
                </Link>
              </article>
            );
          })}
        </div>

        <section className="mt-8 border border-white/10 bg-black/20 p-7 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.36em] text-white/40">Conversion promise</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-light leading-tight text-white md:text-5xl">
            Students do not pay for features. They pay when they feel the score is reachable.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg font-light leading-8 text-white/55">
            SATTEST.UZ makes the gap visible, shows the weakness, and gives the next move.
          </p>
        </section>
      </section>
    </main>
  );
}
