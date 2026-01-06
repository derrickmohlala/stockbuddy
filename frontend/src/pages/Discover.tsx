import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Search, Filter, Star, Info, X } from 'lucide-react'
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
  const { user } = useAuth()
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

  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false)

  // Modal States
  const [selectedForAdd, setSelectedForAdd] = useState<Instrument | null>(null)
  const [addQuantity, setAddQuantity] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addingPosition, setAddingPosition] = useState(false)

  const [selectedForChart, setSelectedForChart] = useState<Instrument | null>(null)

  useEffect(() => {
    fetchInstruments()
  }, [])

  // Fetch prices in background after instruments load
  // Only attempt auto-refresh once to avoid infinite loops if prices are permanently unavailable
  useEffect(() => {
    if (instruments.length > 0 && !refreshingPrices && !hasAutoRefreshed) {
      const instrumentsWithoutPrices = instruments.filter(i => i.latest_price == null)
      if (instrumentsWithoutPrices.length > 0) {
        setHasAutoRefreshed(true)
        const timer = setTimeout(() => {
          refreshPrices()
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [instruments, refreshingPrices, hasAutoRefreshed])

  const refreshPrices = async () => {
    setRefreshingPrices(true)
    try {
      const response = await apiFetch('/api/instruments/fetch-prices', {
        method: 'POST',
      })
      if (response.ok) {
        await fetchInstruments()
      }
    } catch (err) {
      console.error('Error refreshing prices:', err)
    } finally {
      setRefreshingPrices(false)
    }
  }

  const handleAddPosition = async () => {
    if (!selectedForAdd || !user || !addQuantity || !addPrice) return
    setAddingPosition(true)
    try {
      const response = await apiFetch('/api/trade/sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          symbol: selectedForAdd.symbol,
          side: 'buy',
          quantity: parseFloat(addQuantity),
          price: parseFloat(addPrice)
        })
      })
      if (response.ok) {
        alert("Position added to portfolio!")
        setSelectedForAdd(null)
      } else {
        const err = await response.json()
        alert(err.error || "Failed to add position")
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAddingPosition(false)
    }
  }

  useEffect(() => {
    filterInstruments()
  }, [instruments, activeTab, searchTerm, sortBy, selectedSector])

  const fetchInstruments = async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await apiFetch('/api/instruments')

      if (response.ok) {
        const raw = await response.json()

        // Normalise API data so the UI never explodes on nulls
        const data: Instrument[] = (raw || []).map((item: any, idx: number) => ({
          id: item.id ?? idx,
          symbol: String(item.symbol || '').toUpperCase(),
          name: item.name || item.symbol || 'Unknown instrument',
          type: item.type || 'share',
          sector: item.sector || 'Unclassified',
          dividend_yield:
            typeof item.dividend_yield === 'number' && !isNaN(item.dividend_yield)
              ? item.dividend_yield
              : 0,
          ter:
            typeof item.ter === 'number' && !isNaN(item.ter)
              ? item.ter
              : 0,
          latest_price:
            typeof item.latest_price === 'number' && !isNaN(item.latest_price)
              ? item.latest_price
              : null,
          price_date: item.price_date || null,
          mini_series: Array.isArray(item.mini_series) ? item.mini_series : [],
        }))

        setInstruments(data || [])
        if (!data || data.length === 0) {
          setError('No instruments found. Please seed the database with instruments.')
        } else {
          setError(null)
        }
      } else {
        // HTTP error response
        let errorMessage = 'Failed to load instruments'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch (e) {
          errorMessage = `Server error (${response.status}): ${response.statusText || 'Unable to load instruments'
            }`
        }
        setError(errorMessage)
        console.error('HTTP error fetching instruments:', response.status, errorMessage)
      }
    } catch (error: any) {
      console.error('Error fetching instruments:', error)

      let errorMessage = 'Failed to connect to the server. '
      const renderUrl = import.meta.env.VITE_API_BASE_URL
      const isRenderBackend = renderUrl?.includes('onrender.com')

      if (error?.message) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          if (isRenderBackend) {
            errorMessage +=
              'The Render backend may be slow to wake up (free tier). Please wait a moment and try again.'
          } else {
            errorMessage += 'Please ensure the backend server is running on port 5001.'
          }
        } else if (error.message.includes('timeout')) {
          if (isRenderBackend) {
            errorMessage +=
              'Render backend is taking too long to respond. Free tier services can be slow. Please try again.'
          } else {
            errorMessage += 'The request timed out. Please try again.'
          }
        } else {
          errorMessage += error.message
        }
      } else {
        if (isRenderBackend) {
          errorMessage +=
            'Please check your connection. Render backends can take 30-60 seconds to wake up from sleep.'
        } else {
          errorMessage +=
            'Please check your connection and ensure the backend server is running.'
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const filterInstruments = () => {
    let filtered = [...instruments]

    // Filter by type
    if (activeTab !== 'all') {
      filtered = filtered.filter(instrument => instrument.type === activeTab)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(instrument =>
        (instrument.name || '').toLowerCase().includes(q) ||
        (instrument.symbol || '').toLowerCase().includes(q)
      )
    }

    // Filter by sector
    if (selectedSector) {
      filtered = filtered.filter(instrument => instrument.sector === selectedSector)
    }

    // Sort with null-safe access
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '')
        case 'price':
          return (b.latest_price ?? 0) - (a.latest_price ?? 0)
        case 'yield': {
          const ay = a.dividend_yield ?? 0
          const by = b.dividend_yield ?? 0
          return by - ay
        }
        case 'sector':
          return (a.sector || '').localeCompare(b.sector || '')
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
    const sectors = Array.from(
      new Set(
        instruments
          .map(i => i.sector)
          .filter(Boolean)
      )
    )
    return sectors.sort()
  }

  const renderMiniChart = (instrument: Instrument) => {
    // Check if we have valid price data
    if (!instrument.mini_series || instrument.mini_series.length === 0) {
      return (
        <div className="h-16 flex items-center justify-center text-muted text-xs">
          No price data available
        </div>
      )
    }

    // Filter out invalid data points & limit to last 1 year
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const validSeries = instrument.mini_series.filter(point =>
      point &&
      point.date &&
      typeof point.close === 'number' &&
      !isNaN(point.close) &&
      new Date(point.date) >= oneYearAgo
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
            label: (context: any) => formatCurrency(context.parsed.y),
          },
        },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      elements: {
        point: { radius: 0 },
      },
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
        return 'bg-brand-coral/15 text-brand-coral'
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
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-brand-coral border-t-transparent"></div>
          <p className="text-subtle">Loading instruments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isConnectionError = error.toLowerCase().includes('connect') || error.toLowerCase().includes('server')
    const hasRenderUrl = import.meta.env.VITE_API_BASE_URL?.includes('onrender.com')
    const isLocalDev = !import.meta.env.VITE_API_BASE_URL || import.meta.env.DEV

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md space-y-4 rounded-[28px] border border-[#e7e9f3] bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-coral/10">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-primary-ink">Unable to load instruments</h2>
          <p className="text-subtle">{error}</p>
          {isConnectionError && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left text-sm text-muted">
              <p className="font-semibold mb-2">Troubleshooting:</p>
              {hasRenderUrl ? (
                <ul className="list-disc list-inside space-y-1">
                  <li>Your backend is configured to use Render: <code className="bg-white px-1 rounded">{import.meta.env.VITE_API_BASE_URL}</code></li>
                  <li>Verify the Render backend service is running and accessible</li>
                  <li>Check Render dashboard for any service errors or downtime</li>
                  <li>Render free tier services can take 30-60 seconds to wake up from sleep</li>
                </ul>
              ) : isLocalDev ? (
                <ul className="list-disc list-inside space-y-1">
                  <li>For local development: Start backend with <code className="bg-white px-1 rounded">cd backend && python3 app.py</code></li>
                  <li>Backend should be accessible at <code className="bg-white px-1 rounded">http://localhost:5001</code></li>
                  <li>For Render deployment: Create <code className="bg-white px-1 rounded">frontend/.env</code> with <code className="bg-white px-1 rounded">VITE_API_BASE_URL=https://your-backend.onrender.com</code></li>
                  <li>Current API URL: <code className="bg-white px-1 rounded">{import.meta.env.VITE_API_BASE_URL || 'Not set (using proxy)'}</code></li>
                </ul>
              ) : null}
            </div>
          )}
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
              Instrument Explorer
            </span>
            <h1 className="text-4xl font-semibold text-primary-ink">
              Explore JSE instruments for your portfolio.
            </h1>
            <p className="text-lg text-subtle">
              Browse ETFs, shares, and REITs with live prices. Add instruments to your portfolio to track performance and allocation.
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
                  className="h-12 w-full rounded-full border border-[#e7e9f3] bg-white px-12 text-sm text-primary-ink focus:border-brand-coral/40 focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[340px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-12 rounded-2xl border border-[#e7e9f3] bg-white px-4 text-sm text-primary-ink focus:border-brand-coral/40 focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              >
                <option value="name">Sort by name</option>
                <option value="price">Sort by price</option>
                <option value="yield">Sort by dividend yield</option>
                <option value="sector">Sort by sector</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e7e9f3] px-4 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
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
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key
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
                  className={`rounded-full p-1 transition ${watchlist.has(instrument.symbol)
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
                    {instrument.latest_price != null ? formatCurrency(instrument.latest_price) : 'N/A'}
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
                    {(instrument.dividend_yield ?? 0).toFixed(1)}%
                  </p>
                </div>
                {(instrument.ter ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted">TER</p>
                    <p className="mt-1 text-base font-semibold text-primary-ink">
                      {(instrument.ter ?? 0).toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedForAdd(instrument)
                    setAddPrice(instrument.latest_price?.toString() || '')
                    setAddQuantity('')
                  }}
                  className="btn-cta flex-1 px-4 py-2 text-sm"
                >
                  Add to Portfolio
                </button>
                <button
                  onClick={() => setSelectedForChart(instrument)}
                  className="inline-flex items-center justify-center rounded-full border border-[#e7e9f3] px-3 py-2 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
                >
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

      {/* Add Position Modal */}
      {selectedForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary-ink">Add to Portfolio</h3>
              <button onClick={() => setSelectedForAdd(null)} className="rounded-full p-2 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-subtle">Instrument</label>
                <div className="font-semibold text-primary-ink">{selectedForAdd.symbol} - {selectedForAdd.name}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-subtle">Price per share (R)</label>
                <input
                  type="number"
                  value={addPrice}
                  onChange={e => setAddPrice(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#e7e9f3] px-4"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-subtle">Quantity</label>
                <input
                  type="number"
                  value={addQuantity}
                  onChange={e => setAddQuantity(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#e7e9f3] px-4"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={handleAddPosition}
                  disabled={addingPosition || !addQuantity || !addPrice}
                  className="btn-cta w-full py-3 disabled:opacity-50"
                >
                  {addingPosition ? 'Adding...' : 'Add Position'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Modal */}
      {selectedForChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-[32px] bg-white p-6 shadow-2xl">
            <button
              onClick={() => setSelectedForChart(null)}
              className="absolute right-6 top-6 z-10 rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold text-primary-ink">{selectedForChart.symbol} - Price History</h3>
              <p className="text-sm text-subtle">Past 12 Months Performance</p>
            </div>
            <div className="h-[400px] w-full">
              {(() => {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                const validSeries = (selectedForChart.mini_series || []).filter(point =>
                  point && point.date && typeof point.close === 'number' && !isNaN(point.close) && new Date(point.date) >= oneYearAgo
                );

                if (!validSeries.length) return <div className="flex h-full items-center justify-center text-muted">No Data Available</div>;

                return <Line
                  data={{
                    labels: validSeries.map(p => new Date(p.date).toLocaleDateString()),
                    datasets: [{
                      label: 'Close Price',
                      data: validSeries.map(p => p.close),
                      borderColor: '#0ea5e9',
                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      fill: true,
                      tension: 0.2,
                      pointRadius: 0,
                      pointHitRadius: 10
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    scales: { x: { display: true, grid: { display: false } }, y: { display: true } }
                  }}
                />;
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
    </div >
  )
}

export default Discover