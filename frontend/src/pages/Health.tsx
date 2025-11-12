import React, { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Gauge, Coins, ShieldCheck, ArrowUpRight, Wallet, BarChart3 } from 'lucide-react'
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

const GOAL_META: Record<GoalType, { title: string; tone: string; icon: React.ReactNode; helper: string }> = {
  growth: {
    title: 'Growth runway',
    tone: 'Aim higher without guesswork.',
    icon: <TrendingUp className="text-cyan-300" />,
    helper: 'Keep rand targets in sight by translating them into monthly actions.'
  },
  balanced: {
    title: 'Inflation shield',
    tone: 'Stay safely ahead of rising prices.',
    icon: <ShieldCheck className="text-amber-200" />,
    helper: 'Track whether your rand return is beating the inflation line you care about.'
  },
  income: {
    title: 'Income engine',
    tone: 'Let dividends carry everyday costs.',
    icon: <Coins className="text-emerald-300" />,
    helper: 'See how today’s yield converts into tomorrow’s paycheck and what to do next.'
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
        icon: meta.icon
      }
    }
    if (goalType === 'growth') {
      return {
        title: meta.title,
        primary: `Aim for ${currencyFormatter.format(plan.target_value || targetValue)}`,
        detail: plan.message || meta.helper,
        badge: `${(plan.progress_pct ?? 0).toFixed(1)}% complete`,
        icon: meta.icon
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
        icon: meta.icon
      }
    }
    return {
      title: meta.title,
      primary: `${currencyFormatter.format(plan.current_monthly_income || 0)} / mo now`,
      detail: plan.message || meta.helper,
      badge: `Goal: ${currencyFormatter.format(plan.target_monthly_income || 0)} / mo`,
      icon: meta.icon
    }
  }, [plan, goalType, targetValue])

  const renderPlanSummary = () => {
    if (!plan || plan.goal_type !== goalType) return null

    if (goalType === 'growth') {
      const timelineYears = plan.timeline_for_budget_months ? plan.timeline_for_budget_months / 12 : null
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 auto-rows-fr">
            <ResultCard label="Current value" value={`R ${plan.current_value?.toLocaleString() ?? '0'}`} />
            <ResultCard label="Target value" value={`R ${plan.target_value?.toLocaleString() ?? '0'}`} />
            <ResultCard label="Progress" value={`${plan.progress_pct?.toFixed(1) ?? '0'}%`} helper="How close you are to the growth goal." />
          </div>
          <div className="grid gap-4 sm:grid-cols-3 auto-rows-fr">
            <ResultCard label="Annual return assumption" value={`${plan.annual_return_pct?.toFixed(2) ?? '0'}% p.a.`} />
            <ResultCard label="Monthly needed" value={`R ${plan.required_monthly_contribution?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'}`} helper="Projected contribution to land the target within the chosen term." />
            <ResultCard label="Once-off gap" value={`R ${plan.lump_sum_gap?.toLocaleString() ?? '0'}`} helper="Capital boost required if you prefer a lump sum." />
          </div>
          {plan.monthly_budget && (
            <ResultCard
              label="Budget timeline"
              value={plan.timeline_for_budget_months ? `${(timelineYears ?? 0).toFixed(1)} yrs` : 'n/a'}
              helper={`With a monthly budget of R ${plan.monthly_budget?.toLocaleString()}, this is how long it could take.`}
            />
          )}
          <p className="text-sm text-muted dark:text-gray-300">{plan.message}</p>
        </div>
      )
    }

    if (goalType === 'balanced') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 auto-rows-fr">
            <ResultCard label="Nominal return" value={`${plan.nominal_return_pct?.toFixed(2) ?? '0'}% p.a.`} />
            <ResultCard label="Inflation target" value={`${plan.inflation_target_pct?.toFixed(2) ?? '0'}% p.a.`} helper={inflationMode === 'sarb' ? 'SARB upper target' : 'Custom target selected'} />
            <ResultCard label="Real return" value={`${plan.real_return_pct?.toFixed(2) ?? '0'} pts`} helper="Return minus inflation target." status={plan.status} />
          </div>
          <p className="text-sm text-muted dark:text-gray-300">{plan.message}</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3 auto-rows-fr">
          <ResultCard label="Current monthly income" value={`R ${plan.current_monthly_income?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'}`} />
          <ResultCard label="Target monthly income" value={`R ${plan.target_monthly_income?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'}`} />
          <ResultCard label="Yield" value={`${plan.dividend_yield_pct?.toFixed(2) ?? '0'}%`} helper="Weighted dividend yield from your holdings." />
        </div>
        <div className="grid gap-4 sm:grid-cols-3 auto-rows-fr">
          <ResultCard label="Monthly needed" value={`R ${plan.required_monthly_contribution?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'}`} />
          <ResultCard label="Once-off gap" value={`R ${plan.lump_sum_gap?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'}`} />
          {plan.monthly_budget && (
            <ResultCard
              label="Budget timeline"
              value={plan.timeline_for_budget_months ? `${(plan.timeline_for_budget_months / 12).toFixed(1)} yrs` : 'n/a'}
              helper={`With a monthly budget of R ${plan.monthly_budget?.toLocaleString()}, this is how long to hit the goal.`}
            />
          )}
        </div>
        <p className="text-sm text-muted dark:text-gray-300">{plan.message}</p>
      </div>
    )
  }

  const renderInputs = () => {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <GoalTab
            label="Growth target"
            active={goalType === 'growth'}
            icon={<TrendingUp className="h-4 w-4" />}
            onClick={() => setGoalType('growth')}
            helper="Chase a rand milestone"
          />
          <GoalTab
            label="Balanced (beat inflation)"
            active={goalType === 'balanced'}
            icon={<Gauge className="h-4 w-4" />}
            onClick={() => setGoalType('balanced')}
            helper="Stay ahead of CPI"
          />
          <GoalTab
            label="Income (dividends)"
            active={goalType === 'income'}
            icon={<Wallet className="h-4 w-4" />}
            onClick={() => setGoalType('income')}
            helper="Cover living costs"
          />
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          <span className="text-xs uppercase tracking-wide text-slate-400">Term (years)</span>
          <input
            type="number"
            min={1}
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value) || 1)}
            className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </label>

        {goalType === 'growth' && (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-wide text-slate-400">Target portfolio value (ZAR)</span>
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:ring-2 focus:ring-cyan-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-wide text-slate-400">Monthly budget (optional)</span>
              <input
                type="number"
                min={0}
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:ring-2 focus:ring-cyan-400"
              />
            </label>
          </>
        )}

        {goalType === 'balanced' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={inflationMode === 'sarb'} onChange={() => setInflationMode('sarb')} />
                Use SARB upper target (6%)
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={inflationMode === 'custom'} onChange={() => setInflationMode('custom')} />
                Custom
              </label>
            </div>
            {inflationMode === 'custom' && (
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-wide text-slate-400">Custom inflation target (% p.a.)</span>
                <input
                  type="number"
                  min={0}
                  value={customInflation}
                  onChange={(e) => setCustomInflation(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:ring-2 focus:ring-cyan-400"
                />
              </label>
            )}
          </div>
        )}

        {goalType === 'income' && (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-wide text-slate-400">Income goal</span>
              <input
                type="number"
                min={0}
                value={incomeGoal}
                onChange={(e) => setIncomeGoal(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:ring-2 focus:ring-cyan-400"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-wide text-slate-400">Frequency</span>
              <select
                value={incomeFrequency}
                onChange={(e) => setIncomeFrequency(e.target.value as 'monthly' | 'annual')}
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:ring-2 focus:ring-cyan-400"
              >
                <option value="monthly">Per month</option>
                <option value="annual">Per year</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-wide text-slate-400">Monthly budget (optional)</span>
              <input
                type="number"
                min={0}
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2 text-white shadow-inner focus:ring-2 focus:ring-cyan-400"
              />
            </label>
          </>
        )}

        <button type="button" onClick={handleUpdate} className="btn-cta" disabled={loading}>
          {loading ? 'Updating…' : 'Update health plan'}
        </button>
        {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-[11px] uppercase tracking-[0.35em] text-cyan-300">
            <BarChart3 className="h-3 w-3" /> Health desk
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold">Stay on plan, the easy way</h1>
              <p className="text-sm text-slate-300">
                Translate goals into contributions, see if inflation is catching up, and keep dividend targets honest — without spreadsheets.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/30"
              onClick={() => goalType !== 'growth' && setGoalType('growth')}
            >
              <ArrowUpRight className="h-4 w-4" /> Start fresh goal
            </button>
          </div>
        </header>

        <section className="rounded-3xl bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-cyan-200">
                {heroContent.badge}
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  {heroContent.icon}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">{heroContent.title}</p>
                  <p className="text-sm text-slate-300">{heroContent.primary}</p>
                </div>
              </div>
              <p className="text-sm text-slate-200 max-w-2xl">{heroContent.detail}</p>
            </div>
            <div className="flex items-center gap-6">
              {derivedProgressPct !== null && (
                <ProgressOrb value={derivedProgressPct} label={goalType === 'balanced' ? 'Real return gauge' : 'Plan progress'} />
              )}
              <div className="hidden text-sm text-slate-300 md:block">
                <p className="text-xs uppercase tracking-wide text-slate-400">Term</p>
                <p className="text-xl font-semibold text-white">{termYears} year(s)</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-slate-900/70 p-6 shadow-xl">
            {renderInputs()}
          </div>
          <div className="rounded-3xl bg-slate-900/60 p-6 shadow-xl">
            {loading && <p className="text-sm text-slate-300">Crunching the numbers…</p>}
            {!loading && plan && renderPlanSummary()}
            {!loading && !plan && !error && (
              <p className="text-sm text-slate-400">Enter your goal details and we’ll project the required steps.</p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

interface ResultCardProps {
  label: string
  value: string
  helper?: string
  status?: string
}

const ResultCard: React.FC<ResultCardProps> = ({ label, value, helper, status }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    {status && <p className="text-xs text-cyan-300">Status: {status}</p>}
    {helper && <p className="text-xs text-slate-400">{helper}</p>}
  </div>
)

interface ProgressOrbProps {
  value: number
  label: string
}

const ProgressOrb: React.FC<ProgressOrbProps> = ({ value, label }) => {
  const clamped = Math.min(Math.max(value, 0), 100)
  const gradient = `conic-gradient(#22d3ee ${clamped}%, rgba(255,255,255,0.1) ${clamped}% 100%)`
  return (
    <div className="text-center">
      <div className="relative mx-auto h-32 w-32">
        <div className="absolute inset-0 rounded-full" style={{ background: gradient }}></div>
        <div className="absolute inset-3 rounded-full bg-slate-950/80 flex items-center justify-center">
          <div>
            <p className="text-2xl font-semibold text-white">{clamped.toFixed(0)}%</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
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
}

const GoalTab: React.FC<GoalTabProps> = ({ label, helper, icon, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[110px] flex-col justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan-300 bg-gradient-to-br from-cyan-500/20 to-cyan-300/10 text-cyan-50 shadow-lg' : 'border-white/5 bg-slate-900/50 text-slate-200 hover:border-cyan-300/40'}`}
  >
    <span className="flex items-center gap-2 text-sm font-semibold">{icon} {label}</span>
    <span className="text-xs text-slate-400">{helper}</span>
  </button>
)
