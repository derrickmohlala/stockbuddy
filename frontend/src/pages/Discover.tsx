import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Star, Info } from 'lucide-react'
import { Line } from 'react-chartjs-2'
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
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface Instrument {
  id: number
  symbol: string
  name: string
  type: string
  sector: string
  dividend_yield: number
  ter: number
  latest_price: number | null
  price_date: string | null
  mini_series?: Array<{
    date: string
    close: number
  }>
}

const Discover: React.FC = () => {
  const navigate = useNavigate()
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [filteredInstruments, setFilteredInstruments] = useState<Instrument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'etf' | 'share' | 'reit' | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'yield' | 'sector'>('name')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSector, setSelectedSector] = useState('')
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())
  const [refreshingPrices, setRefreshingPrices] = useState(false)

  useEffect(() => {
    fetchInstruments()
  }, [])

  // Fetch prices in background after instruments load
  useEffect(() => {
    if (instruments.length > 0 && !refreshingPrices) {
      // Check if any instruments are missing prices
      const instrumentsWithoutPrices = instruments.filter(i => !i.latest_price)
      if (instrumentsWithoutPrices.length > 0) {
        // Auto-fetch prices in background after a short delay
        const timer = setTimeout(() => {
          refreshPrices()
        }, 2000) // Wait 2 seconds before auto-fetching
        
        return () => clearTimeout(timer)
      }
    }
  }, [instruments])

  const refreshPrices = async () => {
    setRefreshingPrices(true)
    try {
      const response = await apiFetch('/api/instruments/fetch-prices', {
        method: 'POST'
      })
      if (response.ok) {
        // Refresh instruments after prices are fetched
        await fetchInstruments()
      }
    } catch (err) {
      console.error('Error refreshing prices:', err)
    } finally {
      setRefreshingPrices(false)
    }
  }

  useEffect(() => {
    filterInstruments()
  }, [instruments, activeTab, searchTerm, sortBy, selectedSector])

  const fetchInstruments = async () => {
    try {
      setError(null)
      const response = await apiFetch('/api/instruments')
      if (response.ok) {
        const data = await response.json()
        setInstruments(data || [])
        if (!data || data.length === 0) {
          setError('No instruments found. Please seed the database with instruments.')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch instruments' }))
        setError(errorData.error || 'Failed to load instruments')
      }
    } catch (error) {
      console.error('Error fetching instruments:', error)
      setError('Failed to connect to the server. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const filterInstruments = () => {
    let filtered = instruments

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(instrument => instrument.type === activeTab)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(instrument =>
        instrument.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instrument.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by sector
    if (selectedSector) {
      filtered = filtered.filter(instrument => instrument.sector === selectedSector)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price':
          return (b.latest_price || 0) - (a.latest_price || 0)
        case 'yield':
          return b.dividend_yield - a.dividend_yield
        case 'sector':
          return a.sector.localeCompare(b.sector)
        default:
          return 0
      }
    })

    setFilteredInstruments(filtered)
  }

  const toggleWatchlist = (symbol: string) => {
    const newWatchlist = new Set(watchlist)
    if (newWatchlist.has(symbol)) {
      newWatchlist.delete(symbol)
    } else {
      newWatchlist.add(symbol)
    }
    setWatchlist(newWatchlist)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getSectors = () => {
    const sectors = Array.from(new Set(instruments.map(i => i.sector).filter(Boolean)))
    return sectors.sort()
  }

  const renderMiniChart = (instrument: Instrument) => {
    // Check if we have valid price data
    if (!instrument.mini_series || instrument.mini_series.length === 0 || !instrument.latest_price) {
      return (
        <div className="h-16 flex items-center justify-center text-muted text-xs">
          No price data available
        </div>
      )
    }

    // Filter out invalid data points
    const validSeries = instrument.mini_series.filter(point => 
      point && point.date && typeof point.close === 'number' && !isNaN(point.close)
    )

    if (validSeries.length === 0) {
      return (
        <div className="h-16 flex items-center justify-center text-muted text-xs">
          No price data available
        </div>
      )
    }

    const data = {
      labels: validSeries.map(point => 
        new Date(point.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          data: validSeries.map(point => point.close),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          tension: 0.1,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(42,42,42,0.9)',
          borderColor: 'transparent',
          borderWidth: 0,
          callbacks: {
            label: (context: any) => formatCurrency(context.parsed.y)
          }
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      },
      elements: {
        point: { radius: 0 }
      }
    }

    return (
      <div className="h-16">
        <Line data={data} options={options} />
      </div>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'etf':
        return '📊'
      case 'share':
        return '🏢'
      case 'reit':
        return '🏠'
      default:
        return '📈'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'etf':
        return 'bg-brand-purple/15 text-brand-purple'
      case 'share':
        return 'bg-brand-mint/15 text-brand-mint'
      case 'reit':
        return 'bg-brand-gold/20 text-brand-gold'
      default:
        return 'bg-white/40 text-muted'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-brand-purple border-t-transparent"></div>
          <p className="text-subtle">Loading instruments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md space-y-4 rounded-[28px] border border-[#e7e9f3] bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-coral/10">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-primary-ink">Unable to load instruments</h2>
          <p className="text-subtle">{error}</p>
          <button
            onClick={fetchInstruments}
            className="btn-cta mt-4 px-6 py-2"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-[44px] border border-[#e7e9f3] bg-white px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-1 text-xs font-semibold text-muted">
              Paper trading studio
            </span>
            <h1 className="text-4xl font-semibold text-primary-ink">
              Explore JSE instruments and practice paper trading.
            </h1>
            <p className="text-lg text-subtle">
              Browse ETFs, shares, and REITs with live prices. Execute simulated trades to build your virtual portfolio — no real money involved.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted">
              <span>Filters stay in sync across tabs</span>
              <span>Includes ETFs, shares, and REITs</span>
            </div>
          </div>
          <div className="space-y-4 rounded-[28px] border border-[#e7e9f3] bg-white px-5 py-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary-ink">Market mood board</p>
              <button
                onClick={refreshPrices}
                disabled={refreshingPrices}
                className="text-xs text-muted hover:text-brand-coral transition disabled:opacity-50"
              >
                {refreshingPrices ? 'Refreshing...' : 'Refresh prices'}
              </button>
            </div>
            <div className="grid gap-4 text-sm text-subtle">
              <div className="flex items-center justify-between">
                <span>Top dividend move today</span>
                <span className="rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-brand-gold">+4.1%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Largest ETF inflow (week)</span>
                <span className="rounded-full bg-brand-mint/15 px-3 py-1 text-xs font-semibold text-brand-mint">Satrix 40</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Watchlist sentiment</span>
                <span className="rounded-full bg-brand-coral/10 px-3 py-1 text-xs font-semibold text-brand-coral">Cautiously bullish</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-12 px-4">
        <div className="rounded-[32px] border border-[#e7e9f3] bg-white px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search instruments or tickers"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-full border border-[#e7e9f3] bg-white px-12 py-3 text-sm text-primary-ink focus:border-brand-coral/40 focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[340px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3 text-sm text-primary-ink focus:border-brand-coral/40 focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              >
                <option value="name">Sort by name</option>
                <option value="price">Sort by price</option>
                <option value="yield">Sort by dividend yield</option>
                <option value="sector">Sort by sector</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e7e9f3] px-4 py-3 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide filters' : 'Advanced filters'}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 grid gap-4 border-t border-[#e7e9f3] pt-6 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-primary-ink">
                Sector
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3 text-sm text-primary-ink focus:border-brand-coral/40 focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                >
                  <option value="">All sectors</option>
                  {getSectors().map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            { key: 'all', label: 'All', count: instruments.length },
            { key: 'etf', label: 'ETFs', count: instruments.filter(i => i.type === 'etf').length },
            { key: 'share', label: 'Shares', count: instruments.filter(i => i.type === 'share').length },
            { key: 'reit', label: 'REITs', count: instruments.filter(i => i.type === 'reit').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-brand-coral bg-brand-coral text-white'
                  : 'border-[#e7e9f3] bg-white text-muted hover:border-brand-coral/40 hover:text-brand-coral'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredInstruments.map(instrument => (
            <div key={instrument.id} className="rounded-[28px] border border-[#e7e9f3] bg-white px-5 py-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(instrument.type)}</span>
                  <div>
                    <h3 className="text-base font-semibold text-primary-ink">{instrument.symbol}</h3>
                    <p className="text-sm text-subtle">{instrument.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleWatchlist(instrument.symbol)}
                  className={`rounded-full p-1 transition ${
                    watchlist.has(instrument.symbol)
                      ? 'text-brand-gold'
                      : 'text-muted hover:text-brand-gold'
                  }`}
                  aria-label={watchlist.has(instrument.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <Star className={`h-5 w-5 ${watchlist.has(instrument.symbol) ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="mb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold text-primary-ink">
                    {instrument.latest_price ? formatCurrency(instrument.latest_price) : 'N/A'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeColor(instrument.type)}`}>
                    {instrument.type.toUpperCase()}
                  </span>
                </div>
                {instrument.price_date && (
                  <p className="text-xs text-subtle">
                    Updated {new Date(instrument.price_date).toLocaleDateString('en-ZA')}
                  </p>
                )}
              </div>

              <div className="mb-4">
                {renderMiniChart(instrument)}
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-subtle">
                <div>
                  <p className="text-xs font-semibold text-muted">Dividend yield</p>
                  <p className="mt-1 text-base font-semibold text-primary-ink">
                    {instrument.dividend_yield.toFixed(1)}%
                  </p>
                </div>
                {instrument.ter > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted">TER</p>
                    <p className="mt-1 text-base font-semibold text-primary-ink">
                      {instrument.ter.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/trade/${instrument.symbol}`)}
                  className="btn-cta flex-1 px-4 py-2 text-sm"
                >
                  Trade
                </button>
                <button className="inline-flex items-center justify-center rounded-full border border-[#e7e9f3] px-3 py-2 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral">
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredInstruments.length === 0 && (
          <div className="rounded-[28px] border border-[#e7e9f3] bg-white px-6 py-12 text-center">
            <p className="text-subtle">No instruments found matching your criteria.</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default Discover
