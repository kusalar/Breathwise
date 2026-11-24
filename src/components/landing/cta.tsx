import Link from "next/link";
import { ArrowRight, Sparkles, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-forest-900 text-white">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-800/40 px-3 py-1 text-xs font-semibold text-emerald-200">
          <Wind className="h-3.5 w-3.5" />
          <span>Start Protecting Your Loved Ones Today</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Take control of the air you breathe.
        </h2>

        <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
          Join thousands of proactive families across India turning real-time environmental intelligence into clean air, healthier routines, and sustainable impact.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-forest-950 font-bold px-8 shadow-lg hover:shadow-xl transition-all gap-2"
            >
              <span>Explore The Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-emerald-700 text-white hover:bg-emerald-800/50"
            >
              Read Feature Specifications
            </Button>
          </Link>
        </div>

        <p className="text-xs text-emerald-200/60 pt-4">
          Free and open access • Zero commercial bias • Demonstrating live in Siliguri, WB
        </p>
      </div>
    </section>
  );
}

