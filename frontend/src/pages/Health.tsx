import React from 'react'
import {
  TrendingUp,
  Coins,
  Target,
  CircleDot,
  Activity,
  Sparkles
} from 'lucide-react'

type AccentKey = 'cyan' | 'violet' | 'emerald' | 'amber' | 'fuchsia'

interface HealthProps {
  userId: number | null
}

const Health: React.FC<HealthProps> = () => {
  /* --- Coming Soon State --- */

  /* --- Coming Soon State --- */
  return (
    <div className="space-y-10 pb-20">
      {/* Gamified Hero (Visual Teaser) */}
      <section className="relative overflow-hidden rounded-[40px] border border-brand-coral/10 bg-white p-8 shadow-2xl shadow-brand-coral/5 lg:p-12 opacity-80 pointer-events-none grayscale-[0.3]">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-coral/5 blur-3xl opacity-60"></div>
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-brand-mint/5 blur-3xl opacity-40"></div>

        <div className="relative z-10 flex flex-col items-center gap-12 lg:flex-row lg:justify-between">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <span className={`flex items-center gap-2 rounded-full bg-slate-400 px-4 py-1.5 text-xs font-bold text-white shadow-lg`}>
                <CircleDot className="h-4 w-4" />
                RANK: STARTER
              </span>
              <span className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600">
                <Target className="h-3 w-3" />
                GOAL: GROWTH
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
                Growth Engine
              </h1>
              <p className="text-lg font-medium text-slate-500">
                Rocketing toward your target.
              </p>
            </div>

            <p className="max-w-xl text-slate-500">
              Compounding is your superpower. Keep the momentum high.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <HealthScoreGauge value={65} accent="cyan" label="Starter" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Next Milestone At</span>
              <span className="text-xl font-black text-slate-900">
                100%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Card */}
      <div className="flex flex-col items-center justify-center gap-6 rounded-[32px] border border-brand-coral/20 bg-gradient-to-br from-white to-brand-coral/5 p-12 text-center shadow-2xl shadow-brand-coral/10">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-coral text-white shadow-lg shadow-brand-coral/30">
          <Sparkles className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2 max-w-lg">
          <h2 className="text-3xl font-black text-slate-900">
            Engine Upgrades in Progress
          </h2>
          <p className="text-lg font-medium text-slate-500">
            We're fine-tuning the advanced planning engine to ensure your financial projections are pixel-perfect.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm">
            <Activity className="h-4 w-4 text-brand-coral" />
            Inflation Shield
          </span>
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm">
            <TrendingUp className="h-4 w-4 text-brand-mint" />
            Retirement Projections
          </span>
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm">
            <Coins className="h-4 w-4 text-brand-gold" />
            Income Planning
          </span>
        </div>

        <div className="mt-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white uppercase tracking-wider">
            Coming Next Week
          </span>
        </div>
      </div>
    </div>
  )
}

/* --- Components --- */

const HealthScoreGauge: React.FC<{ value: number; accent: AccentKey; label: string }> = ({ value, accent, label }) => {
  const rotation = -90 + (value * 1.8) // 180 degree semi-circle
  const colors: Record<AccentKey, string> = {
    cyan: 'border-t-brand-mint',
    violet: 'border-t-brand-coral',
    emerald: 'border-t-brand-mint',
    amber: 'border-t-brand-gold',
    fuchsia: 'border-t-brand-coral'
  }
  return (
    <div className="relative h-48 w-48 overflow-hidden flex items-center justify-center">
      {/* Gauge background */}
      <div className="absolute inset-0 rounded-full border-[16px] border-slate-100"></div>
      {/* Gauge fill */}
      <div className="group relative flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-xl shadow-brand-coral/5">
        <div className="absolute inset-0 rounded-full border-2 border-brand-coral/5 opacity-20"></div>
        <div className="flex flex-col items-center">
          <span className="text-4xl font-black text-slate-900 leading-none">{Math.round(value)}%</span>
          <span className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </div>
        {/* Animated border/ring effect */}
        <div
          className={`absolute inset-x-0 bottom-0 top-0 rounded-full border-[6px] border-transparent ${colors[accent]} transition-all duration-1000 ease-out`}
          style={{ transform: `rotate(${rotation}deg)` }}
        ></div>
      </div>
    </div>
  )
}

export default Health
