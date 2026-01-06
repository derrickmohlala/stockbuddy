import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Gauge,
  Coins,
  ShieldCheck,
  Wallet,
  Sparkles,
  Target,
  CircleDot,
  Flame,
  Activity,
  Share2,
  CheckCircle2
} from 'lucide-react'
import { apiFetch } from '../lib/api'
import { useRef } from 'react'

type GoalType = 'growth' | 'balanced' | 'income'

interface HealthProps {
  userId: number | null
}

interface HealthPlanResponse {
  goal_type: GoalType
  term_years?: number
  current_value?: number
  target_value?: number
  progress_pct?: number
  annual_return_pct?: number
  required_monthly_contribution?: number
  lump_sum_gap?: number
  monthly_budget?: number | null
  timeline_for_budget_months?: number | null
  message?: string
  inflation_target_pct?: number
  nominal_return_pct?: number
  real_return_pct?: number
  status?: string
  current_monthly_income?: number
  current_annual_income?: number
  target_monthly_income?: number
  target_annual_income?: number
  dividend_yield_pct?: number
}

const PROFILE_GOAL_TO_HEALTH: Record<string, GoalType> = {
  growth: 'growth',
  balanced: 'balanced',
  income: 'income',
  fallback: 'balanced'
}

const sarbInflationTarget = 6

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0
})

type AccentKey = 'cyan' | 'violet' | 'emerald' | 'amber' | 'fuchsia'

interface HighlightCardShape {
  id: string
  label: string
  value: string
  helper: string
  icon: React.ReactNode
  tone: AccentKey
}

const GOAL_META: Record<
  GoalType,
  { title: string; tone: string; icon: React.ReactNode; helper: string; accent: AccentKey }
> = {
  growth: {
    title: 'Growth Engine',
    tone: 'Rocketing toward your target.',
    icon: <TrendingUp className="h-6 w-6 text-cyan-400" />,
    helper: 'Compounding is your superpower. Keep the momentum high.',
    accent: 'cyan'
  },
  balanced: {
    title: 'Inflation Shield',
    tone: 'Fortifying against rising costs.',
    icon: <ShieldCheck className="h-6 w-6 text-amber-400" />,
    helper: 'Safety first. Beat the CPI line with precision.',
    accent: 'amber'
  },
  income: {
    title: 'Passive Pulse',
    tone: 'Generating cash while you sleep.',
    icon: <Coins className="h-6 w-6 text-emerald-400" />,
    helper: 'Let your dividends do the hard work.',
    accent: 'emerald'
  }
}

const STATUS_RANKS = [
  { min: 0, label: 'Starter', icon: <CircleDot className="h-4 w-4" />, color: 'bg-slate-400' },
  { min: 25, label: 'Builder', icon: <Activity className="h-4 w-4" />, color: 'bg-brand-coral/40' },
  { min: 50, label: 'Architect', icon: <Target className="h-4 w-4" />, color: 'bg-brand-coral/70' },
  { min: 75, label: 'Titan', icon: <Flame className="h-4 w-4" />, color: 'bg-brand-coral' },
  { min: 100, label: 'Legend', icon: <Sparkles className="h-4 w-4" />, color: 'bg-brand-gold' }
]

const Health: React.FC<HealthProps> = ({ userId }) => {
  const [goalType, setGoalType] = useState<GoalType>('growth')
  const [termYears, setTermYears] = useState<number>(5)
  const [targetValue, setTargetValue] = useState<number>(250000)
  const [monthlyBudget, setMonthlyBudget] = useState<string>('')
  const [inflationMode, setInflationMode] = useState<'sarb' | 'custom'>('sarb')
  const [customInflation, setCustomInflation] = useState<string>(String(sarbInflationTarget))
  const [incomeGoal, setIncomeGoal] = useState<string>('15000')
  const [incomeFrequency, setIncomeFrequency] = useState<'monthly' | 'annual'>('monthly')
  const [plan, setPlan] = useState<HealthPlanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const engineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadGoalPreference = async () => {
      if (!userId) return
      try {
        const resp = await apiFetch(`/api/users/${userId}`)
        if (!resp.ok) return
        const profile = await resp.json()
        const mapped = PROFILE_GOAL_TO_HEALTH[(profile.goal || '').toLowerCase()] || 'growth'
        setGoalType(mapped)
      } catch {
        // ignore
      }
    }
    loadGoalPreference()
  }, [userId])

  const parsedMonthlyBudget = useMemo(() => {
    const parsed = Number(monthlyBudget)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [monthlyBudget])

  const buildPayload = () => {
    if (!userId) return null
    const payload: any = {
      user_id: userId,
      goal_type: goalType,
      term_years: termYears
    }
    if (goalType === 'growth') {
      payload.target_value = targetValue
      if (parsedMonthlyBudget) payload.monthly_budget = parsedMonthlyBudget
    } else if (goalType === 'balanced') {
      payload.inflation_target_type = inflationMode
      if (inflationMode === 'custom') {
        const customValue = Number(customInflation)
        if (Number.isFinite(customValue)) payload.inflation_target_pct = customValue
      }
    } else {
      const goalAmount = Number(incomeGoal)
      payload.income_goal_amount = Number.isFinite(goalAmount) ? goalAmount : 0
      payload.income_frequency = incomeFrequency
      if (parsedMonthlyBudget) payload.monthly_budget = parsedMonthlyBudget
    }
    return payload
  }

  const fetchPlan = async () => {
    const payload = buildPayload()
    if (!payload) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/health/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Unable to generate health plan.')
      }
      const data = await response.json()
      setPlan(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) fetchPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, goalType])

  const handleUpdate = () => {
    if (userId) fetchPlan()
  }

  const handleShare = () => {
    setShareStatus('copied')
    setTimeout(() => setShareStatus('idle'), 3000)
    // In a real app, this might copy the URL or open a modal
  }

  const handleOptimize = () => {
    engineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const progressPct = useMemo(() => {
    if (!plan) return 0
    if (goalType === 'growth') return Math.min(plan.progress_pct ?? 0, 100)
    if (goalType === 'balanced') {
      const nominal = plan.nominal_return_pct ?? 0
      const inflation = plan.inflation_target_pct ?? sarbInflationTarget
      return inflation <= 0 ? 0 : Math.min(Math.max((nominal / inflation) * 50, 0), 100)
    }
    const current = plan?.current_monthly_income ?? plan?.current_annual_income ?? 0
    const target = plan?.target_monthly_income ?? plan?.target_annual_income ?? 1
    return Math.min((current / target) * 100, 100)
  }, [plan, goalType])

  const currentStatus = useMemo(() => {
    return [...STATUS_RANKS].reverse().find(r => progressPct >= r.min) || STATUS_RANKS[0]
  }, [progressPct])

  const highlightCards = useMemo<HighlightCardShape[]>(() => {
    if (goalType === 'growth') {
      return [
        {
          id: 'target',
          label: 'Success Condition',
          value: currencyFormatter.format(plan?.target_value ?? targetValue),
          helper: 'The milestone you’re chasing.',
          icon: <Target className="h-4 w-4" />,
          tone: 'cyan'
        },
        {
          id: 'contribution',
          label: 'Recommended Contribution',
          value: plan?.required_monthly_contribution ? `R${Math.round(plan.required_monthly_contribution)} / mo` : '--',
          helper: 'Amount needed to reach your target.',
          icon: <Wallet className="h-4 w-4" />,
          tone: 'emerald'
        },
        {
          id: 'momentum',
          label: 'Health Score',
          value: `${Math.round(progressPct)}%`,
          helper: 'Progress toward your goal.',
          icon: <Flame className="h-4 w-4" />,
          tone: 'fuchsia'
        }
      ]
    }
    if (goalType === 'balanced') {
      const infl = plan?.inflation_target_pct ?? (inflationMode === 'sarb' ? sarbInflationTarget : Number(customInflation))
      return [
        {
          id: 'real-return',
          label: 'True Power',
          value: `${(plan?.real_return_pct ?? 0).toFixed(2)}%`,
          helper: 'Return above the inflation guardrail.',
          icon: <ShieldCheck className="h-4 w-4" />,
          tone: 'amber'
        },
        {
          id: 'inflation-line',
          label: 'CPI Shield',
          value: `${infl}%`,
          helper: 'Your barrier against inflation.',
          icon: <Sparkles className="h-4 w-4" />,
          tone: 'amber'
        },
        {
          id: 'status',
          label: 'Shield Status',
          value: (plan?.real_return_pct ?? 0) >= 0 ? 'ACTIVE' : 'WARNING',
          helper: 'Real-time protection check.',
          icon: <Activity className="h-4 w-4" />,
          tone: (plan?.real_return_pct ?? 0) >= 0 ? 'emerald' : 'fuchsia'
        }
      ]
    }
    const currentInc = plan?.current_monthly_income ?? 0
    return [
      {
        id: 'passive',
        label: 'Passive Stream',
        value: currencyFormatter.format(currentInc),
        helper: 'Money acting on your behalf.',
        icon: <Coins className="h-4 w-4" />,
        tone: 'emerald'
      },
      {
        id: 'yield',
        label: 'Engine Efficiency',
        value: `${(plan?.dividend_yield_pct ?? 0).toFixed(2)}%`,
        helper: 'Current dividend output.',
        icon: <TrendingUp className="h-4 w-4" />,
        tone: 'cyan'
      },
      {
        id: 'gap',
        label: 'Goal Gap',
        value: currencyFormatter.format(Math.max((plan?.target_monthly_income ?? 0) - currentInc, 0)),
        helper: 'Distance to freedom.',
        icon: <Flame className="h-4 w-4" />,
        tone: 'fuchsia'
      }
    ]
  }, [plan, goalType, targetValue, progressPct, inflationMode, customInflation])

  return (
    <div className="space-y-10 pb-20">
      {/* Gamified Hero */}
      <section className="relative overflow-hidden rounded-[40px] border border-brand-coral/10 bg-white p-8 shadow-2xl shadow-brand-coral/5 lg:p-12">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-coral/5 blur-3xl opacity-60"></div>
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-brand-mint/5 blur-3xl opacity-40"></div>

        <div className="relative z-10 flex flex-col items-center gap-12 lg:flex-row lg:justify-between">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <span className={`flex items-center gap-2 rounded-full ${currentStatus.color} px-4 py-1.5 text-xs font-bold text-white shadow-lg`}>
                {currentStatus.icon}
                RANK: {currentStatus.label.toUpperCase()}
              </span>
              <span className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600">
                <Target className="h-3 w-3" />
                GOAL: {goalType.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
                {GOAL_META[goalType].title}
              </h1>
              <p className="text-lg font-medium text-slate-500">
                {GOAL_META[goalType].tone}
              </p>
            </div>

            <p className="max-w-xl text-slate-500">
              {GOAL_META[goalType].helper}
            </p>

            <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
              <button
                onClick={handleOptimize}
                className="flex items-center gap-2 rounded-2xl bg-brand-coral px-8 py-4 text-sm font-bold text-white shadow-xl shadow-brand-coral/20 transition hover:bg-brand-coral/90 hover:shadow-2xl active:scale-95"
              >
                Optimize My Plan
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-2xl border border-brand-coral/30 bg-white px-8 py-4 text-sm font-bold text-brand-coral transition hover:bg-brand-coral/5 active:scale-95"
              >
                {shareStatus === 'copied' ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {shareStatus === 'copied' ? 'Link Copied!' : 'Share Progress'}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <HealthScoreGauge value={progressPct} accent={GOAL_META[goalType].accent} label={currentStatus.label} />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Next Milestone At</span>
              <span className="text-xl font-black text-slate-900">
                {STATUS_RANKS.find(r => r.min > progressPct)?.min ?? 100}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {shareStatus === 'copied' && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-full bg-brand-coral px-6 py-3 text-sm font-bold text-white shadow-2xl shadow-brand-coral/40">
            <CheckCircle2 className="h-4 w-4" />
            Progress link copied to clipboard!
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Input Panel */}
        <div ref={engineRef} className="flex flex-col gap-6 lg:col-span-1">
          <div className="flex h-full flex-col rounded-[32px] border border-brand-coral/10 bg-white p-8 shadow-xl shadow-brand-coral/5">
            <h3 className="mb-8 text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-coral/10 flex items-center justify-center">
                <Gauge className="h-4 w-4 text-brand-coral" />
              </div>
              Planning Engine
            </h3>

            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Strategy</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['growth', 'balanced', 'income'] as GoalType[]).map(g => (
                    <button
                      key={g}
                      onClick={() => setGoalType(g)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${goalType === g
                        ? 'border-brand-coral bg-brand-coral text-white shadow-lg shadow-brand-coral/20'
                        : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-brand-coral/20 hover:bg-brand-coral/5 hover:text-brand-coral'
                        }`}
                    >
                      {React.cloneElement(GOAL_META[g].icon as React.ReactElement, { className: 'h-4 w-4' })}
                      <span className="text-[10px] font-bold uppercase">{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Investment Horizon</p>
                  <span className="text-sm font-black text-brand-coral">{termYears} YEARS</span>
                </div>
                <input
                  type="range" min="1" max="30" value={termYears}
                  onChange={(e) => setTermYears(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-coral"
                />
              </div>

              {goalType === 'growth' && (
                <>
                  <InputCard label="Target Goal" value={targetValue} unit="R" onChange={setTargetValue} min={1000} max={10000000} step={10000} />
                  <InputCard label="Monthly Contribution" value={Number(monthlyBudget) || 0} unit="R" onChange={(v) => setMonthlyBudget(String(v))} min={0} max={100000} step={500} />
                </>
              )}

              {goalType === 'balanced' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Inflation Shield</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setInflationMode('sarb')}
                      className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${inflationMode === 'sarb' ? 'border-brand-gold bg-amber-50 text-amber-900' : 'border-slate-100 text-slate-500'
                        }`}
                    >
                      <span className="text-sm font-bold">SARB Target (6%)</span>
                      <ShieldCheck className={`h-4 w-4 ${inflationMode === 'sarb' ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                    <button
                      onClick={() => setInflationMode('custom')}
                      className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${inflationMode === 'custom' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-100 text-slate-500'
                        }`}
                    >
                      <span className="text-sm font-bold">Custom Line</span>
                      <Activity className={`h-4 w-4 ${inflationMode === 'custom' ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                    {inflationMode === 'custom' && (
                      <InputCard label="Target %" value={Number(customInflation)} unit="%" onChange={(v) => setCustomInflation(String(v))} min={1} max={25} step={0.5} />
                    )}
                  </div>
                </div>
              )}

              {goalType === 'income' && (
                <>
                  <InputCard label="Target Stream" value={Number(incomeGoal)} unit="R" onChange={(v) => setIncomeGoal(String(v))} min={100} max={500000} step={500} />
                  <div className="grid grid-cols-2 gap-2">
                    {['monthly', 'annual'].map((f) => (
                      <button
                        key={f} onClick={() => setIncomeFrequency(f as any)}
                        className={`rounded-xl py-2 text-[10px] font-black uppercase transition-all ${incomeFrequency === f ? 'bg-brand-coral text-white shadow-md shadow-brand-coral/20' : 'bg-slate-50 text-slate-400'
                          }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleUpdate}
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-coral py-4 text-sm font-bold text-white shadow-lg shadow-brand-coral/20 transition hover:bg-brand-coral/90 disabled:opacity-50"
            >
              {loading ? <Activity className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'CALCULATING...' : 'SYNC ENGINE'}
            </button>
            {error && <p className="mt-2 text-center text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}
          </div>
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Checkpoint Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {highlightCards.map(c => (
              <CheckpointCard key={c.id} {...c} />
            ))}
          </div>

          {/* Detailed Stats */}
          <div className="flex-1 rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-coral/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-brand-coral" />
                </div>
                Plan Diagnostics
              </h3>
              {plan && (
                <span className="rounded-full bg-brand-coral/10 px-3 py-1 text-[10px] font-black text-brand-coral uppercase tracking-tighter">
                  Synced Successfully
                </span>
              )}
            </div>

            {!plan && !loading && (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 text-center">
                <div className="mb-4 h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                  <Target className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Sync your plan to see diagnostics</p>
              </div>
            )}

            {plan && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  <StatItem label="Portfolio Now" value={currencyFormatter.format(plan.current_value || 0)} icon={<Wallet />} />
                  <StatItem label="Est. Annual Return" value={`${(plan.annual_return_pct || 0).toFixed(2)}%`} icon={<TrendingUp />} />
                  <StatItem label="Monthly Contribution" value={currencyFormatter.format(plan.monthly_budget || 0)} icon={<Coins />} />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <ResultBox
                    title="Path to Success"
                    items={[
                      { label: 'Recommended Contribution', value: currencyFormatter.format(plan.required_monthly_contribution || 0) },
                      { label: 'Estimated Timeline', value: plan.timeline_for_budget_months ? `${(plan.timeline_for_budget_months / 12).toFixed(1)} Years` : 'TBD' }
                    ]}
                  />
                  <ResultBox
                    title="Capital Injection"
                    items={[
                      { label: 'Once-off Lump Sum', value: currencyFormatter.format(plan.lump_sum_gap || 0) },
                      { label: 'Real Return spread', value: `${(plan.real_return_pct || 0).toFixed(2)} pts` }
                    ]}
                  />
                </div>

                {plan.message && (
                  <div className="rounded-2xl border border-brand-coral/10 bg-brand-coral/5 p-6 text-slate-900 border-l-4 border-l-brand-coral">
                    <p className="flex items-start gap-3 text-sm font-medium leading-relaxed">
                      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-brand-coral" />
                      {plan.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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

const CheckpointCard: React.FC<HighlightCardShape> = ({ label, value, helper, icon, tone }) => {
  const colors: Record<AccentKey, string> = {
    cyan: 'bg-brand-mint text-white',
    violet: 'bg-brand-coral text-white',
    emerald: 'bg-brand-mint text-white',
    amber: 'bg-brand-gold text-white',
    fuchsia: 'bg-brand-coral text-white'
  }
  const hoverClass = colors[tone as AccentKey] || 'bg-brand-coral text-white'

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-900 group-hover:${hoverClass} transition-colors`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-[10px] font-bold text-slate-400">{helper}</p>
    </div>
  )
}

const InputCard: React.FC<{ label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }> = ({ label, value, unit, min, max, step, onChange }) => (
  <div className="space-y-4 rounded-3xl border border-slate-50 bg-slate-50/50 p-6">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <span className="text-xs font-black text-brand-coral">
        {unit}{value.toLocaleString()}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-coral"
    />
  </div>
)

const StatItem: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-50 bg-slate-50/30 p-4">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-coral/10 text-brand-coral`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
      <p className="text-lg font-black text-slate-900 truncate">{value}</p>
    </div>
  </div>
)

const ResultBox: React.FC<{ title: string; items: { label: string; value: string }[] }> = ({ title, items }) => (
  <div className={`rounded-3xl bg-slate-50/50 p-6 border border-slate-50`}>
    <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
    <div className="space-y-4">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <span className="text-sm font-medium text-slate-500">{it.label}</span>
          <span className={`text-sm font-black text-brand-coral`}>{it.value}</span>
        </div>
      ))}
    </div>
  </div>
)

export default Health
