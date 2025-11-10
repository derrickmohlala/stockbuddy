import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Coins, BarChart3, PiggyBank, ArrowRightLeft, AlertTriangle, ShieldAlert, Info, ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import { useTheme } from '../theme/ThemeProvider'
import { apiFetch } from '../lib/api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const hoverLinePlugin = {
  id: 'hoverLine',
  afterDatasetsDraw: (chart: any) => {
    const { ctx, tooltip, chartArea } = chart
    if (!tooltip || !tooltip.getActiveElements || !tooltip.getActiveElements().length) {
      return
    }
    const activePoint = tooltip.getActiveElements()[0]
    if (!activePoint) return
    const { x } = activePoint.element
    ctx.save()
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.restore()
  }
}

ChartJS.register(hoverLinePlugin)

interface PortfolioProps {
  userId: number | null
}

interface PortfolioData {
  user_id: number
  first_name?: string
  archetype: string
  total_value: number
  total_cost: number
  total_pnl: number
  total_pnl_pct: number
  allocation_targets?: Record<string, number>
  plan_summary?: string | null
  plan_persona?: string | null
  plan_guidance?: string | null
  plan_goal?: string | null
  plan_risk_band?: string | null
  plan_anchor_cap_pct?: number | null
  suggestions?: Array<{
    replace_symbol: string
    replace_name: string
    trailing_return: number
    suggest_symbol: string
    suggest_name: string
    target_weight: number
    reason: string
    suggest_trailing_return?: number
    suggest_dividend_yield?: number
  }>
  holdings: Array<{
    symbol: string
    name: string
    quantity: number
    avg_price: number
    current_price: number
    current_value: number
    cost_basis: number
    pnl: number
    pnl_pct: number
    weight: number
  }>
  applied_suggestions?: Array<{
    id: number
    replace_symbol: string
    suggest_symbol: string
    created_at: string | null
  }>
  baseline_allocations?: Record<string, number>
  alerts?: GoalAlert[]
}

type PortfolioSuggestion = NonNullable<PortfolioData['suggestions']>[number]
type PerformanceMetrics = {
  totalValue: number
  totalInvested: number
  totalReturn: number
  totalReturnPct: number
  totalDividends: number
  dividendsDistributed: number
  averageDividendYield: number | null
  holdingsValue?: number
  distributionPolicy?: string
}

interface GoalAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  symbol?: string
  metric?: string
  message: string
  suggested_action?: string
  trigger?: Record<string, number>
  created_at?: string
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const Portfolio: React.FC<PortfolioProps> = ({ userId }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [scenarioData, setScenarioData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [timeframe, setTimeframe] = useState('5y')
  const [investmentMode, setInvestmentMode] = useState<'lump_sum' | 'monthly'>('lump_sum')
  const [initialInvestment, setInitialInvestment] = useState<number>(1000)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(300)
  const [customMonths, setCustomMonths] = useState<number>(60)
  const [draftInitialInvestment, setDraftInitialInvestment] = useState('1000')
  const [draftMonthlyContribution, setDraftMonthlyContribution] = useState('300')
  const [benchmarkOptions, setBenchmarkOptions] = useState<{ symbol: string; label: string }[]>([])
  const [benchmark, setBenchmark] = useState<string>('')
  const [inflationAdjust, setInflationAdjust] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('stockbuddy_inflation_adjust')
    return stored === '1'
  })
  const [distributionPolicy, setDistributionPolicy] = useState<'reinvest' | 'cash_out'>('reinvest')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [scenarioMetrics, setScenarioMetrics] = useState<PerformanceMetrics | null>(null)
  const [projectionError, setProjectionError] = useState<string | null>(null)
  const customMonthsRef = useRef<number>(60)
  const lastMonthlyContributionRef = useRef<number>(300)
  const [editableHoldings, setEditableHoldings] = useState<PortfolioData['holdings']>([])
  const [suggestionDecisions, setSuggestionDecisions] = useState<Record<string, 'accepted' | 'rejected'>>({})
  const [processingSuggestion, setProcessingSuggestion] = useState<string | null>(null)
  const [appliedSuggestions, setAppliedSuggestions] = useState<PortfolioData['applied_suggestions']>([])
  const [baselineAllocations, setBaselineAllocations] = useState<Record<string, number>>({})
  const [instrumentOptions, setInstrumentOptions] = useState<{ symbol: string; label: string }[]>([])
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)
  const [customRows, setCustomRows] = useState<Array<{ id: string; symbol: string; weight: number }>>([])
  const [customError, setCustomError] = useState<string | null>(null)
  const [savingCustom, setSavingCustom] = useState(false)
  const [resettingPortfolio, setResettingPortfolio] = useState(false)
  const [processingReverse, setProcessingReverse] = useState<number | null>(null)
  const [activeInstrumentRow, setActiveInstrumentRow] = useState<string | null>(null)
  const [instrumentSearchTerm, setInstrumentSearchTerm] = useState('')
  const [showBenchmarkDropdown, setShowBenchmarkDropdown] = useState(false)
  const [benchmarkSearchTerm, setBenchmarkSearchTerm] = useState('')
  const [scenarioEnabled, setScenarioEnabled] = useState(false)
  const [scenarioExpanded, setScenarioExpanded] = useState(false)
  const [scenarioFrequency, setScenarioFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')
  const [scenarioAnnualMonth, setScenarioAnnualMonth] = useState('12')
  const [scenarioInitialDraft, setScenarioInitialDraft] = useState('1000')
  const [scenarioMonthlyDraft, setScenarioMonthlyDraft] = useState('300')
  const [scenarioMode, setScenarioMode] = useState<'lump_sum' | 'monthly'>('lump_sum')
  const [scenarioPolicy, setScenarioPolicy] = useState<'reinvest' | 'cash_out'>('reinvest')
  const [scenarioMessage, setScenarioMessage] = useState<string | null>(null)
  const [goalAlerts, setGoalAlerts] = useState<GoalAlert[]>([])
  const initialRealToggleSync = useRef(true)
  const instrumentSearchInputRef = useRef<HTMLInputElement | null>(null)
  const instrumentListRef = useRef<HTMLDivElement | null>(null)
  const customBuilderRef = useRef<HTMLDivElement | null>(null)
  const formatLabel = (value?: string | null) => {
    if (!value) return ''
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  const formatTimestamp = (value?: string | null) => {
    if (!value) return 'Just now'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }
    return parsed.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  const navigate = useNavigate()

  // Load instruments for holdings pickers
  useEffect(() => {
    const fetchInstruments = async () => {
      try {
        const response = await apiFetch('/api/instruments')
        if (response.ok) {
          const data = await response.json()
          const instrumentList = (data || []).map((item: any) => ({ symbol: item.symbol, label: item.name }))
          setInstrumentOptions(instrumentList)
        }
      } catch (error) {
        console.error('Error loading instruments:', error)
      }
    }
    fetchInstruments()
  }, [])

  // Load supported benchmarks from backend list
  useEffect(() => {
    const fetchBenchmarks = async () => {
      try {
        const response = await apiFetch('/api/benchmarks')
        if (!response.ok) return
        const items = await response.json()
        const options = (items || []).map((it: any) => ({ symbol: it.symbol, label: it.label || it.symbol }))
        setBenchmarkOptions(options)
        const saved = typeof window !== 'undefined' ? localStorage.getItem('stockbuddy_benchmark') : null
        const savedValid = options.find((o: { symbol: string; label: string }) => o.symbol === saved)?.symbol
        if (!benchmark) {
          setBenchmark(savedValid || (options[0]?.symbol ?? ''))
        } else if (!options.find((o: { symbol: string; label: string }) => o.symbol === benchmark)) {
          // Current benchmark is not in the supported list; switch to first
          setBenchmark(options[0]?.symbol ?? '')
        }
      } catch (error) {
        console.error('Error loading benchmarks:', error)
      }
    }
    fetchBenchmarks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSuggestionDecisions({})
    setProcessingSuggestion(null)
  }, [portfolio?.suggestions])

  useEffect(() => {
    if (activeInstrumentRow) {
      requestAnimationFrame(() => {
        instrumentSearchInputRef.current?.focus()
        instrumentListRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      })
    } else {
      instrumentSearchInputRef.current?.blur()
      if (instrumentSearchTerm !== '') {
        setInstrumentSearchTerm('')
      }
    }
  }, [activeInstrumentRow, instrumentSearchTerm])

  useEffect(() => {
    instrumentListRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [instrumentSearchTerm])

  const filteredInstrumentOptions = useMemo(() => {
    const term = instrumentSearchTerm.trim().toLowerCase()
    if (!term) return instrumentOptions
    return instrumentOptions.filter(option =>
      option.symbol.toLowerCase().includes(term) ||
      option.label.toLowerCase().includes(term)
    )
  }, [instrumentOptions, instrumentSearchTerm])

  const filteredBenchmarkOptions = useMemo(() => {
    const term = benchmarkSearchTerm.trim().toLowerCase()
    if (!term) return benchmarkOptions
    return benchmarkOptions.filter(option =>
      option.symbol.toLowerCase().includes(term) ||
      option.label.toLowerCase().includes(term)
    )
  }, [benchmarkOptions, benchmarkSearchTerm])

  useEffect(() => {
    if (timeframe === 'custom') {
      if (!customEnd) {
        const end = new Date()
        setCustomEnd(end.toISOString().slice(0, 10))
      }
      if (!customStart) {
        const start = new Date()
        start.setFullYear(start.getFullYear() - 5)
        setCustomStart(start.toISOString().slice(0, 10))
      }
    }
  }, [timeframe, customStart, customEnd])

  useEffect(() => {
    if (userId) {
      fetchPortfolio()
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const loadInitial = async () => {
      try {
        await fetchPerformanceData()
      } finally {
        setLoading(false)
      }
    }

    loadInitial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Removed automatic refetch; fetch happens only when inputs change via explicit actions.

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('stockbuddy_inflation_adjust', inflationAdjust ? '1' : '0')
  }, [inflationAdjust])

  useEffect(() => {
    if (!userId) return
    if (initialRealToggleSync.current) {
      initialRealToggleSync.current = false
      return
    }
    fetchPerformanceData(false, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inflationAdjust])

  const fetchPortfolio = async () => {
    try {
      const response = await apiFetch(`/api/portfolio/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
        const holdingsArray: Array<any> = Array.isArray(data.holdings) ? data.holdings : []
        const normalisedWeights = normalisePercentages(holdingsArray.map((holding: any) => Number(holding.weight ?? 0)))
        const mappedHoldings = holdingsArray.map((holding: any, idx: number) => ({
          ...holding,
          weight: normalisedWeights[idx] ?? 0
        }))
        setEditableHoldings(mappedHoldings)
        setAppliedSuggestions(data.applied_suggestions || [])
        setBaselineAllocations(data.baseline_allocations || {})
        setGoalAlerts(Array.isArray(data.alerts) ? data.alerts : [])
        if (!showCustomBuilder) {
          let baseRows: Array<{ id: string; symbol: string; weight: number }> = mappedHoldings.map((holding: any, idx: number) => ({
            id: `${holding.symbol}-${idx}`,
            symbol: holding.symbol,
            weight: holding.weight ?? 0
          }))
          if (!baseRows.length) {
            baseRows.push({ id: `custom-${Date.now()}`, symbol: '', weight: 0 })
          } else if (baseRows.length) {
            const adjusted = normalisePercentages(baseRows.map(row => row.weight))
            baseRows = baseRows.map((row, idx) => ({
              ...row,
              weight: adjusted[idx] ?? 0
            }))
          }
          setCustomRows(baseRows)
        }

        setMetrics(prev => prev ?? {
          totalValue: data.total_value,
          totalInvested: data.total_cost,
          totalReturn: data.total_pnl,
          totalReturnPct: data.total_pnl_pct,
          totalDividends: 0,
          dividendsDistributed: 0,
          averageDividendYield: null,
          holdingsValue: data.total_value,
          distributionPolicy
        })
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    }
  }

  const computeMetrics = React.useCallback((payload: any, fallbackPolicy: 'reinvest' | 'cash_out'): PerformanceMetrics | null => {
    if (!payload) return null
    const policy = payload.distribution_policy === 'cash_out' || payload.distribution_policy === 'reinvest'
      ? payload.distribution_policy
      : fallbackPolicy
    const holdingsValueRaw = typeof payload.ending_value_holdings === 'number'
      ? payload.ending_value_holdings
      : (typeof payload.ending_value === 'number' ? payload.ending_value : 0)
    const netEndingValue = typeof payload.ending_value === 'number' ? payload.ending_value : holdingsValueRaw
    const totalDividendsValue = typeof payload.total_dividends === 'number' ? payload.total_dividends : 0
    const dividendsDistributedValue = typeof payload.dividends_distributed === 'number' ? payload.dividends_distributed : 0
    const invested = typeof payload.total_invested === 'number' ? payload.total_invested : 0
    const endingDisplay = (inflationAdjust && Array.isArray(payload.series_real) && payload.series_real.length)
      ? payload.series_real[payload.series_real.length - 1]?.value ?? netEndingValue
      : netEndingValue
    const effectiveReturn = (inflationAdjust && typeof payload.total_return_real === 'number')
      ? payload.total_return_real
      : (typeof payload.total_return === 'number' ? payload.total_return : 0)
    const totalReturnPctValue = invested ? (effectiveReturn / Math.max(invested, 1)) * 100 : 0
    return {
      totalValue: endingDisplay,
      totalInvested: invested,
      totalReturn: effectiveReturn,
      totalReturnPct: totalReturnPctValue,
      totalDividends: totalDividendsValue,
      dividendsDistributed: dividendsDistributedValue,
      averageDividendYield: typeof payload.average_dividend_yield === 'number' ? payload.average_dividend_yield : null,
      holdingsValue: holdingsValueRaw,
      distributionPolicy: policy
    }
  }, [inflationAdjust])

  const useCachedPerformance = React.useCallback(() => {
    if (typeof window === 'undefined') return null
    const key = inflationAdjust ? 'stockbuddy_performance_payload_real' : 'stockbuddy_performance_payload_nominal'
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      const inputs = parsed?.__inputs
      if (
        inputs &&
        inputs.timeframe === timeframe &&
        inputs.investment_mode === investmentMode &&
        Number(inputs.initial_investment) === Number(initialInvestment) &&
        Number(inputs.monthly_contribution) === Number(monthlyContribution) &&
        inputs.inflation_adjust === inflationAdjust &&
        inputs.distribution_policy === distributionPolicy
      ) {
        return parsed
      }
    } catch {
      return null
    }
    return null
  }, [timeframe, investmentMode, initialInvestment, monthlyContribution, inflationAdjust, distributionPolicy])

  const fetchPerformanceData = async (includeScenario: boolean = scenarioEnabled, forceRefresh: boolean = false) => {
    setIsFetching(true)
    const finishFetch = () => setIsFetching(false)
    if (!forceRefresh) {
      const cached = useCachedPerformance()
      if (cached) {
        setPerformanceData(cached)
        setMetrics(computeMetrics(cached, distributionPolicy))
        setScenarioData(null)
        setScenarioMetrics(null)
        setScenarioMessage(null)
        finishFetch()
        return
      }
    }
    try {
      const payload: Record<string, any> = {
        user_id: userId,
        timeframe,
        investment_mode: investmentMode,
        initial_investment: initialInvestment,
        monthly_contribution: monthlyContribution
      }
      if (timeframe === 'custom') {
        if (customStart && customEnd) {
          payload.custom_start = customStart
          payload.custom_end = customEnd
        } else {
          payload.custom_months = customMonths
        }
      }

      const scenarioRequest = includeScenario ? (() => {
        const parsedInitial = Math.round(parseNumericInput(scenarioInitialDraft, initialInvestment))
        const parsedMonthlyRaw = parseNumericInput(scenarioMonthlyDraft, monthlyContribution)
        const parsedMonthly = scenarioMode === 'monthly' ? Math.round(parsedMonthlyRaw) : 0
        const contributionFrequency = scenarioMode === 'monthly' ? scenarioFrequency : null
        const annualMonthValue = contributionFrequency === 'annual' ? Number(scenarioAnnualMonth) : undefined
        const payload: Record<string, any> = {
          initial_investment: parsedInitial,
          monthly_contribution: Math.max(0, parsedMonthly),
          investment_mode: scenarioMode,
          distribution_policy: scenarioPolicy
        }
        if (contributionFrequency) {
          payload.contribution_frequency = contributionFrequency
          if (annualMonthValue && Number.isFinite(annualMonthValue)) {
            payload.annual_month = annualMonthValue
          }
        }
        return payload
      })() : null

      const requestBody: Record<string, any> = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          benchmark: benchmark || null,
          inflation_adjust: inflationAdjust,
          distribution_policy: distributionPolicy,
          ...(scenarioRequest ? { contribution_scenario: scenarioRequest } : {})
        })
      }

      const response = await apiFetch('/api/simulate/performance', requestBody)
      if (response.ok) {
        const data = await response.json()
        const baselinePayload = data?.baseline ?? data
        baselinePayload.__inputs = {
          timeframe,
          investment_mode: investmentMode,
          initial_investment: initialInvestment,
          monthly_contribution: monthlyContribution,
          inflation_adjust: inflationAdjust,
          distribution_policy: distributionPolicy
        }
        const scenarioPayloadResponse = data?.baseline ? data?.scenario : null
        setPerformanceData(baselinePayload)
        if (typeof window !== 'undefined') {
          try {
            const payloadKey = inflationAdjust ? 'stockbuddy_performance_payload_real' : 'stockbuddy_performance_payload_nominal'
            localStorage.setItem(payloadKey, JSON.stringify(baselinePayload))
          } catch {
            // ignore storage errors
          }
        }
        if (typeof window !== 'undefined') {
          const nominalReturn = typeof baselinePayload?.annual_return === 'number' ? baselinePayload.annual_return : null
          const realReturn = typeof baselinePayload?.annual_return_real === 'number' ? baselinePayload.annual_return_real : null
          if (nominalReturn !== null && Number.isFinite(nominalReturn)) {
            localStorage.setItem('stockbuddy_annualised_return_nominal', nominalReturn.toString())
            localStorage.setItem('stockbuddy_annualised_return', nominalReturn.toString())
          }
          if (realReturn !== null && Number.isFinite(realReturn)) {
            localStorage.setItem('stockbuddy_annualised_return_real', realReturn.toString())
          } else {
            localStorage.removeItem('stockbuddy_annualised_return_real')
          }
        }
        setScenarioData(scenarioPayloadResponse || null)
        setMetrics(computeMetrics(baselinePayload, distributionPolicy))
        if (scenarioRequest && scenarioPayloadResponse) {
          setScenarioMetrics(computeMetrics(scenarioPayloadResponse, scenarioPolicy))
          setScenarioMessage(null)
        } else if (scenarioRequest) {
          setScenarioMetrics(null)
          setScenarioMessage('Scenario could not be generated with the current settings.')
        } else {
          setScenarioMetrics(null)
          setScenarioMessage(null)
        }
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      if (scenarioEnabled) {
        setScenarioMessage('Unable to load scenario right now. Please try again.')
      }
    } finally {
      finishFetch()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatOptionalPercentage = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—'
    }
    return formatPercentage(value)
  }

  const formatPercentNoSign = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—'
    }
    return `${value.toFixed(2)}%`
  }

  const formatCurrencyDelta = (amount: number) => {
    const formatted = formatCurrency(Math.abs(amount))
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }

  const formatTriggerValue = (key: string, value: number) => {
    if (!Number.isFinite(value)) {
      return String(value)
    }
    const lowered = key.toLowerCase()
    if (lowered.includes('pct') || lowered.includes('delta')) {
      return `${value.toFixed(1)}%`
    }
    return formatCurrency(value)
  }

  const parseNumericInput = (value: string, fallback: number) => {
    if (!value) return fallback
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parsed = Number(cleaned)
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
    return fallback
  }

  const clampPercent = (value: number) => {
    if (!Number.isFinite(value)) {
      return 0
    }
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  const normalisePercentages = (weights: number[], lockIndex: number | null = null, target = 100): number[] => {
    const clean = weights.map(value => (Number.isFinite(value) ? Math.max(0, value) : 0))
    const count = clean.length
    if (!count) return []
    const effectiveTarget = Math.max(0, Math.round(target))

    const distribute = (values: number[], total: number): number[] => {
      const positives = values.map(value => Math.max(0, value))
      const length = positives.length
      if (!length) return []
      const sum = positives.reduce((acc, value) => acc + value, 0)
      if (sum <= 0) {
        const base = Math.floor(total / length)
        const remainder = total - base * length
        return positives.map((_, idx) => base + (idx < remainder ? 1 : 0))
      }
      const floats = positives.map(value => (value / sum) * total)
      const floors = floats.map(value => Math.floor(value))
      let remainder = total - floors.reduce((acc, value) => acc + value, 0)
      const order = floats
        .map((value, idx) => ({ idx, frac: value - Math.floor(value) }))
        .sort((a, b) => b.frac - a.frac)
      const result = floors.slice()
      let pointer = 0
      while (remainder > 0 && pointer < order.length) {
        result[order[pointer].idx] += 1
        remainder -= 1
        pointer += 1
      }
      return result
    }

    if (lockIndex === null || lockIndex < 0 || lockIndex >= count) {
      return distribute(clean, effectiveTarget)
    }

    const lockedValue = clampPercent(clean[lockIndex] ?? 0)
    const remainderTarget = Math.max(0, effectiveTarget - lockedValue)
    const otherIndices: number[] = []
    const otherValues: number[] = []
    clean.forEach((value, idx) => {
      if (idx !== lockIndex) {
        otherIndices.push(idx)
        otherValues.push(value)
      }
    })
    const distributed = distribute(otherValues, remainderTarget)
    const result = Array(count).fill(0)
    result[lockIndex] = lockedValue
    otherIndices.forEach((idx, pos) => {
      result[idx] = distributed[pos] ?? 0
    })
    return result
  }

  const rebalanceTopDown = (weights: number[], index: number, nextValue: number): number[] => {
    if (!weights.length) return []
    const sanitized = weights.map(value => (Number.isFinite(value) ? clampPercent(value) : 0))
    const result = sanitized.slice()

    const prefixTotal = result.slice(0, index).reduce((sum, value) => sum + value, 0)
    const desired = clampPercent(nextValue)
    const available = Math.max(0, 100 - prefixTotal)
    const applied = Math.min(desired, available)
    result[index] = applied

    let remaining = Math.max(0, 100 - prefixTotal - applied)
    const tailIndices: number[] = []
    const tailValues: number[] = []
    for (let i = index + 1; i < result.length; i += 1) {
      tailIndices.push(i)
      tailValues.push(Math.max(0, sanitized[i]))
    }

    const distributeProportionally = (values: number[], total: number): number[] => {
      if (!values.length || total <= 0) {
        return Array(values.length).fill(0)
      }
      const sum = values.reduce((acc, value) => acc + value, 0)
      if (sum <= 0) {
        const base = Math.floor(total / values.length)
        let remainder = total - base * values.length
        return values.map(() => {
          const bump = remainder > 0 ? 1 : 0
          if (remainder > 0) remainder -= 1
          return base + bump
        })
      }
      const floats = values.map(value => (value / sum) * total)
      const floors = floats.map(value => Math.floor(value))
      let remainder = total - floors.reduce((acc, value) => acc + value, 0)
      const order = floats
        .map((value, idx) => ({ idx, frac: value - Math.floor(value) }))
        .sort((a, b) => b.frac - a.frac)
      const distributed = floors.slice()
      for (const entry of order) {
        if (remainder <= 0) break
        distributed[entry.idx] += 1
        remainder -= 1
      }
      return distributed
    }

    if (tailIndices.length) {
      const redistributed = distributeProportionally(tailValues, remaining)
      tailIndices.forEach((idx, pos) => {
        result[idx] = redistributed[pos] ?? 0
      })
    }

    let total = result.reduce((acc, value) => acc + value, 0)
    let diff = 100 - total
    if (diff !== 0) {
      const adjustIndex = tailIndices.length ? tailIndices[tailIndices.length - 1] : index
      result[adjustIndex] = clampPercent((result[adjustIndex] ?? 0) + diff)
    }

    total = result.reduce((acc, value) => acc + value, 0)
    diff = 100 - total
    if (diff !== 0) {
      const adjustIndex = tailIndices.length ? tailIndices[tailIndices.length - 1] : index
      result[adjustIndex] = clampPercent((result[adjustIndex] ?? 0) + diff)
    }

    return result
  }

  const totalEditedWeight = useMemo(() => {
    if (!editableHoldings.length) return 100
    return editableHoldings.reduce((sum, holding) => {
      if (!Number.isFinite(holding.weight)) return sum
      return sum + clampPercent(holding.weight)
    }, 0)
  }, [editableHoldings])

  const weightDelta = useMemo(() => 100 - totalEditedWeight, [totalEditedWeight])

  const handleWeightChange = (index: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '')
    const parsed = Number(sanitized)
    if (!Number.isFinite(parsed)) {
      return
    }
    const target = clampPercent(parsed)
    setEditableHoldings(prev => {
      if (!prev.length) return prev
      const weights = prev.map(holding => (Number.isFinite(holding.weight) ? Number(holding.weight) : 0))
      const adjusted = rebalanceTopDown(weights, index, target)
      return prev.map((holding, idx) => ({
        ...holding,
        weight: adjusted[idx] ?? 0
      }))
    })
  }

  const adjustHoldingWeight = (index: number, delta: number) => {
    setEditableHoldings(prev => {
      if (!prev.length) return prev
      const weights = prev.map(holding => (Number.isFinite(holding.weight) ? Number(holding.weight) : 0))
      const current = weights[index] ?? 0
      const target = clampPercent(current + delta)
      const adjusted = rebalanceTopDown(weights, index, target)
      return prev.map((holding, idx) => ({
        ...holding,
        weight: adjusted[idx] ?? 0
      }))
    })
  }

  const handleNormalizeWeights = () => {
    setEditableHoldings(prev => {
      if (!prev.length) return prev
      const rawWeights = prev.map(holding => (Number.isFinite(holding.weight) ? Number(holding.weight) : 0))
      const adjusted = normalisePercentages(rawWeights)
      return prev.map((holding, idx) => ({
        ...holding,
        weight: adjusted[idx] ?? 0
      }))
    })
  }

  const handleResetPortfolio = async () => {
    if (!userId) return
    setResettingPortfolio(true)
    try {
      const response = await apiFetch('/api/portfolio/reset-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      if (response.ok) {
        setShowCustomBuilder(false)
        setActiveInstrumentRow(null)
        setInstrumentSearchTerm('')
        await fetchPortfolio()
        await fetchPerformanceData()
      } else {
        const errorPayload = await response.json().catch(() => ({}))
        console.error('Error resetting portfolio', errorPayload)
      }
    } catch (error) {
      console.error('Error resetting portfolio', error)
    } finally {
      setResettingPortfolio(false)
    }
  }

  const handleCustomRowSymbolChange = (rowId: string, symbol: string) => {
    setCustomRows(prev => prev.map(row => (row.id === rowId ? { ...row, symbol } : row)))
  }

  const handleCustomRowWeightChange = (rowId: string, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '')
    const parsed = Number(sanitized)
    if (!Number.isFinite(parsed)) return
    const target = clampPercent(parsed)
    setCustomRows(prev => {
      const index = prev.findIndex(row => row.id === rowId)
      if (index === -1) return prev
      const weights = prev.map(row => Number.isFinite(row.weight) ? row.weight : 0)
      const adjusted = rebalanceTopDown(weights, index, target)
      return prev.map((row, idx) => ({
        ...row,
        weight: adjusted[idx] ?? 0
      }))
    })
  }

  const adjustCustomRowWeight = (rowId: string, delta: number) => {
    setCustomRows(prev => {
      const index = prev.findIndex(row => row.id === rowId)
      if (index === -1) return prev
      const weights = prev.map(row => Number.isFinite(row.weight) ? row.weight : 0)
      const current = weights[index] ?? 0
      const target = clampPercent(current + delta)
      const adjusted = rebalanceTopDown(weights, index, target)
      return prev.map((row, idx) => ({
        ...row,
        weight: adjusted[idx] ?? 0
      }))
    })
  }

  const handleRemoveCustomRow = (rowId: string) => {
    setCustomRows(prev => prev.filter(row => row.id !== rowId))
    if (activeInstrumentRow === rowId) {
      setActiveInstrumentRow(null)
      setInstrumentSearchTerm('')
    }
  }

  const handleAddCustomRow = () => {
    const newRowId = `${Date.now()}-${Math.random()}`
    setCustomRows(prev => (
      [...prev, { id: newRowId, symbol: '', weight: 0 }]
    ))
    setActiveInstrumentRow(newRowId)
    setInstrumentSearchTerm('')
    setTimeout(() => {
      requestAnimationFrame(() => {
        const node = document.getElementById(`custom-row-${newRowId}`)
        node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }, 0)
  }

  const handleMoveHoldingRow = (index: number, direction: 'up' | 'down') => {
    setEditableHoldings(prev => {
      if (prev.length <= 1) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = prev.slice()
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const handleMoveCustomRow = (rowId: string, direction: 'up' | 'down') => {
    setCustomRows(prev => {
      const index = prev.findIndex(row => row.id === rowId)
      if (index === -1 || prev.length <= 1) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = prev.slice()
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const toggleInstrumentDropdown = (rowId: string) => {
    setActiveInstrumentRow(prev => (prev === rowId ? null : rowId))
  }

  const handleLoadBaselineRows = () => {
    if (!baselineAllocations || Object.keys(baselineAllocations).length === 0) {
      setCustomError('No baseline allocation stored for this profile.')
      return
    }
    const entries = Object.entries(baselineAllocations)
    const weights = normalisePercentages(entries.map(([, weight]) => Number(weight ?? 0)))
    const rows: Array<{ id: string; symbol: string; weight: number }> = entries.map(([symbol], idx) => ({
      id: `${symbol}-${idx}`,
      symbol,
      weight: weights[idx] ?? 0
    }))
    setCustomRows(rows)
    setActiveInstrumentRow(null)
    setInstrumentSearchTerm('')
  }

  const handleApplyCustomPortfolio = async () => {
    if (!userId) return
    setCustomError(null)
    if (!customRows.length) {
      setCustomError('Add at least one instrument to build a portfolio.')
      return
    }
    const aggregated: Record<string, number> = {}
    customRows.forEach(row => {
      const symbol = row.symbol?.trim()
      if (!symbol) return
      aggregated[symbol] = (aggregated[symbol] || 0) + (Number.isFinite(row.weight) ? row.weight : 0)
    })

    const allocations = Object.entries(aggregated)
      .filter(([, weight]) => weight > 0)
      .map(([symbol, weight]) => ({ symbol, weight: clampPercent(weight) }))
    if (!allocations.length) {
      setCustomError('Choose valid instruments before applying.')
      return
    }

    const normalised = normalisePercentages(allocations.map(item => item.weight))
    const preparedAllocations = allocations.map((item, idx) => ({
      ...item,
      weight: normalised[idx] ?? 0
    }))

    setSavingCustom(true)
    try {
      const response = await apiFetch('/api/portfolio/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          allocations: preparedAllocations
        })
      })
      if (response.ok) {
        setShowCustomBuilder(false)
        setActiveInstrumentRow(null)
        setInstrumentSearchTerm('')
        await fetchPortfolio()
        await fetchPerformanceData()
      } else {
        const errorPayload = await response.json().catch(() => ({}))
        setCustomError(errorPayload?.error || 'Unable to apply custom portfolio right now.')
      }
    } catch (error) {
      console.error('Error applying custom portfolio', error)
      setCustomError('Unable to apply custom portfolio right now.')
    } finally {
      setSavingCustom(false)
    }
  }

  const handleReverseSuggestion = async (actionId: number) => {
    if (!userId) return
    setProcessingReverse(actionId)
    try {
      const response = await apiFetch('/api/portfolio/suggestions/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          action_id: actionId
        })
      })
      if (response.ok) {
        await fetchPortfolio()
        await fetchPerformanceData()
      } else {
        const errorPayload = await response.json().catch(() => ({}))
        console.error('Error reversing suggestion', errorPayload)
      }
    } catch (error) {
      console.error('Error reversing suggestion', error)
    } finally {
      setProcessingReverse(null)
    }
  }

  const handleSuggestionDecision = async (suggestion: PortfolioSuggestion, decision: 'accepted' | 'rejected') => {
    const suggestionId = `${suggestion.replace_symbol}->${suggestion.suggest_symbol}`

    if (decision === 'accepted') {
      if (!userId) return
      setProcessingSuggestion(suggestionId)
      try {
        const response = await apiFetch('/api/portfolio/suggestions/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            replace_symbol: suggestion.replace_symbol,
            suggest_symbol: suggestion.suggest_symbol,
            target_weight: suggestion.target_weight
          })
        })
        if (response.ok) {
          setSuggestionDecisions(prev => ({ ...prev, [suggestionId]: 'accepted' }))
          await fetchPortfolio()
          await fetchPerformanceData()
        } else {
          const errorPayload = await response.json().catch(() => ({}))
          console.error('Error applying suggestion', errorPayload)
        }
      } catch (error) {
        console.error('Error applying suggestion', error)
      } finally {
        setProcessingSuggestion(null)
      }
      return
    }

    setSuggestionDecisions(prev => ({ ...prev, [suggestionId]: decision }))
  }

  const applyProjectionChanges = (overrides: { initial?: string; monthly?: string } = {}) => {
    const initialInput = overrides.initial ?? draftInitialInvestment
    const monthlyInput = overrides.monthly ?? draftMonthlyContribution

    const nextInitial = Math.round(parseNumericInput(initialInput, initialInvestment))
    const nextMonthlyRawRaw = parseNumericInput(monthlyInput, lastMonthlyContributionRef.current)
    const monthlyValue = Number.isFinite(nextMonthlyRawRaw) && nextMonthlyRawRaw > 0 ? Math.round(nextMonthlyRawRaw) : 0

    setProjectionError(null)
    setInitialInvestment(nextInitial)
    setDraftInitialInvestment(String(nextInitial))

    if (monthlyValue > 0) {
      lastMonthlyContributionRef.current = monthlyValue
    }

    if (investmentMode === 'monthly') {
      setMonthlyContribution(monthlyValue)
      setDraftMonthlyContribution(String(monthlyValue || lastMonthlyContributionRef.current))
    } else {
      setMonthlyContribution(0)
      setDraftMonthlyContribution(String(lastMonthlyContributionRef.current))
    }

    if (timeframe === 'custom') {
      if (customStart && customEnd) {
        const startDate = new Date(customStart)
        const endDate = new Date(customEnd)
        if (endDate <= startDate) {
          setProjectionError('End date must be after start date.')
          return
        }
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1
        const bounded = Math.min(Math.max(monthsDiff, 1), 360)
        customMonthsRef.current = bounded
        setCustomMonths(bounded)
      } else {
        const bounded = Math.min(Math.max(customMonthsRef.current, 1), 360)
        customMonthsRef.current = bounded
        setCustomMonths(bounded)
      }
    }
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const benchmarkRef = useRef<HTMLDivElement | null>(null)

const handleRunScenario = async () => {
    if (scenarioMode === 'monthly' && scenarioFrequency === 'annual') {
      const monthNumber = Number(scenarioAnnualMonth)
      if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        setScenarioMessage('Select the month you receive your annual contribution.')
        setScenarioExpanded(true)
        return
      }
    }
    setScenarioEnabled(true)
    setScenarioMessage(null)
    setScenarioExpanded(true)
    await fetchPerformanceData(true)
  }

const handleResetScenario = async () => {
    setScenarioEnabled(false)
    setScenarioInitialDraft(String(initialInvestment))
    setScenarioMonthlyDraft(String(investmentMode === 'monthly' ? monthlyContribution : lastMonthlyContributionRef.current))
    setScenarioMode(investmentMode)
    setScenarioPolicy(distributionPolicy)
    setScenarioFrequency('monthly')
    setScenarioAnnualMonth('12')
    setScenarioMessage(null)
    await fetchPerformanceData(false)
  }

  const handleApplyScenarioToPlan = async () => {
    const parsedInitial = Math.round(parseNumericInput(scenarioInitialDraft, initialInvestment))
    const parsedMonthlyRaw = parseNumericInput(scenarioMonthlyDraft, monthlyContribution)
    const parsedMonthly = scenarioMode === 'monthly' ? Math.round(parsedMonthlyRaw) : 0

    setInitialInvestment(parsedInitial)
    setDraftInitialInvestment(String(parsedInitial))
    if (scenarioMode === 'monthly') {
      lastMonthlyContributionRef.current = parsedMonthly
      setMonthlyContribution(parsedMonthly)
      setDraftMonthlyContribution(String(parsedMonthly))
    } else {
      setMonthlyContribution(0)
      setDraftMonthlyContribution(String(lastMonthlyContributionRef.current))
    }
    setInvestmentMode(scenarioMode)
    setDistributionPolicy(scenarioPolicy)
    setScenarioEnabled(false)
    await fetchPerformanceData(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const popover = activeInstrumentRow ? document.getElementById(`instrument-popover-${activeInstrumentRow}`) : null
      const trigger = activeInstrumentRow ? document.getElementById(`instrument-trigger-${activeInstrumentRow}`) : null
      const insidePopover = popover?.contains(target) ?? false
      const insideTrigger = trigger?.contains(target) ?? false

      if (activeInstrumentRow && !insidePopover && !insideTrigger) {
        setActiveInstrumentRow(null)
        setInstrumentSearchTerm('')
      }

      if (!(benchmarkRef.current?.contains(target) ?? false)) {
        setShowBenchmarkDropdown(false)
        setBenchmarkSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeInstrumentRow])

  const chartSeries = useMemo(() => {
    if (!performanceData) return []
    if (inflationAdjust && performanceData.series_real && performanceData.series_real.length) {
      return performanceData.series_real
    }
    return performanceData.series || []
  }, [performanceData, inflationAdjust])

  const benchmarkSeries = useMemo(() => performanceData?.benchmark_series || [], [performanceData])
  const benchmarkLabel = performanceData?.benchmark_label || (benchmarkOptions.find(opt => opt.symbol === benchmark)?.label ?? 'Benchmark')
  const benchmarkMap = useMemo(() => {
    const map = new Map<string, number>()
    benchmarkSeries.forEach((point: any) => map.set(point.date, point.value))
    return map
  }, [benchmarkSeries])
  const scenarioSeries = useMemo(() => {
    if (!scenarioData) return []
    if (inflationAdjust && scenarioData.series_real && scenarioData.series_real.length) {
      return scenarioData.series_real
    }
    return scenarioData.series || []
  }, [scenarioData, inflationAdjust])
  const scenarioMap = useMemo(() => {
    const map = new Map<string, number>()
    scenarioSeries.forEach((point: any) => map.set(point.date, point.value))
    return map
  }, [scenarioSeries])
  const customWeightSum = useMemo(
    () => customRows.reduce((sum, row) => {
      if (!Number.isFinite(row.weight)) return sum
      return sum + Math.max(0, Math.min(100, Math.round(Number(row.weight))))
    }, 0),
    [customRows]
  )

  useEffect(() => {
    if (investmentMode === 'monthly') {
      applyProjectionChanges({ monthly: String(lastMonthlyContributionRef.current) })
    } else {
      applyProjectionChanges()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investmentMode])

  useEffect(() => {
    if (benchmark) {
      localStorage.setItem('stockbuddy_benchmark', benchmark)
    }
  }, [benchmark])

  useEffect(() => {
    if (timeframe === 'custom') {
      if (customStart && customEnd) {
        applyProjectionChanges()
      }
    } else {
      setProjectionError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, customStart, customEnd])

  useEffect(() => {
    if (!scenarioEnabled) {
      setScenarioInitialDraft(String(initialInvestment))
      setScenarioMonthlyDraft(String(investmentMode === 'monthly' ? monthlyContribution : lastMonthlyContributionRef.current))
      setScenarioMode(investmentMode)
      setScenarioPolicy(distributionPolicy)
      setScenarioFrequency('monthly')
      setScenarioAnnualMonth('12')
    }
  }, [initialInvestment, monthlyContribution, investmentMode, distributionPolicy, scenarioEnabled])

  useEffect(() => {
    if (!scenarioEnabled) {
      setScenarioData(null)
      setScenarioMetrics(null)
      setScenarioMessage(null)
    }
  }, [scenarioEnabled])

  const resolvedMetrics = metrics || (portfolio ? {
    totalValue: portfolio.total_value,
    totalInvested: portfolio.total_cost,
    totalReturn: portfolio.total_pnl,
    totalReturnPct: portfolio.total_pnl_pct,
    totalDividends: 0,
    dividendsDistributed: 0,
    averageDividendYield: null,
    holdingsValue: portfolio.total_value,
    distributionPolicy
  } : null)

  const totalValue = resolvedMetrics?.totalValue ?? 0
  const totalInvested = resolvedMetrics?.totalInvested ?? 0
  const totalReturn = resolvedMetrics?.totalReturn ?? 0
  const totalReturnPct = resolvedMetrics?.totalReturnPct ?? 0
  const totalDividends = resolvedMetrics?.totalDividends ?? (performanceData?.total_dividends ?? 0)
  const dividendsDistributed = resolvedMetrics?.dividendsDistributed ?? (performanceData?.dividends_distributed ?? 0)
  const averageDividendYield = resolvedMetrics?.averageDividendYield ?? (performanceData?.average_dividend_yield ?? null)
  const holdingsValue = resolvedMetrics?.holdingsValue ?? (performanceData?.ending_value_holdings ?? totalValue)
  const effectiveDistributionPolicy = performanceData?.distribution_policy ?? resolvedMetrics?.distributionPolicy ?? distributionPolicy
  const scenarioResolved = scenarioMetrics
  const scenarioTotalValue = scenarioResolved?.totalValue ?? null
  const scenarioTotalInvested = scenarioResolved?.totalInvested ?? null
  const scenarioTotalReturn = scenarioResolved?.totalReturn ?? null
  const scenarioDividends = scenarioResolved?.totalDividends ?? null
  const scenarioPolicyLabel = scenarioResolved?.distributionPolicy ?? scenarioPolicy
  const scenarioParsedInitialValue = Math.max(0, Math.round(parseNumericInput(scenarioInitialDraft, initialInvestment)))
  const scenarioParsedRecurringValue = Math.max(0, Math.round(parseNumericInput(scenarioMonthlyDraft, monthlyContribution)))
  const scenarioFrequencyDisplay = useMemo(() => {
    if (scenarioMode !== 'monthly') {
      return 'One off investment'
    }
    if (scenarioFrequency === 'monthly') {
      return 'Monthly debit order'
    }
    if (scenarioFrequency === 'quarterly') {
      return 'Quarterly contribution'
    }
    if (scenarioFrequency === 'annual') {
      const monthIdx = Number(scenarioAnnualMonth) - 1
      const label = MONTH_NAMES[monthIdx] ?? `month ${scenarioAnnualMonth}`
      return `Annual in ${label}`
    }
    return 'Recurring contribution'
  }, [scenarioMode, scenarioFrequency, scenarioAnnualMonth])
  const scenarioRecurringLabel = scenarioMode === 'monthly'
    ? (() => {
        const amountLabel = formatCurrency(scenarioParsedRecurringValue)
        if (scenarioFrequency === 'monthly') {
          return `${amountLabel}/month`
        }
        if (scenarioFrequency === 'quarterly') {
          return `${amountLabel}/quarter`
        }
        if (scenarioFrequency === 'annual') {
          return `${amountLabel}/year`
        }
        return amountLabel
      })()
    : ''
  const valueDelta = scenarioTotalValue !== null ? scenarioTotalValue - totalValue : null
  const investedDelta = scenarioTotalInvested !== null ? scenarioTotalInvested - totalInvested : null
  const distributionLabel = effectiveDistributionPolicy === 'cash_out' ? 'Dividends paid out' : 'Dividends reinvested'
  const dividendDisplayValue = effectiveDistributionPolicy === 'cash_out' ? dividendsDistributed : totalDividends
  const annualisedReturn = performanceData
    ? (inflationAdjust && performanceData.annual_return_real !== null
        ? performanceData.annual_return_real
        : performanceData.annual_return)
    : null
  const benchmarkReturnPct = typeof performanceData?.benchmark_total_return_pct === 'number' ? performanceData.benchmark_total_return_pct : null
  const benchmarkVolatility = typeof performanceData?.benchmark_volatility === 'number' ? performanceData.benchmark_volatility : null
  const benchmarkDrawdown = typeof performanceData?.benchmark_max_drawdown === 'number' ? performanceData.benchmark_max_drawdown : null
  const benchmarkName = benchmarkLabel || 'Benchmark'
  const benchmarkDividends = typeof performanceData?.benchmark_total_dividends === 'number' ? performanceData.benchmark_total_dividends : null
  const benchmarkYield = typeof performanceData?.benchmark_average_dividend_yield === 'number' ? performanceData.benchmark_average_dividend_yield : null
  const downsideCapture = typeof performanceData?.downside_capture === 'number' ? performanceData.downside_capture : null
  const showBenchmarkStats = Boolean(performanceData?.benchmark_symbol && (benchmarkReturnPct !== null || benchmarkVolatility !== null || benchmarkDrawdown !== null || benchmarkDividends !== null || downsideCapture !== null))
  const portfolioVolatility = typeof performanceData?.volatility === 'number' ? performanceData.volatility : null
  const portfolioDrawdown = typeof performanceData?.max_drawdown === 'number' ? performanceData.max_drawdown : null
  const timeframeLabel = (() => {
    if (timeframe === '1y') return '1 year view'
    if (timeframe === '3y') return '3 year view'
    if (timeframe === '5y') return '5 year view'
    if (timeframe === 'custom') {
      if (customMonths >= 12) {
        const years = customMonths / 12
        const roundedYears = Number.isInteger(years) ? years.toString() : years.toFixed(1)
        return `Custom (${roundedYears} year view)`
      }
      return `Custom (${customMonths} month view)`
    }
    return 'Custom view'
  })()
  const investmentModeLabel = investmentMode === 'lump_sum' ? 'Lump sum once off' : 'Monthly debit order'

  useEffect(() => {
    if (annualisedReturn !== null && Number.isFinite(annualisedReturn)) {
      localStorage.setItem('stockbuddy_annualised_return', annualisedReturn.toString())
    } else {
      localStorage.removeItem('stockbuddy_annualised_return')
    }
  }, [annualisedReturn])
  const costBasisLabel = investmentMode === 'lump_sum' ? 'Invested capital' : 'Total contributions'
  const allocationTargets = portfolio?.allocation_targets ?? {}
  const planSummary = portfolio?.plan_summary ?? null
  const planPersona = portfolio?.plan_persona ?? null
  const planGuidance = portfolio?.plan_guidance ?? null

  const severityOrder: Record<GoalAlert['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2
  }
  const sortedAlerts = useMemo(() => {
    return [...goalAlerts].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))
  }, [goalAlerts])
  const alertStyles: Record<GoalAlert['severity'], string> = useMemo(() => ({
    critical: isDark
      ? 'border border-rose-500/60 bg-rose-500/15 text-rose-100'
      : 'border border-rose-400/60 bg-rose-50 text-rose-800',
    warning: isDark
      ? 'border border-amber-500/60 bg-amber-500/18 text-amber-100'
      : 'border border-amber-400/60 bg-amber-50 text-amber-800',
    info: isDark
      ? 'border border-sky-500/50 bg-sky-500/15 text-sky-100'
      : 'border border-sky-400/60 bg-sky-50 text-sky-800'
  }), [isDark])
  const criticalCount = sortedAlerts.filter(alert => alert.severity === 'critical').length
  const warningCount = sortedAlerts.filter(alert => alert.severity === 'warning').length

  const renderAlertIcon = (severity: GoalAlert['severity']) => {
    if (severity === 'critical') {
      return <ShieldAlert className="w-5 h-5" />
    }
    if (severity === 'warning') {
      return <AlertTriangle className="w-5 h-5" />
    }
    return <Info className="w-5 h-5" />
  }

  const handleAdjustPreferences = () => {
    navigate('/onboarding')
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center space-y-4">
          <h2 className="text-2xl font-semibold text-brand-ink dark:text-gray-100">No portfolio yet</h2>
          <p className="text-muted dark:text-gray-300">
            Complete onboarding to generate your personalised allocation and start tracking simulated returns.
          </p>
          <button onClick={() => navigate('/onboarding')} className="btn-cta">
            Start onboarding
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-muted dark:text-gray-300">Loading your portfolio...</p>
          </div>
      </div>
    )
  }

  if (!portfolio) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted dark:text-gray-300">No portfolio data found</p>
          </div>
        </div>
      )
  }

  const chartLabels = chartSeries.map((point: any) =>
    new Date(point.date).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
  )

  const performanceDatasets: any[] = [
    {
      label: inflationAdjust ? 'Portfolio (real rand)' : 'Portfolio value',
      data: chartSeries.map((point: any) => point.value),
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14, 165, 233, 0.15)',
      tension: 0.18,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
    }
  ]

  if (scenarioSeries.length) {
    const recurringDescriptor = scenarioMode === 'monthly' && scenarioRecurringLabel
      ? ` + ${scenarioRecurringLabel}`
      : ''
    const scenarioLegend = scenarioMode === 'monthly'
      ? `Scenario (${scenarioFrequencyDisplay} · ${formatCurrency(scenarioParsedInitialValue)}${recurringDescriptor})`
      : `Scenario (${formatCurrency(scenarioParsedInitialValue)} lump sum)`
    performanceDatasets.push({
      label: scenarioLegend,
      data: chartSeries.map((point: any) => {
        const value = scenarioMap.get(point.date)
        return value !== undefined ? value : null
      }),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderDash: [4, 3],
      borderWidth: 2,
      tension: 0.1,
      pointRadius: 0,
      spanGaps: true,
      fill: false
    })
  }

  if (benchmarkSeries.length) {
    performanceDatasets.push({
      label: `${benchmarkLabel} (benchmark)`,
      data: chartSeries.map((point: any) => {
        const value = benchmarkMap.get(point.date)
        return value !== undefined ? value : null
      }),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      borderDash: [6, 4],
      borderWidth: 2,
      tension: 0.12,
      pointRadius: 0,
      spanGaps: true,
      fill: false,
    })
  }

  const performanceChartData = {
    labels: chartLabels,
    datasets: performanceDatasets,
  }

  const displayHoldings = editableHoldings.length ? editableHoldings : (portfolio?.holdings ?? [])
  const handleDownloadPortfolio = () => {
    if (!portfolio) return

    const escapeCsv = (value: string | number) => {
      const str = typeof value === 'number' ? value.toString() : (value ?? '')
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const summaryRows = [
      ['Archetype', portfolio.archetype ?? ''],
      ['Timeframe', timeframeLabel],
      ['Contribution style', investmentModeLabel],
      ['Distribution policy', distributionLabel],
      ['Portfolio value (ZAR)', totalValue.toFixed(2)],
      ['Total invested (ZAR)', totalInvested.toFixed(2)],
      ['Total return (ZAR)', totalReturn.toFixed(2)],
      ['Total return (%)', totalReturnPct.toFixed(2)],
      ['Dividends generated (ZAR)', totalDividends.toFixed(2)],
      ['Dividends distributed (ZAR)', dividendsDistributed.toFixed(2)]
    ]

    const holdingsHeader = [
      'Symbol',
      'Name',
      'Quantity',
      'Avg Price',
      'Current Price',
      'Current Value',
      'Cost Basis',
      'P&L',
      'P&L %',
      'Weight %'
    ]

    const holdingsRows = displayHoldings.map(holding => [
      escapeCsv(holding.symbol),
      escapeCsv(holding.name),
      holding.quantity.toFixed(4),
      holding.avg_price.toFixed(2),
      holding.current_price.toFixed(2),
      holding.current_value.toFixed(2),
      holding.cost_basis.toFixed(2),
      holding.pnl.toFixed(2),
      holding.pnl_pct.toFixed(2),
      Math.round(holding.weight ?? 0)
    ].join(','))

    const csvLines = [
      'Portfolio overview',
      ...summaryRows.map(row => `${escapeCsv(row[0])},${escapeCsv(row[1])}`),
      '',
      'Holdings',
      holdingsHeader.join(','),
      ...holdingsRows
    ]

    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `stockbuddy-portfolio-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalReturnPercent = performanceData
    ? ((inflationAdjust && performanceData.total_return_real !== null ? performanceData.total_return_real : performanceData.total_return) / Math.max(performanceData.total_invested || 1, 1)) * 100
    : 0

  const isDarkMode = theme === 'dark'
  const axisColor = isDarkMode ? '#dfe6ee' : '#2a2a2a'
  const gridColor = isDarkMode ? 'rgba(223,230,238,0.08)' : 'rgba(0,0,0,0.05)'
  const tooltipBg = isDarkMode ? 'rgba(15,23,42,0.92)' : 'rgba(42,42,42,0.9)'

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    layout: {
      padding: {
        top: 16,
        bottom: 8,
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: axisColor,
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: 'transparent',
        borderWidth: 0,
        displayColors: false,
        padding: 14,
        caretPadding: 10,
        caretSize: 6,
        titleColor: '#ffffff',
        bodyColor: '#f5f5f5',
        titleFont: { family: 'Inter, sans-serif', size: 12, weight: 600 },
        bodyFont: { family: 'Inter, sans-serif', size: 12 },
        callbacks: {
          title(context: any) {
            if (!context?.length) return ''
            const dateLabel = context[0].label
            return `Date: ${dateLabel}`
          },
          label(context: any) {
            const label = context.dataset.label || 'Value'
            const parsed = typeof context.parsed === 'object' ? context.parsed?.y : context.parsed
            if (parsed === null || parsed === undefined) {
              return `${label}: —`
            }
            return `${label}: ${formatCurrency(parsed)}`
          },
          footer(context: any) {
            if (!context?.length) return ''
            const point = context[0]
            const raw = typeof point.raw === 'object' ? point.raw?.y : point.raw
            if (raw === null || raw === undefined) return ''
            return `Value: ${formatCurrency(raw)}`
          }
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            const numeric = typeof value === 'string' ? Number(value) : value
            if (!Number.isFinite(numeric)) {
              return value
            }
            return new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: 'ZAR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(numeric)
          },
          color: axisColor,
        },
        grid: {
          color: gridColor
        }
      },
      x: {
        ticks: {
          color: axisColor
        },
        grid: {
          color: gridColor
        }
      }
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100">
              Welcome
            </h1>
            <p className="text-muted dark:text-gray-300">
              {portfolio.archetype} plan • {investmentModeLabel} • {timeframeLabel}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdjustPreferences}
              className="btn-secondary whitespace-nowrap"
            >
              Adjust preferences
            </button>
          </div>
        </div>

        {sortedAlerts.length > 0 && (
          <div className="mb-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-brand-ink'}`}>Goal tracking alerts</h2>
              <div className={`flex flex-wrap items-center gap-3 ${isDark ? 'text-slate-300' : 'text-brand-ink/70'}`}>
                {criticalCount > 0 && <span className={isDark ? 'text-rose-300' : 'text-rose-600'}>Critical: {criticalCount}</span>}
                {warningCount > 0 && <span className={isDark ? 'text-amber-200' : 'text-amber-600'}>Warnings: {warningCount}</span>}
                <span className={isDark ? 'text-sky-200' : 'text-sky-600'}>{sortedAlerts.length} total</span>
              </div>
            </div>
            <div className="space-y-3">
              {sortedAlerts.map((alert) => {
                const severityTone =
                  alert.severity === 'critical'
                    ? (isDark ? 'bg-rose-500/20 text-rose-100' : 'bg-rose-100 text-rose-700')
                    : alert.severity === 'warning'
                      ? (isDark ? 'bg-amber-500/20 text-amber-100' : 'bg-amber-100 text-amber-700')
                      : (isDark ? 'bg-sky-500/20 text-sky-100' : 'bg-sky-100 text-sky-700')

                const neutralChipTone = isDark
                  ? 'bg-slate-900/40 text-slate-200'
                  : 'bg-white text-brand-ink border border-brand-ink/10 shadow-sm'

                const triggerChipTone = isDark
                  ? 'bg-slate-900/50 text-slate-200'
                  : 'bg-brand-ink/5 text-brand-ink'

                const triggerLabelTone = isDark ? 'text-slate-400' : 'text-brand-ink/60'
                const actionTone = isDark ? 'text-slate-200' : 'text-brand-ink/75'
                const timestampTone = isDark ? 'text-slate-400' : 'text-brand-ink/60'
                const iconWrapperTone = isDark ? 'bg-slate-950/40 text-slate-200' : 'bg-brand-ink/10 text-brand-ink'
                const messageTone = isDark ? 'text-slate-100' : 'text-brand-ink'

                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl px-4 py-4 shadow-sm backdrop-blur ${alertStyles[alert.severity]}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full shadow-inner ${iconWrapperTone}`}>
                        {renderAlertIcon(alert.severity)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide font-semibold">
                          <span className={`rounded-full px-2 py-1 ${severityTone}`}>{alert.severity}</span>
                          {alert.symbol && (
                            <span className={`rounded-full px-2 py-1 ${neutralChipTone}`}>{alert.symbol}</span>
                          )}
                          {alert.metric && (
                            <span className={`rounded-full px-2 py-1 ${neutralChipTone}`}>{alert.metric.replace(/_/g, ' ')}</span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${messageTone}`}>{alert.message}</p>
                        {alert.trigger && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {Object.entries(alert.trigger).map(([key, value]) => (
                              <span key={key} className={`rounded-full px-2 py-1 ${triggerChipTone}`}>
                                <span className={`${triggerLabelTone}`}>{key.replace(/_/g, ' ')}:</span>{' '}
                                {formatTriggerValue(key, value)}
                              </span>
                            ))}
                          </div>
                        )}
                        {alert.suggested_action && (
                          <p className={`text-xs ${actionTone}`}>
                            Suggested action: {alert.suggested_action}
                          </p>
                        )}
                        {alert.created_at && (
                          <p className={`text-[11px] ${timestampTone}`}>
                            Flagged {new Date(alert.created_at).toLocaleString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Plan overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-3">
              About your {portfolio.archetype} plan
            </h2>
            <div className="space-y-4 text-muted dark:text-gray-300">
              <div className="flex flex-wrap gap-2">
                {portfolio.plan_goal && (
                  <span className="badge bg-white/90 text-brand-purple uppercase tracking-wide text-[11px] font-semibold">
                    Goal: {formatLabel(portfolio.plan_goal)}
                  </span>
                )}
                {portfolio.plan_risk_band && (
                  <span className="badge bg-brand-mint/20 text-brand-mint uppercase tracking-wide text-[11px] font-semibold">
                    Risk: {formatLabel(portfolio.plan_risk_band)}
                  </span>
                )}
                {portfolio.plan_anchor_cap_pct && (
                  <span className="badge bg-brand-gold/20 text-brand-gold uppercase tracking-wide text-[11px] font-semibold">
                    Anchor cap {portfolio.plan_anchor_cap_pct}%
                  </span>
                )}
              </div>
              <p>{planSummary || 'Your allocation is designed to balance growth and resilience for South African investors.'}</p>
              {planPersona && (
                <p className="text-sm"><span className="font-medium text-brand-ink dark:text-gray-100">Who it suits:</span> {planPersona}</p>
              )}
              {planGuidance && (
                <p className="text-sm"><span className="font-medium text-brand-ink dark:text-gray-100">How to put it to work:</span> {planGuidance}</p>
              )}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-3">
              Target allocation
            </h2>
            {Object.keys(allocationTargets).length > 0 ? (
              <ul className="space-y-2 text-sm text-muted dark:text-gray-300">
                {Object.entries(allocationTargets)
                  .sort((a, b) => Number(b[1]) - Number(a[1]))
                  .map(([symbol, weight]) => (
                    <li key={symbol} className="flex items-center justify-between">
                      <span className="font-medium text-brand-ink dark:text-gray-100">{symbol}</span>
                      <span>{Math.round(Number(weight) || 0)}%</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted dark:text-gray-300">Allocation targets will appear here once onboarding is complete.</p>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card relative overflow-hidden">
            <div className="pr-16">
              <p className="text-sm font-medium text-muted dark:text-gray-300">{inflationAdjust ? 'Portfolio value (real rands)' : 'Portfolio value'}</p>
              <p className="text-2xl font-bold text-brand-ink dark:text-slate-50">
                {formatCurrency(totalValue)}
              </p>
              {effectiveDistributionPolicy === 'cash_out' && (
                <p className="text-xs text-muted dark:text-gray-300">
                  Holdings on chart: {formatCurrency(holdingsValue)}
                </p>
              )}
            </div>
            <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="card relative overflow-hidden">
            <div className="pr-16">
              <p className="text-sm font-medium text-muted dark:text-gray-300">Annualised return</p>
              <p className={`text-2xl font-bold ${ (annualisedReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400' }`}>
                {annualisedReturn !== null ? formatPercentage(annualisedReturn) : '+0.00%'}
              </p>
              <p className="text-xs text-muted dark:text-gray-300 min-h-[32px] flex items-center">
                {(inflationAdjust ? 'Real' : 'Nominal') + ' CAGR · ' + timeframeLabel.toLowerCase()}
              </p>
            </div>
            <div className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full ${ (annualisedReturn ?? 0) >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              {(annualisedReturn ?? 0) >= 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
          </div>

          <div className="card relative overflow-hidden">
            <div className="pr-16">
              <p className="text-sm font-medium text-muted dark:text-gray-300">Total P&L</p>
              <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(totalReturn)}
              </p>
              <p className={`text-sm ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPercentage(totalReturnPct)}
              </p>
            </div>
            <div className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full ${totalReturn >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          <div className="card relative overflow-hidden">
            <div className="pr-16">
              <p className="text-sm font-medium text-muted dark:text-gray-300">{costBasisLabel}</p>
              <p className="text-2xl font-bold text-brand-ink dark:text-slate-50">
                {formatCurrency(totalInvested)}
              </p>
              {investmentMode === 'monthly' && (
                <p className="text-xs text-muted dark:text-gray-300">
                  {formatCurrency(lastMonthlyContributionRef.current)} debit order every month
                </p>
              )}
            </div>
            <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <PiggyBank className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="mb-8">
            <div ref={containerRef} className="card space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-brand-ink dark:text-gray-100">Portfolio performance</h3>
                <p className="text-xs text-muted dark:text-gray-300">
                  Track how your allocation evolves over time and compare against a benchmark or inflation adjusted rand returns.
                </p>
              </div>
              <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Timeframe</p>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="1y">1 year</option>
                    <option value="3y">3 years</option>
                    <option value="5y">5 years</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Contribution style</p>
                  <div className="flex h-11 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <button
                      type="button"
                      onClick={() => setInvestmentMode('lump_sum')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-colors ${investmentMode === 'lump_sum' ? 'bg-primary-600 text-white shadow-sm' : 'bg-transparent text-muted dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      Lump sum
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvestmentMode('monthly')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-colors ${investmentMode === 'monthly' ? 'bg-primary-600 text-white shadow-sm' : 'bg-transparent text-muted dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 xl:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Distribution policy</p>
                  <div className="flex h-11 items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                    <button
                      type="button"
                      onClick={() => setDistributionPolicy('reinvest')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-colors ${distributionPolicy === 'reinvest' ? 'bg-primary-600 text-white shadow-sm' : 'bg-transparent text-muted dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      Reinvest
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistributionPolicy('cash_out')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-colors ${distributionPolicy === 'cash_out' ? 'bg-primary-600 text-white shadow-sm' : 'bg-transparent text-muted dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      Cash out
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 relative xl:col-span-2" ref={benchmarkRef}>
                  <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Benchmark</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBenchmarkDropdown(prev => !prev)
                      setBenchmarkSearchTerm('')
                    }}
                    className="input-field flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="truncate text-sm font-medium text-brand-ink dark:text-gray-100">
                      {benchmark
                        ? (benchmarkOptions.find(option => option.symbol === benchmark)?.label || benchmark)
                        : 'None'}
                    </span>
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {showBenchmarkDropdown && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[240px] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="px-3 pt-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60">
                          <input
                            type="text"
                            placeholder="Search benchmarks"
                            value={benchmarkSearchTerm}
                            onChange={(e) => setBenchmarkSearchTerm(e.target.value)}
                            className="w-full border-none bg-transparent text-sm text-brand-ink dark:text-gray-100 placeholder:text-subtle dark:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      <div className="mt-2 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            setBenchmark('')
                            setShowBenchmarkDropdown(false)
                            setBenchmarkSearchTerm('')
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${benchmark === '' ? 'bg-primary-50 text-primary-600 dark:bg-gray-700 dark:text-primary-200' : 'hover:bg-primary-50 dark:hover:bg-gray-700'}`}
                        >
                          <span className="font-semibold text-brand-ink dark:text-gray-100">None</span>
                          <span className="text-xs text-muted dark:text-gray-300">No comparison</span>
                        </button>
                        {filteredBenchmarkOptions.map(option => (
                          <button
                            key={option.symbol}
                            type="button"
                            onClick={() => {
                              setBenchmark(option.symbol)
                              setShowBenchmarkDropdown(false)
                              setBenchmarkSearchTerm('')
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2 text-sm ${benchmark === option.symbol ? 'bg-primary-50 text-primary-600 dark:bg-gray-700 dark:text-primary-200' : 'hover:bg-primary-50 dark:hover:bg-gray-700'}`}
                          >
                            <span className="font-semibold text-brand-ink dark:text-gray-100">{option.symbol}</span>
                            <span className="text-xs text-muted dark:text-gray-300">{option.label}</span>
                          </button>
                        ))}
                        {!filteredBenchmarkOptions.length && (
                          <div className="px-3 py-4 text-xs text-muted dark:text-gray-300">No benchmarks match your search.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 xl:col-span-1">
                  <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Inflation lens</p>
                  <button
                    type="button"
                    onClick={() => setInflationAdjust(!inflationAdjust)}
                    className={`flex h-10 items-center justify-between gap-3 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors ${
                      inflationAdjust
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/70 text-muted dark:text-gray-300 hover:border-primary-400'
                    }`}
                  >
                    <span>View real returns</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        inflationAdjust ? 'border-white bg-white text-primary-600' : 'border-gray-300 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Real returns apply South African CPI to show your performance in today&apos;s rand terms.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted dark:text-gray-300">
              <span className="font-semibold text-muted dark:text-gray-200 dark:text-gray-100">{distributionLabel}</span>
              <span>{formatCurrency(dividendDisplayValue)} generated over the selected period.</span>
              {effectiveDistributionPolicy === 'cash_out' ? (
                <>
                  <span>Dividends are shown outside the chart to reflect cash payouts.</span>
                  <span>Line chart tracks invested holdings only ({formatCurrency(holdingsValue)}).</span>
                </>
              ) : (
                <span>Reinvesting keeps distributions compounding inside portfolio value.</span>
              )}
              {typeof averageDividendYield === 'number' && (
                <span>Average sleeve yield ≈ {averageDividendYield.toFixed(1)}% p.a.</span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300 mb-1">Initial investment (rand)</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draftInitialInvestment}
                  onChange={(e) => setDraftInitialInvestment(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 100000"
                />
              </div>
              {investmentMode === 'monthly' && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300 mb-1">Monthly contribution</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={draftMonthlyContribution}
                    onChange={(e) => setDraftMonthlyContribution(e.target.value)}
                    className="input-field"
                    placeholder="e.g. 2000"
                  />
                </div>
              )}
              {timeframe === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300 mb-1">Start date</p>
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || undefined}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300 mb-1">End date</p>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart || undefined}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              )}
            </div>
            {projectionError && (
              <p className="text-sm text-danger-600 dark:text-danger-500">{projectionError}</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted dark:text-gray-300">Adjust your assumptions then refresh the simulation.</p>
              <button
                type="button"
                onClick={() => applyProjectionChanges()}
                className="btn-cta"
              >
                Update projection
              </button>
            </div>
            <div className="rounded-2xl border border-dashed border-primary-500/40 bg-slate-900/50 p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary-200">Contribution lab</p>
                  <p className="text-xs text-slate-300">
                    Model a different contribution plan and compare the outcome alongside your current strategy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScenarioExpanded(prev => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-500/60 bg-primary-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-100 shadow-sm transition hover:bg-primary-500/30"
                >
                  {scenarioExpanded ? 'Hide lab' : 'Open lab'}
                </button>
              </div>
              {scenarioExpanded && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${scenarioData ? 'bg-emerald-500/20 text-emerald-300' : 'bg-primary-500/20 text-primary-200'}`}>
                        {scenarioData ? `Overlay: ${scenarioFrequencyDisplay}` : 'No scenario loaded'}
                      </span>
                      {scenarioMessage && (
                        <span className="text-xs text-primary-200">{scenarioMessage}</span>
                      )}
                    </div>
                    {scenarioData && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="inline-block h-2.5 w-2.5 rounded-full border border-emerald-300 bg-emerald-300" />
                        <span className="text-emerald-200">Scenario path</span>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-primary-200 mb-1">Scenario type</p>
                      <div className="flex h-10 items-center rounded-full bg-slate-800/70 p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setScenarioMode('lump_sum')}
                          className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${scenarioMode === 'lump_sum' ? 'bg-primary-500 text-white shadow-sm' : 'text-primary-200'}`}
                        >
                          Lump sum
                        </button>
                        <button
                          type="button"
                          onClick={() => setScenarioMode('monthly')}
                          className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${scenarioMode === 'monthly' ? 'bg-primary-500 text-white shadow-sm' : 'text-primary-200'}`}
                        >
                          Recurring plan
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-primary-200 mb-1">Distribution policy</p>
                      <div className="flex h-10 items-center rounded-full bg-slate-800/70 p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setScenarioPolicy('reinvest')}
                          className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${scenarioPolicy === 'reinvest' ? 'bg-primary-500 text-white shadow-sm' : 'text-primary-200'}`}
                        >
                          Reinvest
                        </button>
                        <button
                          type="button"
                          onClick={() => setScenarioPolicy('cash_out')}
                          className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${scenarioPolicy === 'cash_out' ? 'bg-primary-500 text-white shadow-sm' : 'text-primary-200'}`}
                        >
                          Cash out
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-primary-200 mb-1">Initial contribution</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={scenarioInitialDraft}
                        onChange={(e) => setScenarioInitialDraft(e.target.value)}
                        className="input-field bg-slate-800/70 text-primary-100 placeholder:text-slate-500"
                      />
                    </div>
                    {scenarioMode === 'monthly' && (
                      <>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-primary-200 mb-1">Contribution cadence</p>
                          <select
                            value={scenarioFrequency}
                            onChange={(e) => setScenarioFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                            className="input-field bg-slate-800/70 text-primary-100"
                          >
                            <option value="monthly">Monthly debit order</option>
                            <option value="quarterly">Quarterly (every 3 months)</option>
                            <option value="annual">Annual (once a year)</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-primary-200 mb-1">Contribution amount</p>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={scenarioMonthlyDraft}
                            onChange={(e) => setScenarioMonthlyDraft(e.target.value)}
                            className="input-field bg-slate-800/70 text-primary-100 placeholder:text-slate-500"
                          />
                        </div>
                        {scenarioFrequency === 'annual' && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-primary-200 mb-1">Annual contribution month</p>
                            <select
                              value={scenarioAnnualMonth}
                              onChange={(e) => setScenarioAnnualMonth(e.target.value)}
                              className="input-field bg-slate-800/70 text-primary-100"
                            >
                              {MONTH_NAMES.map((label, idx) => (
                                <option key={label} value={idx + 1}>{label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={handleRunScenario} className="btn-secondary">
                      Run comparison
                    </button>
                    <button
                      type="button"
                      onClick={handleResetScenario}
                      className="btn-ghost text-xs text-primary-200 hover:text-white"
                    >
                      Reset lab
                    </button>
                    {scenarioData && (
                      <button
                        type="button"
                        onClick={handleApplyScenarioToPlan}
                        className="btn-cta"
                      >
                        Apply to plan
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Scenario results draw over the chart in green. Apply to replace your baseline, or reset to remove the comparison.
                  </p>
                </div>
              )}
            </div>
            <div className="relative w-full h-[420px]">
              {isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                  <div className="flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-200">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
                    Updating…
                  </div>
                </div>
              )}
              <Line data={performanceChartData} options={chartOptions} />
            </div>
            {performanceData && (
              <div className="grid gap-4 text-left sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-subtle dark:text-muted dark:text-gray-300">{inflationAdjust ? 'Real total return' : 'Nominal total return'}</p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Portfolio</p>
                      <p className={`text-lg font-semibold ${totalReturnPercent >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{formatPercentage(totalReturnPercent)}</p>
                    </div>
                    {showBenchmarkStats && (
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">{benchmarkName}</p>
                        <p className="text-lg font-semibold text-subtle dark:text-gray-400 dark:text-gray-200">{formatOptionalPercentage(benchmarkReturnPct)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-subtle dark:text-muted dark:text-gray-300">Volatility (annualised)</p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Portfolio</p>
                      <p className="text-lg font-semibold text-brand-ink dark:text-gray-100">{formatPercentNoSign(portfolioVolatility)}</p>
                    </div>
                    {showBenchmarkStats && (
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">{benchmarkName}</p>
                        <p className="text-lg font-semibold text-subtle dark:text-gray-400 dark:text-gray-200">{formatPercentNoSign(benchmarkVolatility)}</p>
                    </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-subtle dark:text-muted dark:text-gray-300">Worst drawdown</p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Portfolio</p>
                      <p className={`text-lg font-semibold ${typeof portfolioDrawdown === 'number' ? 'text-danger-600' : 'text-gray-400'}`}>{formatPercentNoSign(portfolioDrawdown)}</p>
                    </div>
                    {showBenchmarkStats && (
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">{benchmarkName}</p>
                        <p className="text-lg font-semibold text-subtle dark:text-gray-400 dark:text-gray-200">{formatPercentNoSign(benchmarkDrawdown)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-subtle dark:text-muted dark:text-gray-300">Dividends generated</p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Portfolio</p>
                      <p className="text-lg font-semibold text-success-600">{formatCurrency(totalDividends)}</p>
                      {typeof averageDividendYield === 'number' && (
                        <p className="text-xs text-muted dark:text-gray-300">Yield {averageDividendYield.toFixed(2)}% p.a.</p>
                      )}
                    </div>
                    {showBenchmarkStats && (
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">{benchmarkName}</p>
                        <p className="text-lg font-semibold text-subtle dark:text-gray-400 dark:text-gray-200">
                          {typeof benchmarkDividends === 'number' ? formatCurrency(benchmarkDividends) : '—'}
                        </p>
                        {typeof benchmarkYield === 'number' && (
                          <p className="text-xs text-muted dark:text-gray-300">Yield {benchmarkYield.toFixed(2)}% p.a.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-subtle dark:text-muted dark:text-gray-300">Downside capture</p>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Portfolio</p>
                      <p className={`text-lg font-semibold ${typeof downsideCapture === 'number' ? (downsideCapture <= 100 ? 'text-success-600' : 'text-danger-600') : 'text-gray-400'}`}>{formatPercentNoSign(downsideCapture)}</p>
                      <p className="text-xs text-muted dark:text-gray-300">Lower than 100% indicates better downside protection vs benchmark.</p>
                    </div>
                    {showBenchmarkStats && (
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">{benchmarkName}</p>
                        <p className="text-lg font-semibold text-subtle dark:text-gray-400 dark:text-gray-200">100%</p>
                        <p className="text-xs text-muted dark:text-gray-300">Benchmark baseline</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {scenarioData && scenarioResolved && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Scenario vs baseline</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Baseline ending value</span>
                      <span className="font-semibold">{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Scenario ending value</span>
                      <span className="font-semibold text-emerald-300">{scenarioTotalValue !== null ? formatCurrency(scenarioTotalValue) : '—'}</span>
                    </div>
                    {valueDelta !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Difference</span>
                        <span className={`font-semibold ${valueDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {valueDelta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(valueDelta))}
                        </span>
                      </div>
                    )}
                    <hr className="border-slate-700/80" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Scenario total return</span>
                      <span className="font-semibold text-emerald-300">{scenarioTotalReturn !== null ? formatCurrency(scenarioTotalReturn) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Baseline total return</span>
                      <span className="font-semibold text-slate-100">{formatCurrency(totalReturn)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Contribution & income</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Baseline capital invested</span>
                      <span className="font-semibold">{formatCurrency(totalInvested)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Scenario capital invested</span>
                      <span className="font-semibold text-emerald-300">{scenarioTotalInvested !== null ? formatCurrency(scenarioTotalInvested) : '—'}</span>
                    </div>
                    {investedDelta !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Difference</span>
                        <span className={`${investedDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {investedDelta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(investedDelta))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contribution cadence</span>
                      <span className="font-semibold text-slate-100 text-right">{scenarioFrequencyDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Initial contribution</span>
                      <span className="font-semibold text-emerald-300">{formatCurrency(scenarioParsedInitialValue)}</span>
                    </div>
                    {scenarioMode === 'monthly' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Recurring amount</span>
                        <span className="font-semibold text-emerald-300">{scenarioRecurringLabel}</span>
                      </div>
                    )}
                    <hr className="border-slate-700/80" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Scenario dividend total</span>
                      <span className="font-semibold text-emerald-300">{scenarioDividends !== null ? formatCurrency(scenarioDividends) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Dividend policy</span>
                      <span className="font-semibold">{scenarioPolicyLabel === 'cash_out' ? 'Paid out as cash' : 'Reinvested into units'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Holdings Table */}
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100">
              Holdings
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPortfolio}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleResetPortfolio}
                disabled={resettingPortfolio}
                className={`btn-secondary text-xs whitespace-nowrap ${resettingPortfolio ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {resettingPortfolio ? 'Resetting…' : 'Reset to plan'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomError(null)
                  setShowCustomBuilder(prev => {
                    const next = !prev
                    if (!next) {
                      setActiveInstrumentRow(null)
                      setInstrumentSearchTerm('')
                    }
                    return next
                  })
                  if (!showCustomBuilder) {
                    let baseRows: Array<{ id: string; symbol: string; weight: number }> = editableHoldings.map((holding, idx) => ({
                      id: `${holding.symbol}-${idx}`,
                      symbol: holding.symbol,
                      weight: clampPercent(holding.weight ?? 0)
                    }))
                    if (!baseRows.length) {
                      baseRows.push({ id: `custom-${Date.now()}`, symbol: '', weight: 0 })
                    } else if (baseRows.length) {
                      const adjusted = normalisePercentages(baseRows.map(row => row.weight))
                      baseRows = baseRows.map((row, idx) => ({
                        ...row,
                        weight: adjusted[idx] ?? 0
                      }))
                    }
                    setCustomRows(baseRows)
                    setInstrumentSearchTerm('')
                    const pendingRow = baseRows.find(row => !row.symbol)
                    setActiveInstrumentRow(pendingRow ? pendingRow.id : null)
                  }
                }}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                {showCustomBuilder ? 'Close builder' : 'Customise mix'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="w-10 py-3 pl-4 pr-10 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Order
                  </th>
                  <th className="py-3 pr-4 pl-10 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300 w-72">
                    Instrument
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Quantity
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Avg Price
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Current Price
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Value
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    P&L
                  </th>
                  <th className="py-3 px-4 text-center font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayHoldings.map((holding, index) => {
                  const holdingWeight = clampPercent(holding.weight ?? 0)
                  const disableHoldingMinus = holdingWeight <= 0
                  const disableHoldingPlus = holdingWeight >= 100
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 pl-4 pr-10 align-top text-center">
                      <div className="mx-auto flex w-fit flex-col items-center gap-1.5 text-subtle dark:text-gray-400 dark:text-gray-300">
                        <button
                          type="button"
                          onClick={() => handleMoveHoldingRow(index, 'up')}
                          disabled={index === 0}
                          aria-label="Move holding up"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveHoldingRow(index, 'down')}
                          disabled={index === displayHoldings.length - 1}
                          aria-label="Move holding down"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:translate-y-0.5 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-4 pl-10 text-center w-72">
                      <div className="space-y-1">
                        <div className="font-medium text-brand-ink dark:text-gray-100">
                          {holding.symbol}
                        </div>
                        <div className="text-sm text-muted dark:text-gray-300">
                          {holding.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-brand-ink dark:text-gray-100">
                      {holding.quantity.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center text-brand-ink dark:text-gray-100">
                      {formatCurrency(holding.avg_price)}
                    </td>
                    <td className="py-3 px-4 text-center text-brand-ink dark:text-gray-100">
                      <div className="space-y-1 text-center">
                        <div>{formatCurrency(holding.current_price)}</div>
                        <div className={`text-xs ${holding.current_price - holding.avg_price >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {formatCurrencyDelta(holding.current_price - holding.avg_price)} vs avg
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-brand-ink dark:text-gray-100">
                      {formatCurrency(holding.current_value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`${holding.pnl >= 0 ? 'text-success-600' : 'text-danger-600'} space-y-0.5`}>
                        <div className="font-medium">
                          {formatCurrency(holding.pnl)}
                        </div>
                        <div className="text-sm">
                          {formatPercentage(holding.pnl_pct)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-brand-ink dark:text-gray-100">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustHoldingWeight(index, -1)}
                          disabled={disableHoldingMinus}
                          aria-label="Decrease weight"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="relative w-24">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={3}
                            value={String(holdingWeight)}
                            onChange={(e) => handleWeightChange(index, e.target.value)}
                            aria-label="Holding weight percentage"
                            className="w-full rounded-full border border-gray-200 bg-white/80 pr-8 pl-3 py-1.5 text-center text-sm font-semibold tracking-wide text-brand-ink dark:text-gray-100 shadow-inner focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-100"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-subtle dark:text-muted dark:text-gray-300">
                            %
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustHoldingWeight(index, 1)}
                          disabled={disableHoldingPlus}
                          aria-label="Increase weight"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Total allocation</span>
              <span className="font-semibold text-brand-ink dark:text-gray-100">{totalEditedWeight}%</span>
            </div>
            {weightDelta !== 0 && (
              <button
                type="button"
                onClick={handleNormalizeWeights}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                Normalise to 100%
              </button>
            )}
          </div>
          {weightDelta !== 0 && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Tip: Adjust weights until they sum to 100% for a balanced allocation. Currently off by {weightDelta > 0 ? '+' : ''}{weightDelta}%.
            </p>
          )}

          {showCustomBuilder && (
            <div ref={customBuilderRef} className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="mb-4 flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-brand-ink dark:text-gray-100">Custom portfolio builder</h4>
                <p className="text-xs text-muted dark:text-gray-300">
                  Choose instruments and assign whole number weights totalling 100%. We&apos;ll rebalance your holdings immediately.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-subtle dark:text-muted dark:text-gray-300 text-center">
                      <th className="w-12 py-2 pl-4 pr-10 text-center">Order</th>
                      <th className="py-2 pr-4 pl-10 text-center w-80">Instrument</th>
                      <th className="py-2 pr-3 text-center">Weight %</th>
                      <th className="py-2 pr-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customRows.map((row, rowIndex) => {
                      const rowWeight = clampPercent(row.weight ?? 0)
                      const disableRowMinus = rowWeight <= 0
                      const disableRowPlus = rowWeight >= 100
                      return (
                      <tr key={row.id} id={`custom-row-${row.id}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2 pl-4 pr-10 align-top text-center">
                          <div className="mx-auto flex w-fit flex-col items-center gap-1.5 text-subtle dark:text-gray-400 dark:text-gray-300">
                            <button
                              type="button"
                              onClick={() => handleMoveCustomRow(row.id, 'up')}
                              disabled={rowIndex === 0}
                              aria-label="Move instrument up"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCustomRow(row.id, 'down')}
                              disabled={rowIndex === customRows.length - 1}
                              aria-label="Move instrument down"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:translate-y-0.5 hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 pr-4 pl-10 text-center w-80">
                          <div className="relative mx-auto w-full max-w-md text-left">
                            <button
                              id={`instrument-trigger-${row.id}`}
                              type="button"
                              onClick={() => toggleInstrumentDropdown(row.id)}
                              className="input-field flex w-full items-center justify-between gap-2 text-left"
                            >
                              <span className={`truncate ${row.symbol ? 'text-brand-ink dark:text-gray-100' : 'text-gray-400 dark:text-subtle dark:text-gray-400'}`}>
                                {row.symbol || 'Search instrument…'}
                              </span>
                              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {activeInstrumentRow === row.id && (
                              <div
                                id={`instrument-popover-${row.id}`}
                                className="absolute left-0 top-full z-20 mt-2 w-full min-w-[240px] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
                              >
                                <div className="px-3 pt-3">
                                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60">
                                    <input
                                      ref={activeInstrumentRow === row.id ? instrumentSearchInputRef : undefined}
                                      type="text"
                                      placeholder="Search instruments"
                                      value={instrumentSearchTerm}
                                      onChange={(e) => setInstrumentSearchTerm(e.target.value)}
                                      className="w-full border-none bg-transparent text-sm text-brand-ink dark:text-gray-100 placeholder:text-subtle dark:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-400"
                                    />
                                  </div>
                                </div>
                                <div
                                  ref={activeInstrumentRow === row.id ? instrumentListRef : undefined}
                                  className="mt-2 max-h-60 overflow-y-auto border-t border-gray-200 dark:border-gray-700"
                                >
                                  {filteredInstrumentOptions.map(option => (
                                    <button
                                      key={`${row.id}-${option.symbol}`}
                                      type="button"
                                      onClick={() => {
                                        handleCustomRowSymbolChange(row.id, option.symbol)
                                        setActiveInstrumentRow(null)
                                        setInstrumentSearchTerm('')
                                      }}
                                      className="flex w-full items-center gap-3 px-3 py-2 text-sm text-left hover:bg-primary-50 dark:hover:bg-gray-700"
                                    >
                                      <span className="font-semibold text-brand-ink dark:text-gray-100">{option.symbol}</span>
                                      <span className="text-xs text-subtle dark:text-gray-400 dark:text-gray-300">{option.label}</span>
                                    </button>
                                  ))}
                                  {!filteredInstrumentOptions.length && (
                                    <div className="px-3 py-4 text-xs text-muted dark:text-gray-300">No instruments match your search.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => adjustCustomRowWeight(row.id, -1)}
                              disabled={disableRowMinus}
                              aria-label="Decrease custom weight"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className="relative w-24">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={3}
                                value={String(rowWeight)}
                                onChange={(e) => handleCustomRowWeightChange(row.id, e.target.value)}
                                aria-label="Custom weight percentage"
                                className="w-full rounded-full border border-gray-200 bg-white/80 pr-8 pl-3 py-1.5 text-right text-sm font-semibold tracking-wide text-brand-ink dark:text-gray-100 shadow-inner focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-100"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-subtle dark:text-muted dark:text-gray-300">
                                %
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => adjustCustomRowWeight(row.id, 1)}
                              disabled={disableRowPlus}
                              aria-label="Increase custom weight"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200/70 bg-white text-subtle dark:text-gray-400 shadow-sm transition hover:bg-primary-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 dark:border-gray-700/70 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomRow(row.id)}
                            className="text-xs text-danger-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted dark:text-gray-300">
                <span>Total custom weight: {customWeightSum}%</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadBaselineRows}
                    className="btn-secondary text-xs"
                  >
                    Load plan weights
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomRow}
                    className="btn-secondary text-xs"
                  >
                    Add instrument
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomPortfolio}
                    disabled={savingCustom}
                    className={`btn-cta text-xs ${savingCustom ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {savingCustom ? 'Applying…' : 'Apply custom mix'}
                  </button>
                </div>
              </div>
              {customError && (
                <p className="mt-2 text-sm text-danger-600 dark:text-danger-500">{customError}</p>
              )}
            </div>
          )}
        </div>

        {portfolio.suggestions && portfolio.suggestions.length > 0 && (
          <div className="card mt-8">
            <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-2">Suggested tweaks</h3>
            <p className="text-sm text-muted dark:text-gray-300 mb-5">
              We flag context aware swaps for your {portfolio.archetype} mix—sometimes chasing stronger returns, other times prioritising yield or stability in line with your mandate.
            </p>
            <div className="space-y-4">
              {portfolio.suggestions.map((suggestion, index) => {
                const suggestionId = `${suggestion.replace_symbol}->${suggestion.suggest_symbol}`
                const decision = suggestionDecisions[suggestionId]
                const decisionCopy = decision === 'accepted'
                  ? 'Marked as accepted'
                  : decision === 'rejected'
                    ? 'Suggestion dismissed'
                    : null
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/70 px-5 py-5 shadow-sm transition hover:border-primary-200/80 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6">
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Current holding</p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold text-brand-ink dark:text-gray-100">
                            {suggestion.replace_symbol} · {suggestion.replace_name}
                          </p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${suggestion.trailing_return >= 0 ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}`}>
                            6m return {formatPercentage(suggestion.trailing_return)}
                          </span>
                        </div>
                      </div>
                      <div className="hidden md:flex justify-center">
                        <ArrowRightLeft className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-subtle dark:text-muted dark:text-gray-300">Suggested replacement</p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold text-brand-ink dark:text-gray-100">
                            {suggestion.suggest_symbol} · {suggestion.suggest_name}
                          </p>
                          <span className="rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200 px-2 py-1 text-[11px] font-semibold">
                            Target weight {Math.round(Number(suggestion.target_weight) || 0)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted dark:text-gray-300">
                          {typeof suggestion.suggest_trailing_return === 'number' && (
                            <span className={suggestion.suggest_trailing_return >= 0 ? 'text-success-600' : 'text-danger-600'}>
                              6m return {formatPercentage(suggestion.suggest_trailing_return)}
                            </span>
                          )}
                          {typeof suggestion.suggest_dividend_yield === 'number' && suggestion.suggest_dividend_yield > 0 && (
                            <span>Indicative yield {suggestion.suggest_dividend_yield.toFixed(1)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs leading-relaxed text-subtle dark:text-gray-400 dark:text-gray-300 md:max-w-2xl">
                        {suggestion.reason}
                      </p>
                      <div className="flex items-center gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => handleSuggestionDecision(suggestion, 'accepted')}
                          disabled={processingSuggestion === suggestionId}
                          className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${decision === 'accepted' ? 'bg-success-600 text-white shadow-sm' : 'bg-success-100 text-success-700 hover:bg-success-200'} ${processingSuggestion === suggestionId ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {decision === 'accepted' ? 'Accepted' : 'Accept swap'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSuggestionDecision(suggestion, 'rejected')}
                          disabled={processingSuggestion === suggestionId}
                          className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${decision === 'rejected' ? 'bg-danger-600 text-white shadow-sm' : 'bg-danger-100 text-danger-700 hover:bg-danger-200'} ${processingSuggestion === suggestionId ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {decision === 'rejected' ? 'Rejected' : 'Dismiss'}
                        </button>
                      </div>
                    </div>
                    {decisionCopy && (
                      <p className={`mt-3 text-[11px] font-semibold ${decision === 'accepted' ? 'text-success-600' : 'text-danger-600'}`}>
                        {decisionCopy}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {appliedSuggestions && appliedSuggestions.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-3">Recent swaps</h3>
            <ul className="space-y-2 text-sm text-muted dark:text-gray-300">
              {appliedSuggestions.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-x-1">
                    <span>Replaced</span>
                    <span className="font-semibold text-brand-ink dark:text-gray-100">{item.replace_symbol}</span>
                    <span>with</span>
                    <span className="font-semibold text-brand-ink dark:text-gray-100">{item.suggest_symbol}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted dark:text-gray-300">{formatTimestamp(item.created_at)}</span>
                    <button
                      type="button"
                      onClick={() => handleReverseSuggestion(item.id)}
                      disabled={processingReverse === item.id}
                      className={`text-xs font-semibold ${processingReverse === item.id ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:underline dark:text-primary-300'}`}
                    >
                      {processingReverse === item.id ? 'Reversing…' : 'Reverse swap'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Guardrails */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-4">
            Portfolio Guardrails
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card border-l-4 border-success-500">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-brand-ink dark:text-gray-100">
                    Diversification Check
                  </p>
                  <p className="text-sm text-muted dark:text-gray-300">
                    Portfolio is well diversified across sectors
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card border-l-4 border-yellow-500">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-brand-ink dark:text-gray-100">
                    Anchor Stock Limit
                  </p>
                  <p className="text-sm text-muted dark:text-gray-300">
                    Anchor stock capped at 5% as designed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Portfolio
