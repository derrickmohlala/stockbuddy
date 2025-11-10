import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, TrendingUp, Target, Calendar, TrendingDown } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface GoalInput {
  label: string
  value: number
  helper: string
}

type GoalType = 'lump_sum' | 'dividend_growth' | 'passive_income'

interface ProjectionSummary {
  current: number
  target: number
  currentProgress: number
  projectedProgress: number
  status: string
}

interface HealthProps {
  userId: number | null
}

const goalOptions: Array<{ key: GoalType; title: string; description: string; icon: React.ReactNode }> = [
  {
    key: 'lump_sum',
    title: 'Portfolio growth',
    description: 'Track progress toward a rand value goal over a chosen horizon.',
    icon: <Target className="w-6 h-6 text-brand-purple" />
  },
  {
    key: 'dividend_growth',
    title: 'Dividend growth',
    description: 'Aim for an inflation beating increase in annual distributions.',
    icon: <TrendingUp className="w-6 h-6 text-brand-mint" />
  },
  {
    key: 'passive_income',
    title: 'Passive income',
    description: 'Monitor monthly income potential versus your living costs.',
    icon: <PieChart className="w-6 h-6 text-brand-gold" />
  },
]

const PROFILE_GOAL_TO_TYPE: Record<string, GoalType> = {
  growth: 'lump_sum',
  balanced: 'dividend_growth',
  income: 'passive_income',
  fallback: 'lump_sum'
}

const GOAL_TYPE_TO_PROFILE: Record<GoalType, string> = {
  lump_sum: 'growth',
  dividend_growth: 'balanced',
  passive_income: 'income'
}

const HEALTH_DEFAULTS: Record<GoalType, GoalInput[]> = {
  lump_sum: [
    { label: 'Current portfolio value (ZAR)', value: 2959, helper: 'Latest value pulled from your holdings.' },
    { label: 'Target value (ZAR)', value: 500000, helper: 'Rand amount you want the portfolio to reach.' },
    { label: 'Term in years', value: 5, helper: 'Timeline for the goal. We project progress over this period.' },
  ],
  dividend_growth: [
    { label: 'Current annual dividends (ZAR)', value: 12000, helper: 'Present distributions from your holdings.' },
    { label: 'Target annual dividends (ZAR)', value: 24000, helper: 'Income stream you want to reach.' },
    { label: 'Term in years', value: 4, helper: 'Years you are budgeting to reach that payout.' },
  ],
  passive_income: [
    { label: 'Current monthly income (ZAR)', value: 6000, helper: 'What your portfolio generates today.' },
    { label: 'Monthly income goal (ZAR)', value: 15000, helper: 'Living cost you want the portfolio to cover.' },
    { label: 'Term in years', value: 3, helper: 'Target timeline to get your income stream match-fit.' },
  ],
}

const formatRand = (value: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(Math.round(value));

const Health: React.FC<HealthProps> = ({ userId }) => {
  const navigate = useNavigate()
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null)
  const [goalType, setGoalType] = useState<GoalType>('lump_sum')
  const [goalInputs, setGoalInputs] = useState<Record<string, number>>(() => {
    const defaults = HEALTH_DEFAULTS['lump_sum']
    return defaults.reduce<Record<string, number>>((acc, item) => {
      acc[item.label] = item.value
      return acc
    }, {})
  })
  const currentPortfolioValueInput = goalInputs['Current portfolio value (ZAR)'] ?? 1000
  const [preferenceSynced, setPreferenceSynced] = useState(false)
  const [portfolioNominalReturn, setPortfolioNominalReturn] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const storedPayload = localStorage.getItem('stockbuddy_performance_payload_nominal')
    if (storedPayload) {
      try {
        const parsed = JSON.parse(storedPayload)
        const nominal = typeof parsed?.annual_return === 'number' ? parsed.annual_return : null
        return nominal !== null && Number.isFinite(nominal) ? nominal : null
      } catch {
        // fall through
      }
    }
    const stored = localStorage.getItem('stockbuddy_annualised_return_nominal') ?? localStorage.getItem('stockbuddy_annualised_return')
    const parsed = stored !== null ? Number(stored) : null
    return parsed !== null && Number.isFinite(parsed) ? parsed : null
  })
  const [portfolioRealReturn, setPortfolioRealReturn] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const storedPayload = localStorage.getItem('stockbuddy_performance_payload_real')
    if (storedPayload) {
      try {
        const parsed = JSON.parse(storedPayload)
        const real = typeof parsed?.annual_return_real === 'number' ? parsed.annual_return_real : null
        return real !== null && Number.isFinite(real) ? real : null
      } catch {
        // fall through
      }
    }
    const stored = localStorage.getItem('stockbuddy_annualised_return_real')
    const parsed = stored !== null ? Number(stored) : null
    return parsed !== null && Number.isFinite(parsed) ? parsed : null
  })
  const [yieldLoading, setYieldLoading] = useState(false)
  const [yieldError, setYieldError] = useState<string | null>(null)
  const [useRealReturns, setUseRealReturns] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('stockbuddy_inflation_adjust') === '1'
  })

  const applyDefaultsForType = useCallback((type: GoalType) => {
    const defaults = HEALTH_DEFAULTS[type]
    const mapped = defaults.reduce<Record<string, number>>((acc, item) => {
      acc[item.label] = item.value
      return acc
    }, {})
    setGoalInputs(mapped)
  }, [])

  const persistGoalPreference = useCallback(async (type: GoalType) => {
    if (!userId) return
    const profileGoal = GOAL_TYPE_TO_PROFILE[type]
    try {
      await apiFetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, goal: profileGoal })
      })
    } catch (error) {
      console.error('Failed to update goal preference', error)
    }
  }, [userId])

  const handleGoalSelection = useCallback((type: GoalType, options?: { persist?: boolean }) => {
    setGoalType(type)
    applyDefaultsForType(type)
    if (options?.persist === false) {
      return
    }
    void persistGoalPreference(type)
  }, [applyDefaultsForType, persistGoalPreference])

  const handleInputChange = (label: string, value: string) => {
    const parsed = Number(value.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(parsed)) return
    setGoalInputs(prev => ({ ...prev, [label]: parsed }))
  }

  // Check if the user actually has a portfolio before running simulations
  useEffect(() => {
    const loadPortfolioPresence = async () => {
      if (!userId) {
        setHasPortfolio(false)
        return
      }
      try {
        const response = await apiFetch(`/api/portfolio/${userId}`)
        if (!response.ok) {
          setHasPortfolio(false)
          return
        }
        const data = await response.json()
        const hasHoldings = Array.isArray(data?.holdings) && data.holdings.length > 0
        setHasPortfolio(hasHoldings)
        // If we have a portfolio, sync the current value input with backend total_value for better defaults
        if (hasHoldings && typeof data.total_value === 'number' && Number.isFinite(data.total_value)) {
          setGoalInputs(prev => ({ ...prev, 'Current portfolio value (ZAR)': Math.max(0, Math.round(data.total_value)) }))
        }
      } catch {
        setHasPortfolio(false)
      }
    }
    loadPortfolioPresence()
  }, [userId])

  useEffect(() => {
    if (!userId || preferenceSynced) return

    const loadGoalPreference = async () => {
      try {
        const response = await apiFetch(`/api/users/${userId}`)
        if (!response.ok) return
        const profile = await response.json()
        const mapped = PROFILE_GOAL_TO_TYPE[(profile.goal || '').toLowerCase()] ?? null
        if (mapped) {
          handleGoalSelection(mapped, { persist: false })
        }
      } catch (error) {
        console.error('Failed to load goal preference', error)
      } finally {
        setPreferenceSynced(true)
      }
    }

    loadGoalPreference()
  }, [userId, preferenceSynced, handleGoalSelection])

  const loadStoredPerformance = useCallback(() => {
    if (typeof window === 'undefined') return false
    const payloadKey = useRealReturns ? 'stockbuddy_performance_payload_real' : 'stockbuddy_performance_payload_nominal'
    const storedPayload = localStorage.getItem(payloadKey)
    if (!storedPayload) return false
    try {
      const parsed = JSON.parse(storedPayload)
      const nominal = typeof parsed?.annual_return === 'number' ? parsed.annual_return : null
      const real = typeof parsed?.annual_return_real === 'number' ? parsed.annual_return_real : null
      if (nominal !== null && Number.isFinite(nominal)) {
        setPortfolioNominalReturn(nominal)
        localStorage.setItem('stockbuddy_annualised_return_nominal', nominal.toString())
      }
      if (real !== null && Number.isFinite(real)) {
        setPortfolioRealReturn(real)
        localStorage.setItem('stockbuddy_annualised_return_real', real.toString())
      }
      return true
    } catch {
      return false
    }
  }, [useRealReturns])

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (!event.key) return
      if (event.key === 'stockbuddy_performance_payload_nominal' || event.key === 'stockbuddy_performance_payload_real') {
        loadStoredPerformance()
      }
      if (event.key === 'stockbuddy_annualised_return_nominal' || event.key === 'stockbuddy_annualised_return') {
        const parsed = event.newValue !== null ? Number(event.newValue) : null
        setPortfolioNominalReturn(parsed !== null && Number.isFinite(parsed) ? parsed : null)
      }
      if (event.key === 'stockbuddy_annualised_return_real') {
        const parsed = event.newValue !== null ? Number(event.newValue) : null
        setPortfolioRealReturn(parsed !== null && Number.isFinite(parsed) ? parsed : null)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [loadStoredPerformance])

  useEffect(() => {
    const loadPreference = () => {
      if (typeof window === 'undefined') return
      setUseRealReturns(localStorage.getItem('stockbuddy_inflation_adjust') === '1')
    }
    loadPreference()
    const handler = (event: StorageEvent) => {
      if (event.key === 'stockbuddy_inflation_adjust') {
        setUseRealReturns(event.newValue === '1')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  useEffect(() => {
    if (loadStoredPerformance()) {
      setYieldLoading(false)
      setYieldError(null)
      return
    }
    if (!userId || hasPortfolio !== true) return
    let cancelled = false
    const controller = new AbortController()
    const fetchYield = async () => {
      setYieldLoading(true)
      setYieldError(null)
      try {
        const response = await apiFetch('/api/simulate/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            timeframe: '5y',
            investment_mode: 'lump_sum',
            initial_investment: currentPortfolioValueInput,
            monthly_contribution: 0,
            inflation_adjust: useRealReturns,
            distribution_policy: 'reinvest'
          }),
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error(`Status ${response.status}`)
        }
        const data = await response.json()
        const payload = data?.baseline ?? data
        if (!cancelled) {
          const payloadKey = useRealReturns ? 'stockbuddy_performance_payload_real' : 'stockbuddy_performance_payload_nominal'
          try {
            localStorage.setItem(payloadKey, JSON.stringify(payload))
          } catch {
            // ignore
          }
          const nominal = typeof payload?.annual_return === 'number' ? payload.annual_return : null
          const real = typeof payload?.annual_return_real === 'number' ? payload.annual_return_real : null
          setPortfolioNominalReturn(nominal !== null && Number.isFinite(nominal) ? nominal : null)
          setPortfolioRealReturn(real !== null && Number.isFinite(real) ? real : null)
          if (nominal !== null && Number.isFinite(nominal)) {
            localStorage.setItem('stockbuddy_annualised_return_nominal', nominal.toString())
          }
          if (real !== null && Number.isFinite(real)) {
            localStorage.setItem('stockbuddy_annualised_return_real', real.toString())
          }
        }
      } catch (error) {
        if (!cancelled) {
          setYieldError('Unable to load portfolio return.')
        }
      } finally {
        if (!cancelled) {
          setYieldLoading(false)
        }
      }
    }
    fetchYield()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [userId, useRealReturns, currentPortfolioValueInput, loadStoredPerformance, hasPortfolio])

  const marginBand = useMemo(() => (goalType === 'dividend_growth' ? 0.08 : goalType === 'passive_income' ? 0.12 : 0.1), [goalType])


  const projection = useMemo<ProjectionSummary>(() => {
    const labels = Object.keys(goalInputs)
    const current = goalInputs[labels[0]] ?? 0
    const target = goalInputs[labels[1]] ?? 0
    const ratio = target > 0 ? Math.min(current / target, 1) : 0
    const projectedCompletion = Math.min(ratio + marginBand, 1)
    const status =
      ratio >= 1
        ? 'Goal achieved'
        : projectedCompletion >= 1
          ? 'On track'
          : ratio < 0.6
            ? 'Needs focus'
            : 'Making progress'

    return {
      current,
      target,
      currentProgress: ratio,
      projectedProgress: projectedCompletion,
      status,
    }
  }, [goalInputs, goalType, marginBand])


  const termYears = goalInputs['Term in years'] ?? (goalType === 'passive_income' ? 3 : goalType === 'dividend_growth' ? 4 : 5)
  const projectedYearsToGoal = useMemo(() => {
    if (projection.projectedProgress >= 1 || termYears <= 0) {
      return termYears
    }
    const effectiveProgress = Math.max(projection.projectedProgress, 0.05)
    return Math.ceil(termYears / effectiveProgress)
  }, [projection.projectedProgress, termYears])

  const shortfall = useMemo(() => {
    const projectedValueAtTerm = projection.target * projection.projectedProgress
    return Math.max(projection.target - projectedValueAtTerm, 0)
  }, [projection.target, projection.projectedProgress])

  const additionalContributionPlan = useMemo(() => {
    if (shortfall <= 0) {
      return {
        amount: 0,
        cadence: '',
        message:
          goalType === 'dividend_growth'
            ? 'You are on course to exceed your dividend target within the selected term.'
          : goalType === 'passive_income'
            ? 'Portfolio income is trending ahead of the goal for this timeline.'
            : 'Your lump sum target is within reach on the current trajectory.'
      }
    }

    if (goalType === 'dividend_growth') {
      const amount = termYears > 0 ? shortfall / termYears : shortfall
      return {
        amount,
        cadence: 'p/a',
        message: `Increase annual distributions by about ${formatRand(amount)} each year to stay on schedule.`
      }
    }

    if (goalType === 'passive_income') {
      const amount = shortfall
      return {
        amount,
        cadence: 'p/m',
        message: `Boost monthly income by roughly ${formatRand(amount)} to cover the gap within ${termYears} years.`
      }
    }

    const amount = termYears > 0 ? shortfall / (termYears * 12) : shortfall / 12
    return {
      amount,
      cadence: 'p/m',
      message: `Setting aside about ${formatRand(amount)} per month keeps the plan on track.`
    }
  }, [goalType, shortfall, termYears])

  const [topUpShare, setTopUpShare] = useState<number>(0)
  const [acceptedShare, setAcceptedShare] = useState<number>(0)

  useEffect(() => {
    if (additionalContributionPlan.amount === 0) {
      setTopUpShare(0)
      setAcceptedShare(0)
    }
  }, [additionalContributionPlan.amount])

  const acceptedTopUpAmount = useMemo(
    () => additionalContributionPlan.amount * (topUpShare / 100),
    [additionalContributionPlan.amount, topUpShare]
  )
  const committedTopUpAmount = useMemo(
    () => additionalContributionPlan.amount * (acceptedShare / 100),
    [additionalContributionPlan.amount, acceptedShare]
  )

  const confirmTopUpShare = useCallback(() => {
    if (topUpShare > 0) {
      setAcceptedShare(topUpShare)
    }
  }, [topUpShare])

  const timelineContext = useMemo(() => {
    const gapYears = Math.max(projectedYearsToGoal - termYears, 0)
    if (projectedYearsToGoal <= termYears) {
      if (goalType === 'lump_sum') {
        return `Your lump sum target of ${formatRand(projection.target)} stays within the ${termYears}-year horizon.`
      }
      if (goalType === 'dividend_growth') {
        return `Dividend flow is on pace to reach ${formatRand(projection.target)} a year inside the timeline.`
      }
      return `Portfolio income should cover ${formatRand(projection.target)} per month within the timeline.`
    }
    if (goalType === 'lump_sum') {
      return `Expect roughly ${gapYears} extra year(s) to grow the portfolio to ${formatRand(projection.target)}.`
    }
    if (goalType === 'dividend_growth') {
      return `Expect roughly ${gapYears} extra year(s) to lift payouts to ${formatRand(projection.target)} a year.`
    }
    return `Expect roughly ${gapYears} extra year(s) to reach ${formatRand(projection.target)} in monthly income.`
  }, [goalType, projectedYearsToGoal, termYears, projection.target])

  const bufferProgress = useMemo(
    () => Math.min(Math.max(projection.projectedProgress + 0.05, projection.currentProgress + 0.1), 1),
    [projection.currentProgress, projection.projectedProgress]
  )

  const formatGoalValue = useCallback((amount: number) => {
    if (goalType === 'dividend_growth') {
      return `${formatRand(amount)} per year`
    }
    if (goalType === 'passive_income') {
      return `${formatRand(amount)} per month`
    }
    return formatRand(amount)
  }, [goalType])

  const ringData = useMemo(() => {
    const projectedValue = projection.target * projection.projectedProgress
    const bufferValue = projection.target * bufferProgress

    const currentSummary =
      goalType === 'lump_sum'
        ? `Current capital sits at ${formatGoalValue(projection.current)} of the ${formatGoalValue(projection.target)} target.`
        : goalType === 'dividend_growth'
          ? `The portfolio delivers about ${formatGoalValue(projection.current)} in distributions right now.`
          : `Current income stream is ${formatGoalValue(projection.current)} against your goal.`

    const projectedSummary =
      goalType === 'lump_sum'
        ? `Staying with the plan could grow the portfolio to around ${formatGoalValue(projectedValue)} within ${termYears} year(s).`
        : goalType === 'dividend_growth'
          ? `On the present growth pace, dividends could reach ${formatGoalValue(projectedValue)} by year ${termYears}.`
          : `Income could compound to ${formatGoalValue(projectedValue)} in ${termYears} year(s) if markets behave as expected.`

    const bufferSummary = `We leave ${Math.max(Math.round((bufferProgress - projection.projectedProgress) * 100), 0)}% headroom — planning for about ${formatGoalValue(
      bufferValue
    )} so the goal survives market swings.`

    return [
      { label: 'Current', value: projection.currentProgress, color: '#7a3ff2', summary: currentSummary },
      { label: 'Projected', value: projection.projectedProgress, color: '#3fd0c9', summary: projectedSummary },
      { label: 'Buffer', value: bufferProgress, color: '#ffc943', summary: bufferSummary },
    ]
  }, [bufferProgress, goalType, projection, termYears, formatGoalValue])

  const selectedGoalOption = useMemo(
    () => goalOptions.find(option => option.key === goalType),
    [goalType]
  )

  const ringStyles = (radius: number, index: number, value: number, color: string) => {
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - value)
    return {
      className: `stroke-[12] transition-all duration-700 ease-out`,
      style: {
        strokeDasharray: `${circumference} ${circumference}`,
        strokeDashoffset: offset,
        stroke: color,
        opacity: 1 - index * 0.15,
      },
    }
  }

  // Empty state if there is no portfolio yet
  if (hasPortfolio === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-lg text-center space-y-4">
          <h2 className="text-2xl font-semibold text-brand-ink dark:text-gray-100">Create a portfolio to see health</h2>
          <p className="text-muted dark:text-gray-300">
            Health projections use your current holdings. Finish onboarding or add your first instruments to get personalised progress rings and timelines.
          </p>
          <div className="flex justify-center gap-3">
            <button className="btn-cta" onClick={() => navigate('/onboarding')}>Start onboarding</button>
            <button className="btn-secondary" onClick={() => navigate('/portfolio')}>Go to portfolio</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100">Portfolio health</h1>
            <p className="text-muted dark:text-gray-300">
              Check how your StockBuddy plan lines up against the goals that matter: rand targets, dividend growth, or steady income.
            </p>
          </div>
          <button onClick={() => navigate('/portfolio')} className="btn-secondary">
            Back to portfolio
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="card space-y-6">
            {selectedGoalOption && (
              <div className="flex flex-col gap-4 rounded-3xl border border-white/30 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/70">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-inner dark:bg-slate-900/80">
                    {selectedGoalOption.icon}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">Portfolio goal</p>
                    <p className="text-lg font-semibold text-brand-ink dark:text-white">{selectedGoalOption.title}</p>
                    <p className="text-sm text-muted dark:text-gray-300">{selectedGoalOption.description}</p>
                  </div>
                </div>
                <p className="text-xs text-muted dark:text-gray-400">
                  Update this focus in your profile or onboarding preferences to shift the health projection.
                </p>
              </div>
            )}

            <MetricInputs
              goalType={goalType}
              goalInputs={goalInputs}
              handleInputChange={handleInputChange}
              formatRand={formatRand}
              portfolioNominalReturn={portfolioNominalReturn}
              yieldLoading={yieldLoading}
              yieldError={yieldError}
              useRealReturns={useRealReturns}
              portfolioRealReturn={portfolioRealReturn}
            />

            <div className="rounded-3xl bg-brand-purple/5 p-6 text-sm text-brand-ink dark:text-gray-200">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-purple">
                <TrendingUp className="w-4 h-4" />
                Goal insight
              </div>
              <p className="mt-3 leading-relaxed">
                Based on current holdings we estimate you are{' '}
                <span className="font-semibold">{Math.round(projection.currentProgress * 100)}%</span> of the way there.
                Keeping your baseline plan on autopilot could push that to{' '}
                <span className="font-semibold">{Math.round(projection.projectedProgress * 100)}%</span> within the term.
              </p>
            </div>
          </div>

          <div className="card space-y-8 md:p-8">
            <div className="flex flex-col items-center gap-10 md:flex-row md:justify-center md:gap-16">
              <div className="w-full max-w-xs p-6 text-center md:max-w-sm">
                <div className="mb-6 flex flex-nowrap items-center justify-center gap-6 text-xs sm:text-sm">
                  {ringData.map((ring) => (
                    <div
                      key={ring.label}
                      className="group relative flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ring.color }} />
                      <span className="font-semibold text-brand-ink dark:text-gray-100">{ring.label}</span>
                      <span className="text-muted dark:text-gray-400">{Math.round(ring.value * 100)}%</span>
                      <div
                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 max-w-[14rem] -translate-x-1/2 rounded-2xl border border-brand-purple/30 bg-white px-3 py-2 text-center text-[11px] text-brand-ink opacity-0 transition duration-150 group-hover:opacity-100 dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-gray-100"
                        style={{ boxShadow: '0 14px 34px rgba(122,63,242,0.12)' }}
                      >
                        {ring.label === 'Current'
                          ? 'Current value ÷ target.'
                          : ring.label === 'Projected'
                            ? 'Projected value by end of term.'
                            : 'Extra buffer to absorb market swings.'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative mx-auto h-72 w-72">
                  <svg viewBox="0 0 220 220" className="h-full w-full">
                    <g transform="translate(110,110)">
                      {ringData.map((ring, index) => {
                        const radius = 90 - index * 12
                      return (
                      <circle
                        key={ring.label}
                        r={radius}
                        cx="0"
                        cy="0"
                        fill="transparent"
                        {...ringStyles(radius, index, ring.value, ring.color)}
                      />
                    )})}
                      <circle r="54" cx="0" cy="0" fill="white" className="dark:fill-slate-900" />
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                      <span className="text-[11px] uppercase tracking-wide text-muted dark:text-gray-400">Projected</span>
                      <span className="text-3xl font-bold text-brand-ink dark:text-white">
                        {Math.round(projection.projectedProgress * 100)}%
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          projection.status === 'Needs focus' ? 'text-danger-600' : 'text-brand-mint dark:text-brand-mint'
                        }`}
                      >
                        {projection.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 text-left text-sm">
              <div className="rounded-2xl bg-brand-purple/5 px-4 py-3 space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-purple">
                  <Calendar className="w-4 h-4" />
                  Timeline
                </div>
                <div>
                  <div className="relative h-3 rounded-full bg-brand-purple/10">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-purple/60"
                      style={{ width: `${Math.min(termYears / Math.max(projectedYearsToGoal, termYears), 1) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] uppercase tracking-wide text-muted dark:text-gray-400">
                    <span>Your term · {termYears} yrs</span>
                    <span>Projected · {projectedYearsToGoal} yrs</span>
                  </div>
                </div>
                <p className="text-brand-ink dark:text-gray-200">
                  {timelineContext}
                </p>
              </div>
              <div className="rounded-2xl bg-brand-mint/10 px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-mint">
                  <TrendingDown className="w-4 h-4" />
                  Margin of error
                </div>
                <p className="mt-2 text-brand-ink dark:text-gray-200">
                  We apply a ±{goalType === 'dividend_growth' ? 8 : goalType === 'passive_income' ? 12 : 10}% confidence band around the projection to cover market drift.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-gold/10 px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-gold">
                  <TrendingUp className="w-4 h-4" />
                  Next step
                </div>
                <p className="mt-2 text-brand-ink dark:text-gray-200">
                  {additionalContributionPlan.message}
                </p>
                {additionalContributionPlan.amount > 0 && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted dark:text-gray-400">
                        <span>Commitment level</span>
                        <span>{topUpShare}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={topUpShare}
                        onChange={(event) => setTopUpShare(Number(event.target.value))}
                        className="mt-2 w-full accent-brand-purple"
                      />
                    </div>
                    <div className="w-full rounded-2xl bg-white/80 px-4 py-3 text-sm tabular-nums dark:bg-slate-800/60">
                      <div className="grid gap-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">Selected</span>
                          <span className="inline-flex w-[120px] justify-end font-semibold text-brand-ink dark:text-gray-100">
                            {formatRand(acceptedTopUpAmount)} {additionalContributionPlan.cadence}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">Gap after top-up</span>
                          <span className="inline-flex w-[120px] justify-end font-semibold text-brand-ink dark:text-gray-100">
                            {formatRand(Math.max(additionalContributionPlan.amount - acceptedTopUpAmount, 0))} {additionalContributionPlan.cadence}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="min-h-[30px]">
                      <div
                        className={`rounded-full bg-brand-purple/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-purple tabular-nums transition-opacity dark:bg-brand-purple/20 dark:text-brand-purple/90 ${
                          acceptedShare > 0 ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        Committed {acceptedShare}% · {formatRand(committedTopUpAmount)} {additionalContributionPlan.cadence}
                      </div>
                    </div>
                    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={confirmTopUpShare}
                        disabled={topUpShare === 0 || topUpShare === acceptedShare}
                        className={`btn-cta px-4 py-2 text-sm whitespace-nowrap ${topUpShare === 0 || topUpShare === acceptedShare ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        Confirm selection
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopUpShare(100)}
                        className="btn-cta px-4 py-2 text-sm whitespace-nowrap"
                      >
                        Accept full top-up
                      </button>
                      <div className="inline-flex">
                        <button
                          type="button"
                          onClick={() => {
                            if (topUpShare === 0) {
                              setTopUpShare(50)
                            } else {
                              setTopUpShare(0)
                              setAcceptedShare(0)
                            }
                          }}
                          className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
                        >
                          <span className="block min-w-[72px] text-center">
                            {topUpShare === 0 ? 'Set 50%' : 'Clear'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted dark:text-gray-400">
                      Adjusting this slider lets you bank a portion of the suggested top-up without overwriting your plan. Confirmed amounts are tracked above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Health

interface MetricInputsProps {
  goalType: GoalType
  goalInputs: Record<string, number>
  handleInputChange: (label: string, value: string) => void
  formatRand: (value: number) => string
  portfolioNominalReturn: number | null
  yieldLoading: boolean
  yieldError: string | null
  useRealReturns: boolean
  portfolioRealReturn: number | null
}

const MetricInputs: React.FC<MetricInputsProps> = ({
  goalType,
  goalInputs,
  handleInputChange,
  formatRand,
  portfolioNominalReturn,
  yieldLoading,
  yieldError,
  useRealReturns,
  portfolioRealReturn
}) => {
  const [currentField, targetField, termField] = HEALTH_DEFAULTS[goalType]

  const currentValue = goalInputs[currentField.label] ?? currentField.value
  const targetValue = goalInputs[targetField.label] ?? targetField.value
  const termValue = goalInputs[termField.label] ?? termField.value

  const yieldValue = useRealReturns ? portfolioRealReturn : portfolioNominalReturn
  const yieldDisplay = yieldLoading
    ? 'Loading...'
    : yieldValue !== null && Number.isFinite(yieldValue)
      ? `${yieldValue.toFixed(2)}% p.a.`
      : 'Not available'
  const yieldModeLabel = useRealReturns ? 'Real' : 'Nominal'
  const yieldHelper = yieldLoading
    ? 'Fetching your latest return.'
      : yieldError
        ? yieldError
        : yieldValue !== null
          ? `${yieldModeLabel} CAGR from your live portfolio.`
          : `Open your portfolio to sync the ${yieldModeLabel.toLowerCase()} return.`

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">{currentField.label}</span>
          <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm font-semibold text-brand-ink shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-gray-200">
            {formatRand(currentValue)}
          </div>
          <span className="text-xs text-muted dark:text-gray-400">{currentField.helper}</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">Portfolio yield</span>
          <div className="rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-sm font-semibold text-brand-ink shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-gray-100">
            {yieldDisplay}
          </div>
          <span className="text-xs text-muted dark:text-gray-400">
            {yieldHelper}
          </span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">{targetField.label}</span>
          <input
            type="number"
            value={targetValue}
            onChange={(event) => handleInputChange(targetField.label, event.target.value)}
            className="input-field rounded-2xl bg-white/90 dark:bg-slate-800/80"
          />
          <span className="text-xs text-muted dark:text-gray-400">{targetField.helper}</span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted dark:text-gray-400">{termField.label}</span>
          <input
            type="number"
            value={termValue}
            onChange={(event) => handleInputChange(termField.label, event.target.value)}
            className="input-field rounded-2xl bg-white/90 dark:bg-slate-800/80"
          />
          <span className="text-xs text-muted dark:text-gray-400">{termField.helper}</span>
        </label>
      </div>
    </>
  )
}
