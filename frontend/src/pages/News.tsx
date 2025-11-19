import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Newspaper, RefreshCw, ExternalLink, AlertCircle, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react'
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
  portfolioImpact?: string
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
  Positive: 'bg-brand-mint/15 text-brand-mint border-brand-mint/30',
  Neutral: 'bg-[#e7e9f3] text-muted border-[#d7d9e5]',
  Mixed: 'bg-amber-100 text-amber-700 border-amber-300',
  Cautious: 'bg-brand-coral/15 text-brand-coral border-brand-coral/30'
}

const News: React.FC<NewsProps> = ({ userId }) => {
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkPayload | null>(null)
  const [anchorData, setAnchorData] = useState<AnchorPayload | null>(null)
  const [holdingGroups, setHoldingGroups] = useState<NewsGroup[]>([])
  const [generalNews, setGeneralNews] = useState<NewsGroup[]>([])
  const [earningsWatch, setEarningsWatch] = useState<EarningsItem[]>([])
  const [earningsSchedule, setEarningsSchedule] = useState<EarningsSchedule>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLatestNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/news/latest')
      if (!response.ok) {
        throw new Error('Unable to load latest news.')
      }
      const data = await response.json()
      setGeneralNews(data.news || [])
      setIsPersonalized(false)
    } catch (err: any) {
      setError(err.message || 'Something went wrong loading news.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPersonalizedNews = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch(`/api/news/${userId}`)
      if (!response.ok) {
        throw new Error('Unable to load portfolio news right now.')
      }
      const data = await response.json()
      setAnchorData(data.anchor || null)
      setBenchmarkData(data.benchmark || null)
      setHoldingGroups(data.holdings || [])
      setEarningsWatch(data.earnings_watch || [])
      setEarningsSchedule(data.earnings_schedule || {})
      setIsPersonalized(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong loading news.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchPersonalizedNews()
    } else {
      fetchLatestNews()
    }
  }, [userId, fetchLatestNews, fetchPersonalizedNews])

  const renderPublishedDate = (iso: string) => {
    const parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) {
      return 'Recently updated'
    }
    return parsed.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const allNews = useMemo(() => {
    if (isPersonalized) {
      const personalized: PortfolioNewsItem[] = []
      if (anchorData?.news) {
        anchorData.news.forEach(story => {
          personalized.push({ ...story, portfolioImpact: 'Affects your anchor stock' })
        })
      }
      if (benchmarkData?.news) {
        benchmarkData.news.forEach(story => {
          personalized.push({ ...story, portfolioImpact: 'Affects your benchmark' })
        })
      }
      holdingGroups.forEach(group => {
        group.news.forEach(story => {
          personalized.push({ ...story, portfolioImpact: `In your portfolio: ${group.name}` })
        })
      })
      return personalized.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    } else {
      const general: PortfolioNewsItem[] = []
      generalNews.forEach(group => {
        group.news.forEach(story => {
          general.push(story)
        })
      })
      return general.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    }
  }, [isPersonalized, anchorData, benchmarkData, holdingGroups, generalNews])

  const headlineStories = useMemo(() => allNews.slice(0, 3), [allNews])
  const regularStories = useMemo(() => allNews.slice(3), [allNews])

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

  const renderStory = (story: PortfolioNewsItem, size: 'headline' | 'regular' = 'regular') => {
    const sentimentClass = sentimentClasses[story.sentiment] ?? sentimentClasses['Neutral']
    const isHeadline = size === 'headline'
    // Use the URL from backend (which should always be provided now)
    // Backend ensures every story has a URL (either from yfinance or Google search fallback)
    const articleUrl = story.url && typeof story.url === 'string' && story.url.startsWith('http') 
      ? story.url 
      : `https://www.google.com/search?q=${encodeURIComponent(`${story.symbol} JSE news`)}`
    
    return (
      <article
        key={story.id}
        className={`border-b-2 border-[#d7d9e5] pb-6 ${isHeadline ? 'mb-8' : 'mb-6'}`}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold text-primary-ink tracking-wider">{story.symbol}</span>
              {story.portfolioImpact && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-purple/10 text-brand-purple text-[10px] font-semibold border border-brand-purple/30">
                  <TrendingUp className="h-3 w-3" />
                  Portfolio
                </span>
              )}
            </div>
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <h3 className={`font-bold text-primary-ink leading-tight mb-3 group-hover:text-brand-purple transition-colors cursor-pointer ${isHeadline ? 'text-2xl' : 'text-lg'}`}>
                {story.headline}
              </h3>
            </a>
          </div>
          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold border ${sentimentClass}`}>
            {story.sentiment}
          </span>
        </div>
        
        <p className={`text-subtle leading-relaxed mb-4 ${isHeadline ? 'text-base' : 'text-sm'}`}>
          {story.summary}
        </p>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted border-t border-[#e7e9f3] pt-3">
          <span className="font-semibold">{renderPublishedDate(story.published_at)}</span>
          {story.topic && (
            <span className="px-2 py-0.5 bg-[#e7e9f3] font-semibold">{story.topic}</span>
          )}
          {story.source && (
            <span className="italic">— {story.source}</span>
          )}
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-purple hover:underline font-semibold cursor-pointer"
          >
            {story.url && story.url.startsWith('http') ? 'Read more' : `View ${story.symbol} news`}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </article>
    )
  }

  const nextEarnings = earningsWatch[0]
  const totalStories = allNews.length

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Newspaper Header */}
      <header className="border-b-4 border-primary-ink mb-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-5xl font-black text-primary-ink tracking-tight mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              THE JSE TIMES
            </h1>
            <p className="text-xs text-muted font-semibold tracking-wider">
              {isPersonalized ? 'PERSONAL EDITION' : 'MARKET EDITION'} • {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {userId && (
              <button
                type="button"
                onClick={() => setIsPersonalized(!isPersonalized)}
                className="px-4 py-2 border border-[#d7d9e5] bg-white text-sm font-semibold text-primary-ink hover:bg-[#f7f8fb] transition"
              >
                {isPersonalized ? 'View All News' : 'Personalize'}
              </button>
            )}
            <button
              type="button"
              onClick={userId && isPersonalized ? fetchPersonalizedNews : fetchLatestNews}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#d7d9e5] bg-white text-sm font-semibold text-primary-ink hover:bg-[#f7f8fb] transition"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-3 bg-brand-coral/10 border-l-4 border-brand-coral px-4 py-3 text-sm text-brand-coral">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-[#d7d9e5]">
          <div>
            <p className="text-xs font-bold text-muted mb-1">TOTAL HEADLINES</p>
            <p className="text-3xl font-black text-primary-ink">{totalStories}</p>
          </div>
          {isPersonalized && (
            <>
              <div>
                <p className="text-xs font-bold text-muted mb-1">HOLDINGS TRACKED</p>
                <p className="text-3xl font-black text-primary-ink">{holdingGroups.length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted mb-1">EARNINGS ON RADAR</p>
                <p className="text-3xl font-black text-primary-ink">{earningsWatch.length}</p>
              </div>
            </>
          )}
          {!isPersonalized && (
            <>
              <div>
                <p className="text-xs font-bold text-muted mb-1">COMPANIES COVERED</p>
                <p className="text-3xl font-black text-primary-ink">{generalNews.length}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted mb-1">MARKET SENTIMENT</p>
                <div className="flex items-center gap-2">
                  {allNews.filter(s => s.sentiment === 'Positive').length > allNews.filter(s => s.sentiment === 'Cautious').length ? (
                    <TrendingUp className="h-6 w-6 text-brand-mint" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-brand-coral" />
                  )}
                  <span className="text-sm font-bold text-primary-ink">MIXED</span>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Newspaper Content - Multi-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column - Headlines */}
        <div className="lg:col-span-8 space-y-8">
          {/* Banner Headlines */}
          <section className="border-b-4 border-primary-ink pb-6 mb-8">
            <h2 className="text-xs font-black text-muted tracking-widest mb-6">LEADING HEADLINES</h2>
            <div className="space-y-8">
              {headlineStories.map(story => renderStory(story, 'headline'))}
            </div>
          </section>

          {/* Regular Stories - 2 Column Layout */}
          <section>
            <h2 className="text-xs font-black text-muted tracking-widest mb-6">MARKET INTELLIGENCE</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {regularStories.slice(0, 10).map(story => renderStory(story, 'regular'))}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Personalized Sections */}
          {isPersonalized && (
            <>
              {anchorHeadline && (
                <section className="border-2 border-[#d7d9e5] p-6 bg-white">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#d7d9e5]">
                    <div>
                      <h3 className="text-xs font-black text-brand-purple tracking-widest mb-1">ANCHOR WATCH</h3>
                      <p className="text-sm font-bold text-primary-ink">{anchorData?.name ?? anchorData?.symbol}</p>
                    </div>
                    <Newspaper className="h-5 w-5 text-brand-purple" />
                  </div>
                  {renderStory({ ...anchorHeadline, portfolioImpact: 'Your anchor stock' }, 'regular')}
                </section>
              )}

              {benchmarkHeadline && (
                <section className="border-2 border-[#d7d9e5] p-6 bg-white">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#d7d9e5]">
                    <div>
                      <h3 className="text-xs font-black text-muted tracking-widest mb-1">BENCHMARK PULSE</h3>
                      <p className="text-sm font-bold text-primary-ink">{benchmarkData?.name ?? benchmarkData?.symbol}</p>
                    </div>
                    <Newspaper className="h-5 w-5 text-muted" />
                  </div>
                  {renderStory({ ...benchmarkHeadline, portfolioImpact: 'Your benchmark' }, 'regular')}
                </section>
              )}

              {shouldRenderScheduleCard && (
                <section className="border-2 border-[#d7d9e5] p-6 bg-white">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#d7d9e5]">
                    <h3 className="text-xs font-black text-primary-ink tracking-widest">EARNINGS CALENDAR</h3>
                    <CalendarDays className="h-5 w-5 text-brand-purple" />
                  </div>
                  {nextEarnings ? (
                    <div className="space-y-3">
                      <div className="border-l-4 border-brand-purple pl-4">
                        <p className="text-lg font-black text-primary-ink mb-1">{nextEarnings.symbol}</p>
                        {nextEarnings.date && (
                          <p className="text-sm font-semibold text-subtle">
                            {new Date(nextEarnings.date).toLocaleDateString('en-ZA', { month: 'long', day: 'numeric' })}
                          </p>
                        )}
                        {nextEarnings.name && (
                          <p className="text-xs text-muted mt-1">{nextEarnings.name}</p>
                        )}
                      </div>
                      <div className="grid gap-4">
                        {scheduleSections.map(({ key, label }) => {
                          const grouped = earningsSchedule[key] ?? []
                          if (grouped.length === 0) return null
                          return (
                            <div key={key} className="border border-[#d7d9e5] p-3">
                              <p className="text-xs font-black text-primary-ink mb-2">{label.toUpperCase()}</p>
                              <ul className="space-y-2 text-xs text-subtle">
                                {grouped.slice(0, 3).map((item) => (
                                  <li key={`${item.symbol}-${item.date}`} className="border-b border-[#e7e9f3] pb-2 last:border-0">
                                    <p className="font-semibold text-primary-ink">{item.symbol}</p>
                                    {item.date && (
                                      <p>{new Date(item.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-subtle">No immediate earnings flagged.</p>
                  )}
                </section>
              )}
            </>
          )}

          {/* Market Summary for General News */}
          {!isPersonalized && (
            <section className="border-2 border-[#d7d9e5] p-6 bg-white">
              <h3 className="text-xs font-black text-primary-ink tracking-widest mb-4 pb-3 border-b-2 border-[#d7d9e5]">MARKET SUMMARY</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-primary-ink mb-1">Positive Sentiment</p>
                  <p className="text-subtle">{allNews.filter(s => s.sentiment === 'Positive').length} stories</p>
                </div>
                <div>
                  <p className="font-semibold text-primary-ink mb-1">Cautious Outlook</p>
                  <p className="text-subtle">{allNews.filter(s => s.sentiment === 'Cautious').length} stories</p>
                </div>
                <div>
                  <p className="font-semibold text-primary-ink mb-1">Neutral Reports</p>
                  <p className="text-subtle">{allNews.filter(s => s.sentiment === 'Neutral').length} stories</p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Holdings by Symbol - Newspaper Style */}
      {isPersonalized && holdingGroups.length > 0 && (
        <section className="border-t-4 border-primary-ink pt-8 mt-12">
          <h2 className="text-xs font-black text-muted tracking-widest mb-6">HOLDINGS IN THE HEADLINES</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {holdingGroups.map((group) => (
              <div key={group.symbol} className="border-2 border-[#d7d9e5] p-6 bg-white">
                <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#d7d9e5]">
                  <div>
                    <h3 className="text-lg font-black text-primary-ink">{group.name}</h3>
                    <p className="text-xs font-semibold text-muted">{group.symbol}</p>
                  </div>
                  <span className="px-3 py-1 bg-brand-mint/15 text-brand-mint text-xs font-bold border border-brand-mint/30">
                    {group.news.length} STORIES
                  </span>
                </div>
                <div className="space-y-6">
                  {group.news.slice(0, 3).map((story) => renderStory({ ...story, portfolioImpact: `In your portfolio: ${group.name}` }, 'regular'))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default News
