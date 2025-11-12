import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Newspaper, RefreshCw, ExternalLink, AlertCircle, CalendarDays } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'
import OnboardingCard from '../components/OnboardingCard'
import { apiFetch } from '../lib/api'

interface NewsProps {
  userId: number | null
}

interface PortfolioNewsItem {
  id: string
  symbol: string
  name: string
  headline: string
  summary: string
  sentiment: string
  topic?: string
  published_at: string
  source?: string
  url?: string
}

interface NewsGroup {
  symbol: string
  name: string
  news: PortfolioNewsItem[]
}

interface BenchmarkPayload extends NewsGroup {}
interface AnchorPayload extends NewsGroup {}

type EarningsContext = 'anchor' | 'benchmark' | 'portfolio'

interface EarningsItem {
  symbol: string
  date: string
  eps_estimate?: number
  eps_actual?: number
  surprise_pct?: number
  context?: EarningsContext
  name?: string
}

type EarningsSchedule = Partial<Record<EarningsContext, EarningsItem[]>>


const sentimentClasses: Record<string, string> = {
  Positive: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
  Neutral: 'bg-gray-200 text-muted dark:text-gray-200 dark:bg-gray-700/50 dark:text-gray-200',
  Mixed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  Cautious: 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-300'
}

const News: React.FC<NewsProps> = ({ userId }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
    const [benchmarkData, setBenchmarkData] = useState<BenchmarkPayload | null>(null)
  const [anchorData, setAnchorData] = useState<AnchorPayload | null>(null)
  const [holdingGroups, setHoldingGroups] = useState<NewsGroup[]>([])
  const [earningsWatch, setEarningsWatch] = useState<EarningsItem[]>([])
  const [earningsSchedule, setEarningsSchedule] = useState<EarningsSchedule>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadBenchmarks = async () => {
      try {
        const resp = await apiFetch('/api/benchmarks')
        if (!resp.ok) {
          throw new Error('Unable to fetch benchmarks')
        }
        await resp.json() // fetched for parity
      } catch (err) {
        console.error('Failed to load benchmark list', err)
      }
    }
    loadBenchmarks()
  }, [])

  const fetchNews = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      
      const response = await apiFetch(`/api/news/${userId}?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Unable to load portfolio news right now.')
      }
      const data = await response.json()
      setAnchorData(data.anchor || null)
      setBenchmarkData(data.benchmark || null)
      setHoldingGroups(data.holdings || [])
      setEarningsWatch(data.earnings_watch || [])
      setEarningsSchedule(data.earnings_schedule || {})
    } catch (err: any) {
      setError(err.message || 'Something went wrong loading news.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchNews()
    }
  }, [userId, fetchNews])

  const renderPublishedDate = (iso: string) => {
    const parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) {
      return 'Recently updated'
    }
    return parsed.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const holdingNews = useMemo(
    () => holdingGroups.filter((group) => Array.isArray(group.news) && group.news.length > 0),
    [holdingGroups]
  )

  const scheduleSections = useMemo(
    () => ([
      {
        key: 'anchor' as EarningsContext,
        label: 'Anchor stock diary',
        helper: 'Key announcements for your anchor company over the next two months.'
      },
      {
        key: 'benchmark' as EarningsContext,
        label: 'Benchmark watchlist',
        helper: 'Upcoming calls for the benchmark or its headline constituents.'
      },
      {
        key: 'portfolio' as EarningsContext,
        label: 'Portfolio holdings',
        helper: 'Keep tabs on earnings that could move your current sleeves.'
      }
    ]),
    []
  )

  const hasGroupedItems = scheduleSections.some(({ key }) => (earningsSchedule[key]?.length ?? 0) > 0)
  const shouldRenderScheduleCard = hasGroupedItems || earningsWatch.length > 0

  const schedulePlaceholders: Record<EarningsContext, string> = {
    anchor: 'No anchor earnings confirmed in the next 60 days.',
    benchmark: 'Benchmark constituents have not flagged upcoming earnings in this window.',
    portfolio: 'None of your current holdings have scheduled calls in the next 60 days.'
  }

  if (!userId) {
    return (
      <OnboardingCard
        icon={<Newspaper className="w-10 h-10 text-primary-500" />}
        title="Finish onboarding"
        message="Complete the onboarding journey so we can tailor daily news to the shares and ETFs you actually hold."
        primaryLabel="Start onboarding"
        onPrimary={() => navigate('/onboarding')}
        maxWidth="md"
      />
    )
  }

  const renderStory = (story: PortfolioNewsItem, accent: 'primary' | 'neutral') => {
    const sentimentClass = sentimentClasses[story.sentiment] ?? sentimentClasses['Neutral']
    const containerClasses =
      accent === 'primary'
        ? isDark
          ? 'rounded-xl border border-primary-500/30 bg-slate-900/70 px-4 py-4 shadow-sm'
          : 'rounded-xl border border-brand-purple/20 bg-white px-4 py-4 shadow-sm'
        : 'rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm'

    const metaClasses =
      accent === 'primary'
        ? isDark
          ? 'mt-3 flex flex-wrap items-center gap-3 text-xs text-primary-200/80'
          : 'mt-3 flex flex-wrap items-center gap-3 text-xs text-muted'
        : 'mt-3 flex flex-wrap items-center gap-3 text-xs text-muted dark:text-gray-300'

    const summaryClasses =
      accent === 'primary'
        ? isDark
          ? 'mt-2 text-sm text-primary-100/80 leading-relaxed'
          : 'mt-2 text-sm text-brand-ink leading-relaxed'
        : 'mt-2 text-sm text-brand-ink dark:text-gray-300 leading-relaxed'

    return (
      <article key={story.id} className={containerClasses}>
        <div className="flex items-start justify-between gap-3">
          <h3 className={`flex-1 min-w-0 break-words text-lg font-semibold ${accent === 'primary' ? (isDark ? 'text-primary-50' : 'text-brand-ink') : 'text-brand-ink dark:text-gray-100'}`}>
            {story.headline}
          </h3>
          <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${sentimentClass}`}>
            {story.sentiment}
          </span>
        </div>
        <p className={summaryClasses}>
          {story.summary}
        </p>
        <div className={metaClasses}>
          <span>{renderPublishedDate(story.published_at)}</span>
          {story.topic && (
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                accent === 'primary'
                  ? 'bg-primary-500/20 text-primary-100'
                  : 'bg-primary-500/10 text-primary-600 dark:text-primary-300'
              }`}
            >
              {story.topic}
            </span>
          )}
          {story.source && <span>Source: {story.source}</span>}
          {story.url && (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 ${accent === 'primary' ? 'text-primary-200' : 'text-primary-600 dark:text-primary-300'} hover:underline`}
            >
              View detail
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100">Market briefings</h1>
            <p className="text-sm text-muted dark:text-gray-300">
              Live headlines from credible publishers over the past seven days, ranked by your benchmark and holdings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchNews}
              className="btn-secondary inline-flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh feed
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger-500/40 bg-danger-500/10 px-4 py-3 flex items-center gap-3 text-danger-600 dark:text-danger-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-3" />
              <p className="text-sm text-subtle dark:text-gray-400 dark:text-gray-300">Gathering the latest briefings...</p>
            </div>
          </div>
        )}

        {!loading && !anchorData && !benchmarkData && holdingNews.length === 0 && !error && (
          <div className="card text-center space-y-3">
            <Newspaper className="w-10 h-10 text-primary-500 mx-auto" />
            <p className="text-brand-ink dark:text-gray-300">
              We&apos;ll start surfacing stories here as soon as your holdings sync with our news desk.
            </p>
          </div>
        )}

        {!loading && anchorData && (
          <section className="card space-y-4 border-primary-500/30">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-brand-ink dark:text-primary-100">
                  Anchor spotlight · {anchorData.name} ({anchorData.symbol})
                </h2>
                <p className="text-xs uppercase tracking-wide text-brand-purple dark:text-primary-300">
                  Your north star holding – freshest coverage (last 7 days)
                </p>
              </div>
            </header>
            <div className="space-y-3">
              {anchorData.news?.length
                ? anchorData.news.map((story: PortfolioNewsItem) => renderStory(story, 'primary'))
                : (
                  <div className="rounded-xl border border-primary-500/20 bg-white text-muted dark:bg-slate-900/40 dark:text-primary-200 px-4 py-4 text-sm">
                    No major headlines for your anchor stock over the past week. We&apos;ll surface fresh coverage as soon as it lands.
                  </div>
                )}
            </div>
          </section>
        )}

        {!loading && benchmarkData && benchmarkData.news?.length > 0 && (
          <section className="card space-y-4 border-primary-500/30">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-brand-ink dark:text-primary-100">
                  Benchmark spotlight · {benchmarkData.name} ({benchmarkData.symbol})
                </h2>
                <p className="text-xs uppercase tracking-wide text-brand-purple dark:text-primary-300">
                  Latest coverage (last 7 days)
                </p>
              </div>
            </header>
            <div className="space-y-3">
              {benchmarkData.news.map((story: PortfolioNewsItem) => renderStory(story, 'primary'))}
            </div>
          </section>
        )}

        {!loading && holdingNews.map(({ symbol, name, news }) => (
          <section key={symbol} className="card space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100">
                  {name} ({symbol})
                </h2>
                <p className="text-xs uppercase tracking-wide text-subtle dark:text-brand-ink dark:text-gray-300">
                  {news.length} headline{news.length > 1 ? 's' : ''} matched to this holding
                </p>
              </div>
            </header>
            <div className="space-y-4">
              {news.map((story) => renderStory(story, 'neutral'))}
            </div>
          </section>
        ))}

        {!loading && shouldRenderScheduleCard && (
          <section className="card space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary-500" />
                <div>
                  <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100">Upcoming earnings calls</h2>
                  <p className="text-xs uppercase tracking-wide text-subtle dark:text-brand-ink dark:text-gray-300">Next 60 days · refreshed daily</p>
                </div>
              </div>
            </header>
            <div className="space-y-6">
              {scheduleSections.map(({ key, label, helper }) => {
                const items = earningsSchedule[key] ?? []
                const isRelevant =
                  (key === 'anchor' && Boolean(anchorData)) ||
                  (key === 'benchmark' && Boolean(benchmarkData)) ||
                  (key === 'portfolio' && holdingGroups.length > 0)

                if (!isRelevant) {
                  return null
                }
                return (
                  <div key={key} className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100">{label}</h3>
                      <p className="text-xs text-subtle dark:text-brand-ink dark:text-gray-300">{helper}</p>
                    </div>
                    {items.length > 0 ? (
                      <ul className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
                        {items.map((item) => {
                          const dateDisplay = new Date(item.date).toLocaleString('en-ZA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          return (
                            <li key={`${key}-${item.symbol}-${item.date}`} className="py-3 flex flex-wrap items-center justify-between gap-4 text-sm">
                              <div>
                                <p className="font-semibold text-brand-ink dark:text-gray-100">{item.name || item.symbol}</p>
                                <p className="text-brand-ink dark:text-gray-300">
                                  {item.symbol} · {dateDisplay}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-subtle dark:text-brand-ink dark:text-gray-300">
                                {typeof item.eps_estimate === 'number' && (
                                  <span>EPS est: {item.eps_estimate.toFixed(2)}</span>
                                )}
                                {typeof item.eps_actual === 'number' && (
                                  <span>Last EPS: {item.eps_actual.toFixed(2)}</span>
                                )}
                                {typeof item.surprise_pct === 'number' && (
                                  <span
                                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                      item.surprise_pct >= 0 ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                                    }`}
                                  >
                                    Prev surprise {item.surprise_pct.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300/70 dark:border-gray-700/70 bg-gray-50/60 dark:bg-gray-900/40 px-4 py-4 text-sm text-brand-ink dark:text-gray-300">
                        {schedulePlaceholders[key]}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {!loading && !hasGroupedItems && earningsWatch.length > 0 && (
          <section className="card space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary-500" />
                <div>
                  <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100">Earnings on the radar</h2>
                  <p className="text-xs uppercase tracking-wide text-subtle dark:text-brand-ink dark:text-gray-300">Next 60 days</p>
                </div>
              </div>
            </header>
            <ul className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
              {earningsWatch.map((item) => {
                const dateDisplay = new Date(item.date).toLocaleString('en-ZA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return (
                  <li key={`${item.symbol}-${item.date}`} className="py-3 flex flex-wrap items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-brand-ink dark:text-gray-100">{item.name || item.symbol}</p>
                      <p className="text-brand-ink dark:text-gray-300">{item.symbol} · {dateDisplay}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-subtle dark:text-brand-ink dark:text-gray-300">
                      {typeof item.eps_estimate === 'number' && (
                        <span>EPS est: {item.eps_estimate.toFixed(2)}</span>
                      )}
                      {typeof item.eps_actual === 'number' && (
                        <span>Last EPS: {item.eps_actual.toFixed(2)}</span>
                      )}
                      {typeof item.surprise_pct === 'number' && (
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            item.surprise_pct >= 0 ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                          }`}
                        >
                          Prev surprise {item.surprise_pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

export default News
