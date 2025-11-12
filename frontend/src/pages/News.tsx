import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Newspaper, RefreshCw, ExternalLink, AlertCircle, CalendarDays } from 'lucide-react'
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
  Positive: 'bg-brand-mint/15 text-brand-mint',
  Neutral: 'bg-[#e7e9f3] text-muted',
  Mixed: 'bg-amber-100 text-amber-700',
  Cautious: 'bg-brand-coral/15 text-brand-coral'
}

const News: React.FC<NewsProps> = ({ userId }) => {
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

  const totalHeadlines = useMemo(
    () => holdingNews.reduce((acc, group) => acc + group.news.length, 0),
    [holdingNews]
  )

  const anchorHeadline = anchorData?.news?.[0]
  const benchmarkHeadline = benchmarkData?.news?.[0]

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

  const renderStory = (story: PortfolioNewsItem, accent: 'primary' | 'neutral') => {
    const sentimentClass = sentimentClasses[story.sentiment] ?? sentimentClasses['Neutral']
    const cardTone =
      accent === 'primary'
        ? 'border-brand-purple/30'
        : 'border-[#e7e9f3]'

    return (
      <article
        key={story.id}
        className={`rounded-[26px] border bg-white px-5 py-5 transition hover:-translate-y-0.5 ${cardTone}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex-1 min-w-0 break-words text-lg font-semibold text-primary-ink">
            {story.headline}
          </h3>
          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${sentimentClass}`}>
            {story.sentiment}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-subtle">{story.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{renderPublishedDate(story.published_at)}</span>
          {story.topic && (
            <span className="rounded-full bg-brand-purple/10 px-3 py-1 text-[11px] font-semibold text-brand-purple">
              {story.topic}
            </span>
          )}
          {story.source && <span>Source: {story.source}</span>}
          {story.url && (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-purple hover:underline"
            >
              View detail
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </article>
    )
  }

  if (!userId) {
    return (
      <OnboardingCard
        icon={<Newspaper className="w-10 h-10 text-brand-purple" />}
        title="Finish onboarding"
        message="Complete the onboarding journey so we can tailor daily news to the shares and ETFs you actually hold."
        primaryLabel="Start onboarding"
        onPrimary={() => navigate('/onboarding')}
        maxWidth="md"
      />
    )
  }

  const nextEarnings = earningsWatch[0]

  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#e7e9f3] bg-white px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-1 text-xs font-semibold text-muted">
              Daily briefing
            </span>
            <h1 className="text-4xl font-semibold text-primary-ink">
              Stay ahead of your holdings, benchmark, and anchor company in one glance.
            </h1>
            <p className="text-lg text-subtle">
              We pull credible South African headlines every morning, prioritise what impacts your strategy, and keep the upcoming earnings diary in view.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[#e7e9f3] bg-white px-4 py-4">
                <p className="text-xs font-semibold text-muted">Holdings tracked</p>
                <p className="mt-2 text-2xl font-semibold text-primary-ink">{holdingNews.length}</p>
              </div>
              <div className="rounded-[22px] border border-[#e7e9f3] bg-white px-4 py-4">
                <p className="text-xs font-semibold text-muted">Headlines in view</p>
                <p className="mt-2 text-2xl font-semibold text-primary-ink">{totalHeadlines}</p>
              </div>
              <div className="rounded-[22px] border border-[#e7e9f3] bg-white px-4 py-4">
                <p className="text-xs font-semibold text-muted">Earnings on radar</p>
                <p className="mt-2 text-2xl font-semibold text-primary-ink">{earningsWatch.length}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-[#e7e9f3] bg-white px-5 py-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary-ink">Next earnings checkpoint</p>
              <CalendarDays className="h-5 w-5 text-brand-purple" />
            </div>
            {nextEarnings ? (
              <div className="space-y-2 text-sm text-subtle">
                <p className="text-base font-semibold text-primary-ink">{nextEarnings.symbol}</p>
                {nextEarnings.date && (
                  <p>{new Date(nextEarnings.date).toLocaleDateString('en-ZA', { month: 'long', day: 'numeric' })}</p>
                )}
                {nextEarnings.name && <p>{nextEarnings.name}</p>}
                {typeof nextEarnings.surprise_pct === 'number' && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-mint/15 px-3 py-1 text-xs font-semibold text-brand-mint">
                    Surprise {nextEarnings.surprise_pct.toFixed(1)}%
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-subtle">No immediate earnings flagged. We’ll surface the next call as soon as it lands.</p>
            )}
            <button
              type="button"
              onClick={fetchNews}
              className="btn-secondary inline-flex w-full items-center justify-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing feed…' : 'Refresh feed'}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-12 px-4">
        {error && (
          <div className="flex items-center gap-3 rounded-[24px] border border-brand-coral/40 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {(anchorHeadline || benchmarkHeadline) && (
          <div className="grid gap-6 md:grid-cols-2">
            {anchorHeadline && (
              <div className="space-y-4 rounded-2xl border border-brand-purple/30 bg-white px-5 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-brand-purple">Anchor watch</p>
                    <p className="text-sm text-subtle">{anchorData?.name ?? anchorData?.symbol}</p>
                  </div>
                  <Newspaper className="h-5 w-5 text-brand-purple" />
                </div>
                {renderStory(anchorHeadline, 'primary')}
              </div>
            )}
            {benchmarkHeadline && (
              <div className="space-y-4 rounded-2xl border border-[#e7e9f3] bg-white px-5 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">Benchmark pulse</p>
                    <p className="text-sm text-subtle">{benchmarkData?.name ?? benchmarkData?.symbol}</p>
                  </div>
                  <Newspaper className="h-5 w-5 text-muted" />
                </div>
                {renderStory(benchmarkHeadline, 'neutral')}
              </div>
            )}
          </div>
        )}

        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-primary-ink">Holdings in the headlines</h2>
              <p className="text-subtle">Stories that reference the ETFs and shares you currently track.</p>
            </div>
            <span className="rounded-full border border-[#e7e9f3] px-3 py-1 text-xs font-semibold text-muted">
              Updated hourly
            </span>
          </div>

          {holdingNews.length === 0 ? (
            <div className="rounded-2xl border border-[#e7e9f3] bg-white px-6 py-10 text-center text-subtle">
              Your watchlist is quiet. We’ll surface stories as soon as your holdings hit the news cycle.
            </div>
          ) : (
            <div className="grid gap-10">
              {holdingNews.map((group) => (
                <section key={group.symbol} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-primary-ink">{group.name}</h3>
                      <p className="text-sm text-subtle">{group.symbol}</p>
                    </div>
                    <span className="rounded-full bg-brand-mint/15 px-3 py-1 text-xs font-semibold text-brand-mint">
                      {group.news.length} stories
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.news.map((story, index) => renderStory(story, index === 0 ? 'primary' : 'neutral'))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {shouldRenderScheduleCard && (
          <section className="space-y-6 rounded-2xl border border-[#e7e9f3] bg-white px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-primary-ink">Upcoming earnings checkpoints</h2>
                <p className="text-subtle">Map the events that could move your holdings over the next two months.</p>
              </div>
              <CalendarDays className="h-6 w-6 text-brand-purple" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {scheduleSections.map(({ key, label, helper }) => {
                const grouped = earningsSchedule[key] ?? []
                return (
                  <div key={key} className="space-y-4 rounded-2xl border border-[#e7e9f3] bg-white px-5 py-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-primary-ink">{label}</p>
                      <p className="text-xs text-subtle">{helper}</p>
                    </div>
                    {grouped.length === 0 ? (
                      <p className="text-sm text-subtle">{schedulePlaceholders[key]}</p>
                    ) : (
                      <ul className="space-y-3 text-sm text-subtle">
                        {grouped.slice(0, 4).map((item) => (
                          <li key={`${item.symbol}-${item.date}`} className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3">
                            <p className="text-sm font-semibold text-primary-ink">{item.symbol}</p>
                            {item.date && <p>{new Date(item.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</p>}
                            {typeof item.surprise_pct === 'number' && (
                              <span className="inline-flex items-center gap-2 text-xs text-brand-mint">
                                Surprise {item.surprise_pct.toFixed(1)}%
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </section>
    </div>
  )
}

export default News
