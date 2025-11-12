import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Gauge,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  BarChart3,
  Sparkles,
  Target,
  CircleDot,
  Flame,
  Activity
} from 'lucide-react'
import { apiFetch } from '../lib/api'

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

const GOAL_META: Record<
  GoalType,
  { title: string; tone: string; icon: React.ReactNode; helper: string; accent: AccentKey }
> = {
  growth: {
    title: 'Growth runway',
    tone: 'Aim higher without guesswork.',
    icon: <TrendingUp className="h-6 w-6 text-cyan-300" />,
    helper: 'Keep rand targets in sight by translating them into monthly actions.',
    accent: 'cyan'
  },
  balanced: {
    title: 'Inflation shield',
    tone: 'Stay safely ahead of rising prices.',
    icon: <ShieldCheck className="h-6 w-6 text-amber-200" />,
    helper: 'Track whether your rand return is beating the inflation line you care about.',
    accent: 'amber'
  },
  income: {
    title: 'Income engine',
    tone: 'Let dividends carry everyday costs.',
    icon: <Coins className="h-6 w-6 text-emerald-300" />,
    helper: 'See how today’s yield converts into tomorrow’s paycheck and what to do next.',
    accent: 'emerald'
  }
}

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
        throw new Error(err.error || 'Unable to generate health plan right now.')
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
    if (userId) {
      fetchPlan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, goalType])

  const handleUpdate = () => {
    if (userId) fetchPlan()
  }

  const derivedProgressPct = useMemo(() => {
    if (!plan) return null
    if (goalType === 'growth') {
      return plan.progress_pct ?? null
    }
    if (goalType === 'balanced') {
      const nominal = plan.nominal_return_pct ?? 0
      const inflation = plan.inflation_target_pct ?? sarbInflationTarget
      if (inflation <= 0) return null
      const ratio = nominal / inflation
      return Math.min(Math.max(ratio * 50, 0), 100)
    }
    const current = plan?.current_monthly_income ?? plan?.current_annual_income ?? 0
    const target = plan?.target_monthly_income ?? plan?.target_annual_income ?? 0
    if (!target) return null
    return Math.min((current / target) * 100, 100)
  }, [plan, goalType])

  const heroContent = useMemo(() => {
    const meta = GOAL_META[goalType]
    if (!plan) {
      return {
        title: meta.title,
        primary: meta.tone,
        detail: meta.helper,
        badge: 'Setup pending',
        icon: meta.icon,
        accent: meta.accent
      }
    }
    if (goalType === 'growth') {
      return {
        title: meta.title,
        primary: `Aim for ${currencyFormatter.format(plan.target_value || targetValue)}`,
        detail: plan.message || meta.helper,
        badge: `${(plan.progress_pct ?? 0).toFixed(1)}% complete`,
        icon: meta.icon,
        accent: meta.accent
      }
    }
    if (goalType === 'balanced') {
      const real = plan.real_return_pct ?? 0
      const status = real >= 0 ? 'Ahead of inflation' : 'Lagging inflation'
      return {
        title: meta.title,
        primary: `${real.toFixed(2)} pts real return`,
        detail: plan.message || meta.helper,
        badge: status,
        icon: meta.icon,
        accent: meta.accent
      }
    }
    return {
      title: meta.title,
      primary: `${currencyFormatter.format(plan.current_monthly_income || 0)} / mo now`,
      detail: plan.message || meta.helper,
      badge: `Goal: ${currencyFormatter.format(plan.target_monthly_income || 0)} / mo`,
      icon: meta.icon,
      accent: meta.accent
    }
  }, [plan, goalType, targetValue])

  const highlightCards = useMemo<HighlightCardShape[]>(() => {
    const accentHint = GOAL_META[goalType].accent

    if (goalType === 'growth') {
      return [
        {
          id: 'target',
          label: 'Target runway',
          value: currencyFormatter.format(plan?.target_value ?? targetValue),
          helper: plan
            ? 'The rand milestone you are compounding toward.'
            : 'Set a stretch goal to see what it takes.',
          icon: <Target className="h-4 w-4" />,
          tone: accentHint
        },
        {
          id: 'contribution',
          label: 'Monthly power-up',
          value: plan?.required_monthly_contribution
            ? `R ${plan.required_monthly_contribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : plan?.monthly_budget
            ? `R ${plan.monthly_budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : '--',
          helper: plan
            ? 'Keep this pace to land the target inside your term.'
            : 'Add an optional budget to preview the pace.',
          icon: <Wallet className="h-4 w-4" />,
          tone: 'emerald'
        },
        {
          id: 'momentum',
          label: 'Momentum score',
          value: plan ? `${Math.round(plan.progress_pct ?? 0)}%` : '--',
          helper: plan
            ? 'Relative progress toward the growth milestone.'
            : 'Progress shows once your plan is generated.',
          icon: <Activity className="h-4 w-4" />,
          tone: 'violet'
        }
      ]
    }

    if (goalType === 'balanced') {
      const chosenInflation =
        plan?.inflation_target_pct ??
        (inflationMode === 'sarb' ? sarbInflationTarget : Number(customInflation) || sarbInflationTarget)

      return [
        {
          id: 'real-return',
          label: 'Real return',
          value: plan ? `${(plan.real_return_pct ?? 0).toFixed(2)} pts` : '--',
          helper: plan ? plan.status ?? 'Comparison against your inflation guardrail.' : 'We evaluate once data syncs.',
          icon: <Gauge className="h-4 w-4" />,
          tone: accentHint
        },
        {
          id: 'inflation-line',
          label: 'Inflation line',
          value: `${chosenInflation.toFixed(1)}%`,
          helper: inflationMode === 'sarb' ? 'SARB upper target baked in.' : 'Custom CPI line you set.',
          icon: <Sparkles className="h-4 w-4" />,
          tone: 'amber'
        },
        {
          id: 'timeline',
          label: 'Term in focus',
          value: `${termYears} yrs`,
          helper: 'Use the term slider to shorten or extend the runway.',
          icon: <CircleDot className="h-4 w-4" />,
          tone: 'violet'
        }
      ]
    }

    const currentIncome =
      plan?.current_monthly_income ??
      (plan?.current_annual_income ? plan.current_annual_income / 12 : parsedMonthlyBudget ?? 0)
    const targetIncome =
      plan?.target_monthly_income ??
      (plan?.target_annual_income ? plan.target_annual_income / 12 : Number(incomeGoal) || 0)
    const gap = Math.max((targetIncome ?? 0) - (currentIncome ?? 0), 0)

    return [
      {
        id: 'passive-income',
        label: 'Passive income now',
        value: plan ? currencyFormatter.format(currentIncome || 0) : '--',
        helper: plan ? 'What your holdings currently spin off per month.' : 'Fill in your goal to see projections.',
        icon: <Coins className="h-4 w-4" />,
        tone: accentHint
      },
      {
        id: 'yield-pulse',
        label: 'Yield pulse',
        value: plan ? `${(plan.dividend_yield_pct ?? 0).toFixed(2)}%` : '--',
        helper: 'Weighted dividend yield from your basket.',
        icon: <TrendingUp className="h-4 w-4" />,
        tone: 'emerald'
      },
      {
        id: 'goal-gap',
        label: 'Goal gap',
        value: plan ? currencyFormatter.format(gap) : '--',
        helper: plan ? 'Close this gap with contributions or rebalancing.' : 'We’ll surface the gap post-calculation.',
        icon: <Flame className="h-4 w-4" />,
        tone: 'fuchsia'
      }
    ]
  }, [
    customInflation,
    goalType,
    incomeGoal,
    inflationMode,
    parsedMonthlyBudget,
    plan,
    targetValue,
    termYears
  ])

  const renderPlanSummary = () => {
    if (!plan || plan.goal_type !== goalType) return null

    if (goalType === 'growth') {
      const timelineYears = plan.timeline_for_budget_months ? plan.timeline_for_budget_months / 12 : null
      return (
        <div className="space-y-6">
          <PlanSectionHeader
            title="Plan insights"
            subtitle={`What it takes to reach ${currencyFormatter.format(plan.target_value ?? targetValue)}`}
          />
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
            <ResultCard label="Current value" value={`R ${plan.current_value?.toLocaleString() ?? '0'}`} />
            <ResultCard
              label="Target value"
              value={`R ${plan.target_value?.toLocaleString() ?? '0'}`}
              helper="The number you’re compounding toward."
            />
            <ResultCard
              label="Progress"
              value={`${plan.progress_pct?.toFixed(1) ?? '0'}%`}
              helper="How close you are to the growth goal."
            />
          </div>
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
            <ResultCard
              label="Annual return assumption"
              value={`${plan.annual_return_pct?.toFixed(2) ?? '0'}% p.a.`}
              helper="Expected portfolio return used in projections."
            />
            <ResultCard
              label="Monthly needed"
              value={`R ${
                plan.required_monthly_contribution?.toLocaleString(undefined, {
                  maximumFractionDigits: 0
                }) ?? '0'
              }`}
              helper="Keep contributing at this cadence to stay on track."
            />
            <ResultCard
              label="Once-off gap"
              value={`R ${plan.lump_sum_gap?.toLocaleString() ?? '0'}`}
              helper="Capital boost required if you prefer a lump sum."
            />
          </div>
          {plan.monthly_budget && (
            <ResultCard
              label="Budget timeline"
              value={plan.timeline_for_budget_months ? `${(timelineYears ?? 0).toFixed(1)} yrs` : 'n/a'}
              helper={`With a monthly budget of R ${plan.monthly_budget?.toLocaleString()}, this is how long it could take.`}
            />
          )}
          {plan.message && <PlanCallout>{plan.message}</PlanCallout>}
        </div>
      )
    }

    if (goalType === 'balanced') {
      return (
        <div className="space-y-6">
          <PlanSectionHeader title="Inflation defence" subtitle="Track the spread between returns and CPI." />
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
            <ResultCard label="Nominal return" value={`${plan.nominal_return_pct?.toFixed(2) ?? '0'}% p.a.`} />
            <ResultCard
              label="Inflation target"
              value={`${plan.inflation_target_pct?.toFixed(2) ?? '0'}% p.a.`}
              helper={inflationMode === 'sarb' ? 'SARB upper target' : 'Custom target selected'}
            />
            <ResultCard
              label="Real return"
              value={`${plan.real_return_pct?.toFixed(2) ?? '0'} pts`}
              helper="Return minus inflation target."
              status={plan.status}
            />
          </div>
          {plan.message && <PlanCallout>{plan.message}</PlanCallout>}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <PlanSectionHeader title="Income trajectory" subtitle="See how today’s yield stacks up against your lifestyle." />
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
          <ResultCard
            label="Current monthly income"
            value={`R ${
              plan.current_monthly_income?.toLocaleString(undefined, {
                maximumFractionDigits: 0
              }) ?? '0'
            }`}
          />
          <ResultCard
            label="Target monthly income"
            value={`R ${
              plan.target_monthly_income?.toLocaleString(undefined, {
                maximumFractionDigits: 0
              }) ?? '0'
            }`}
          />
          <ResultCard
            label="Yield"
            value={`${plan.dividend_yield_pct?.toFixed(2) ?? '0'}%`}
            helper="Weighted dividend yield from your holdings."
          />
        </div>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
          <ResultCard
            label="Monthly needed"
            value={`R ${
              plan.required_monthly_contribution?.toLocaleString(undefined, {
                maximumFractionDigits: 0
              }) ?? '0'
            }`}
          />
          <ResultCard
            label="Once-off gap"
            value={`R ${
              plan.lump_sum_gap?.toLocaleString(undefined, {
                maximumFractionDigits: 0
              }) ?? '0'
            }`}
          />
          {plan.monthly_budget && (
            <ResultCard
              label="Budget timeline"
              value={plan.timeline_for_budget_months ? `${(plan.timeline_for_budget_months / 12).toFixed(1)} yrs` : 'n/a'}
              helper={`With a monthly budget of R ${plan.monthly_budget?.toLocaleString()}, this is how long to hit the goal.`}
            />
          )}
        </div>
        {plan.message && <PlanCallout>{plan.message}</PlanCallout>}
      </div>
    )
  }

  const renderInputs = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Plan controls</p>
            <h2 className="text-lg font-semibold text-white">Tune your north star</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <Sparkles className="h-4 w-4 text-cyan-300" /> Live preview
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <GoalTab
            label="Growth target"
            active={goalType === 'growth'}
            icon={<TrendingUp className="h-4 w-4" />}
            onClick={() => setGoalType('growth')}
            helper="Chase a rand milestone"
            tone="cyan"
          />
          <GoalTab
            label="Balanced (beat inflation)"
            active={goalType === 'balanced'}
            icon={<Gauge className="h-4 w-4" />}
            onClick={() => setGoalType('balanced')}
            helper="Stay ahead of CPI"
            tone="amber"
          />
          <GoalTab
            label="Income (dividends)"
            active={goalType === 'income'}
            icon={<Wallet className="h-4 w-4" />}
            onClick={() => setGoalType('income')}
            helper="Cover living costs"
            tone="emerald"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell label="Term (years)">
            <input
              type="number"
              min={1}
              value={termYears}
              onChange={(e) => setTermYears(Number(e.target.value) || 1)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </FieldShell>
        </div>

        {goalType === 'growth' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Target portfolio value (ZAR)">
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </FieldShell>
            <FieldShell label="Monthly budget (optional)">
              <input
                type="number"
                min={0}
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </FieldShell>
          </div>
        )}

        {goalType === 'balanced' && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <p className="text-sm font-semibold text-white">Inflation guardrail</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={inflationMode === 'sarb'}
                  onChange={() => setInflationMode('sarb')}
                  className="h-4 w-4 accent-cyan-400"
                />
                SARB upper target (6%)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={inflationMode === 'custom'}
                  onChange={() => setInflationMode('custom')}
                  className="h-4 w-4 accent-cyan-400"
                />
                Custom line
              </label>
            </div>
            {inflationMode === 'custom' && (
              <FieldShell label="Custom inflation target (% p.a.)">
                <input
                  type="number"
                  min={0}
                  value={customInflation}
                  onChange={(e) => setCustomInflation(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </FieldShell>
            )}
          </div>
        )}

        {goalType === 'income' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Income goal">
              <input
                type="number"
                min={0}
                value={incomeGoal}
                onChange={(e) => setIncomeGoal(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </FieldShell>
            <FieldShell label="Frequency">
              <select
                value={incomeFrequency}
                onChange={(e) => setIncomeFrequency(e.target.value as 'monthly' | 'annual')}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              >
                <option value="monthly">Per month</option>
                <option value="annual">Per year</option>
              </select>
            </FieldShell>
            <FieldShell label="Monthly budget (optional)" className="sm:col-span-2">
              <input
                type="number"
                min={0}
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white shadow-inner focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </FieldShell>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Update any slider or input and refresh for an instant recalculation.</p>
          <button
            type="button"
            onClick={handleUpdate}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" />
                Update health plan
              </>
            )}
          </button>
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <DecorativeBackdrop />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 lg:py-20">
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-[11px] uppercase tracking-[0.35em] text-cyan-200">
            <BarChart3 className="h-3 w-3" /> Health desk
          </div>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Stay on plan, the modern way
              </h1>
              <p className="max-w-2xl text-base text-slate-300">
                Translate your ambitions into contributions, see if inflation is catching up, and keep dividend targets honest — all without spreadsheets.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/10"
              onClick={() => goalType !== 'growth' && setGoalType('growth')}
            >
              <ArrowUpRight className="h-4 w-4" /> Start fresh goal
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-cyan-950/40 p-8 shadow-[0_40px_80px_-40px_rgba(34,211,238,0.4)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-cyan-200">
                {heroContent.badge}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-cyan-500/20">
                  {heroContent.icon}
                </div>
                <div>
                  <p className="text-xl font-semibold text-white sm:text-2xl">{heroContent.title}</p>
                  <p className="text-base text-slate-200">{heroContent.primary}</p>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-slate-300">{heroContent.detail}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-8">
              {derivedProgressPct !== null && (
                <ProgressOrb
                  value={derivedProgressPct}
                  label={goalType === 'balanced' ? 'Real return gauge' : goalType === 'income' ? 'Income coverage' : 'Plan progress'}
                  accent={heroContent.accent}
                />
              )}
              <div className="hidden shrink-0 text-sm text-slate-300 sm:block">
                <p className="text-xs uppercase tracking-wide text-slate-400">Term</p>
                <p className="text-xl font-semibold text-white">{termYears} year(s)</p>
              </div>
            </div>
          </div>
        </section>

        {highlightCards.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {highlightCards.map((card) => (
              <HighlightCard key={card.id} {...card} />
            ))}
          </section>
        )}

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-[0_40px_80px_-50px_rgba(15,118,110,0.6)] backdrop-blur">
            {renderInputs()}
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-[0_40px_80px_-50px_rgba(8,145,178,0.6)] backdrop-blur">
            {loading && <p className="text-sm text-slate-300">Crunching the numbers…</p>}
            {!loading && plan && renderPlanSummary()}
            {!loading && !plan && !error && (
              <div className="space-y-4 text-sm text-slate-300">
                <p>Enter your goal details and we’ll project the required steps.</p>
                <p className="text-slate-400">
                  Tip: Save a snapshot once you like the configuration so you can compare what-if scenarios.
                </p>
              </div>
            )}
            {error && <p className="text-sm text-rose-400">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

const DecorativeBackdrop = () => (
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-1/2 top-[-180px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[140px]"></div>
    <div className="absolute right-[-160px] top-[240px] h-[360px] w-[360px] rounded-full bg-violet-500/20 blur-[160px]"></div>
    <div className="absolute bottom-[-180px] left-[-140px] h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-[160px]"></div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_60%)]"></div>
  </div>
)

interface ResultCardProps {
  label: string
  value: string
  helper?: string
  status?: string
}

const ResultCard: React.FC<ResultCardProps> = ({ label, value, helper, status }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-lg transition-all hover:border-cyan-400/30 hover:shadow-cyan-500/20">
    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl transition-all group-hover:bg-cyan-400/20"></div>
    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    {status && <p className="mt-1 text-xs text-cyan-300">Status: {status}</p>}
    {helper && <p className="mt-3 text-xs text-slate-400">{helper}</p>}
  </div>
)

interface ProgressOrbProps {
  value: number
  label: string
  accent?: AccentKey
}

const ProgressOrb: React.FC<ProgressOrbProps> = ({ value, label, accent = 'cyan' }) => {
  const clamped = Math.min(Math.max(value, 0), 100)
  const palette = ACCENT_TOKENS[accent]
  const gradient = `conic-gradient(${palette.conic} ${clamped}%, rgba(255,255,255,0.08) ${clamped}% 100%)`
  return (
    <div className="relative text-center">
      <div className={`absolute inset-2 rounded-full ${palette.glow} blur-3xl opacity-70`}></div>
      <div className="relative mx-auto h-32 w-32 rounded-full bg-slate-950/60 p-1 shadow-inner shadow-black/40">
        <div className="relative h-full w-full rounded-full border border-white/10" style={{ background: gradient }}>
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-slate-950/90">
            <div>
              <p className="text-3xl font-semibold text-white">{clamped.toFixed(0)}%</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Health

interface GoalTabProps {
  label: string
  helper: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  tone: AccentKey
}

const GoalTab: React.FC<GoalTabProps> = ({ label, helper, icon, active, onClick, tone }) => {
  const accent = ACCENT_TOKENS[tone]
  const iconElement =
    React.isValidElement(icon) &&
    React.cloneElement(icon, {
      className: `${icon.props.className ?? ''} ${
        active ? accent.icon : 'text-slate-300'
      } transition-colors duration-200`
    })

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? `${accent.border} ${accent.background} text-white shadow-lg shadow-cyan-500/10`
          : 'border-white/5 bg-slate-950/40 text-slate-200 hover:border-cyan-300/30'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className={`absolute -top-16 right-0 h-28 w-28 ${accent.glow} blur-3xl`}></div>
      </div>
      <span className="flex items-center gap-2 text-sm font-semibold">
        {iconElement || icon} {label}
      </span>
      <span className="text-xs text-slate-400 group-hover:text-slate-300">{helper}</span>
    </button>
  )
}

interface FieldShellProps {
  label: string
  className?: string
  children: React.ReactNode
}

const FieldShell: React.FC<FieldShellProps> = ({ label, children, className }) => (
  <label className={`flex flex-col gap-3 ${className ?? ''}`}>
    <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</span>
    {children}
  </label>
)

interface PlanSectionHeaderProps {
  title: string
  subtitle?: string
}

const PlanSectionHeader: React.FC<PlanSectionHeaderProps> = ({ title, subtitle }) => (
  <div className="space-y-2">
    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Plan intel</p>
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    {subtitle && <p className="text-sm text-slate-300">{subtitle}</p>}
  </div>
)

const PlanCallout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-100 shadow-inner shadow-cyan-500/10">
    {children}
  </div>
)

const ACCENT_TOKENS: Record<
  AccentKey,
  {
    background: string
    border: string
    glow: string
    icon: string
    conic: string
  }
> = {
  cyan: {
    background: 'bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-cyan-500/5',
    border: 'border-cyan-300/60',
    glow: 'bg-cyan-500/30',
    icon: 'text-cyan-100',
    conic: '#22d3ee'
  },
  violet: {
    background: 'bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-violet-500/5',
    border: 'border-violet-300/60',
    glow: 'bg-violet-500/30',
    icon: 'text-violet-100',
    conic: '#a855f7'
  },
  emerald: {
    background: 'bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-emerald-500/5',
    border: 'border-emerald-300/60',
    glow: 'bg-emerald-500/30',
    icon: 'text-emerald-100',
    conic: '#10b981'
  },
  amber: {
    background: 'bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-amber-500/5',
    border: 'border-amber-300/60',
    glow: 'bg-amber-500/30',
    icon: 'text-amber-100',
    conic: '#f59e0b'
  },
  fuchsia: {
    background: 'bg-gradient-to-br from-fuchsia-500/20 via-fuchsia-400/10 to-fuchsia-500/5',
    border: 'border-fuchsia-300/60',
    glow: 'bg-fuchsia-500/30',
    icon: 'text-fuchsia-100',
    conic: '#d946ef'
  }
}

interface HighlightCardShape {
  id: string
  label: string
  value: string
  helper: string
  icon: React.ReactNode
  tone: AccentKey
}

interface HighlightCardProps extends HighlightCardShape {}

const HighlightCard: React.FC<HighlightCardProps> = ({ label, value, helper, icon, tone }) => {
  const accent = ACCENT_TOKENS[tone]
  const iconElement =
    React.isValidElement(icon) &&
    React.cloneElement(icon, {
      className: `${icon.props.className ?? ''} ${accent.icon}`
    })
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 ${accent.background} p-5 shadow-lg shadow-black/30 backdrop-blur transition hover:border-cyan-400/40`}
    >
      <div className={`pointer-events-none absolute -right-14 top-1 h-32 w-32 rounded-full ${accent.glow} blur-3xl`}></div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-200">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          {iconElement || icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-200">{helper}</p>
    </div>
  )
}
