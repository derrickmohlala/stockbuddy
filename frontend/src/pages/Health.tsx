import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Gauge,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
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
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Plan controls</p>
            <h2 className="text-xl font-semibold text-primary-ink dark:text-tone-primary">Tune your north star</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-soft bg-white/70 px-3 py-1 text-xs text-subtle dark:bg-white/10 dark:text-tone-secondary">
            <Sparkles className="h-4 w-4 text-brand-purple" /> Live preview
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

        <FieldShell label="Term (years)">
          <input
            type="number"
            min={1}
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value) || 1)}
            className="input-field"
          />
        </FieldShell>

        {goalType === 'growth' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Target portfolio value (ZAR)">
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                className="input-field"
              />
            </FieldShell>
            <FieldShell label="Monthly budget (optional)">
              <input
                type="number"
                min={0}
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="input-field"
              />
            </FieldShell>
          </div>
        )}

        {goalType === 'balanced' && (
          <div className="surface-card space-y-4 bg-white/75 p-5 dark:bg-white/5">
            <p className="text-sm font-semibold text-primary-ink dark:text-tone-primary">Inflation guardrail</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-subtle">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={inflationMode === 'sarb'}
                  onChange={() => setInflationMode('sarb')}
                  className="h-4 w-4 accent-brand-purple"
                />
                SARB upper target (6%)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={inflationMode === 'custom'}
                  onChange={() => setInflationMode('custom')}
                  className="h-4 w-4 accent-brand-purple"
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
                  className="input-field"
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
                className="input-field"
              />
            </FieldShell>
            <FieldShell label="Frequency">
              <select
                value={incomeFrequency}
                onChange={(e) => setIncomeFrequency(e.target.value as 'monthly' | 'annual')}
                className="input-field"
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
                className="input-field"
              />
            </FieldShell>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Update any slider or input and refresh for an instant recalculation.</p>
          <button
            type="button"
            onClick={handleUpdate}
            className="btn-cta px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
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
        {error && <p className="text-sm text-danger-500 dark:text-danger-300">{error}</p>}
      </div>
    )
  }

  return (
    <>
      <section className="section-hero space-y-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="badge bg-white/80 dark:bg-white/15">{heroContent.badge}</span>
            <div className="flex items-start gap-4">
              <div className="surface-glass inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-card">
                {heroContent.icon}
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-primary-ink dark:text-tone-primary">{heroContent.title}</p>
                <p className="text-lg font-medium text-subtle">{heroContent.primary}</p>
              </div>
            </div>
            <p className="text-subtle max-w-3xl">{heroContent.detail}</p>
            <button
              className="btn-secondary"
              onClick={() => goalType !== 'growth' && setGoalType('growth')}
            >
              <ArrowUpRight className="h-4 w-4" />
              Start fresh goal
            </button>
          </div>
          <div className="flex flex-col items-start gap-4 lg:w-72">
            {derivedProgressPct !== null && (
              <ProgressOrb
                value={derivedProgressPct}
                label={goalType === 'balanced' ? 'Real return gauge' : goalType === 'income' ? 'Income coverage' : 'Plan progress'}
                accent={heroContent.accent}
              />
            )}
            <div className="w-full rounded-2xl border border-soft bg-white/70 px-4 py-3 text-sm text-subtle shadow-card dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Term length</p>
              <p className="text-xl font-semibold text-primary-ink dark:text-tone-primary">{termYears} year(s)</p>
            </div>
          </div>
        </div>
      </section>

      {highlightCards.length > 0 && (
        <section className="section-surface space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-primary-ink dark:text-tone-primary">Plan checkpoints</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-muted">Live metrics</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {highlightCards.map((card) => (
              <HighlightCard key={card.id} {...card} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className="surface-card p-6">
          {renderInputs()}
        </div>
        <div className="surface-panel space-y-6 p-6">
          {loading && <p className="text-sm text-subtle">Crunching the numbers…</p>}
          {!loading && plan && renderPlanSummary()}
          {!loading && !plan && !error && (
            <div className="space-y-3 text-sm text-subtle">
              <p>Enter your goal details and we’ll project the required steps.</p>
              <p className="text-muted">
                Tip: Save a snapshot once you like the configuration so you can compare what-if scenarios.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-danger-500 dark:text-danger-300">{error}</p>}
        </div>
      </section>
    </>
  )
}

interface ResultCardProps {
  label: string
  value: string
  helper?: string
  status?: string
}

const ResultCard: React.FC<ResultCardProps> = ({ label, value, helper, status }) => (
  <div className="surface-card relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-pop">
    <div className="pointer-events-none absolute -right-12 top-0 h-28 w-28 rounded-full bg-brand-purple/10 blur-3xl opacity-70"></div>
    <p className="text-[11px] uppercase tracking-[0.3em] text-muted">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-primary-ink dark:text-tone-primary">{value}</p>
    {status && <p className="mt-1 text-xs font-semibold text-brand-purple dark:text-brand-gold">Status: {status}</p>}
    {helper && <p className="mt-3 text-xs text-subtle">{helper}</p>}
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
    <div className="relative flex flex-col items-center">
      <div className={`absolute inset-0 h-36 w-36 rounded-full ${palette.glow} opacity-40 blur-3xl`}></div>
      <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-soft bg-white/80 p-1 shadow-card dark:bg-white/10">
        <div className="relative h-full w-full rounded-full border border-soft" style={{ background: gradient }}>
          <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white/95 text-center dark:bg-surface-contrast">
            <p className="text-3xl font-semibold text-primary-ink dark:text-tone-primary">{clamped.toFixed(0)}%</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted dark:text-tone-secondary">{label}</p>
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
        active ? accent.icon : 'text-muted'
      } transition-colors duration-200`
    })

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
        active
          ? `${accent.border} ${accent.background} text-white shadow-pop`
          : 'border-soft bg-white/70 text-subtle hover:-translate-y-0.5 hover:border-brand-purple/30 dark:bg-white/5 dark:text-tone-secondary'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className={`absolute -top-16 right-0 h-28 w-28 ${accent.glow} blur-3xl`}></div>
      </div>
      <span className="flex items-center gap-2 text-sm font-semibold">
        {iconElement || icon} {label}
      </span>
      <span className="text-xs text-subtle group-hover:text-primary-ink dark:group-hover:text-white">{helper}</span>
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
    <span className="text-[11px] uppercase tracking-[0.3em] text-muted">{label}</span>
    {children}
  </label>
)

interface PlanSectionHeaderProps {
  title: string
  subtitle?: string
}

const PlanSectionHeader: React.FC<PlanSectionHeaderProps> = ({ title, subtitle }) => (
  <div className="space-y-2">
    <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Plan intel</p>
    <h3 className="text-xl font-semibold text-primary-ink dark:text-tone-primary">{title}</h3>
    {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
  </div>
)

const PlanCallout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-4 text-sm text-primary-ink shadow-inner shadow-brand-purple/20 dark:border-brand-purple/40 dark:bg-brand-purple/20 dark:text-tone-primary">
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
      className={`surface-card relative overflow-hidden border ${accent.border} bg-white/80 p-5 shadow-card transition hover:-translate-y-1 hover:shadow-pop dark:bg-white/10`}
    >
      <div className={`pointer-events-none absolute -right-14 top-0 h-32 w-32 rounded-full ${accent.glow} blur-3xl opacity-60`}></div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-primary-ink dark:text-tone-primary">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-soft bg-white/70 dark:bg-white/5">
          {iconElement || icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-subtle">{helper}</p>
    </div>
  )
}
