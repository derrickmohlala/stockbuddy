import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Star, Info } from 'lucide-react'
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
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [filteredInstruments, setFilteredInstruments] = useState<Instrument[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'etf' | 'share' | 'reit' | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'yield' | 'sector'>('name')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSector, setSelectedSector] = useState('')
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchInstruments()
  }, [])

  useEffect(() => {
    filterInstruments()
  }, [instruments, activeTab, searchTerm, sortBy, selectedSector])

  const fetchInstruments = async () => {
    try {
      const response = await apiFetch('/api/instruments')
      if (response.ok) {
        const data = await response.json()
        setInstruments(data)
      }
    } catch (error) {
      console.error('Error fetching instruments:', error)
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
    if (!instrument.mini_series || instrument.mini_series.length === 0) {
      return (
        <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
          No data
        </div>
      )
    }

    const data = {
      labels: instrument.mini_series.map(point => 
        new Date(point.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          data: instrument.mini_series.map(point => point.close),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    }

    const isDark = theme === 'dark'
    const tooltipBg = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(42,42,42,0.9)'

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-brand-purple border-t-transparent"></div>
          <p className="text-muted">Loading instruments...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="section-surface space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Discover instruments</h1>
          <p className="text-subtle">
            Explore JSE ETFs, shares, and REITs for your portfolio.
          </p>
        </header>

        <div className="surface-card p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search instruments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div className="lg:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-field"
              >
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="yield">Sort by Yield</option>
                <option value="sector">Sort by Sector</option>
              </select>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary justify-center"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="border-t border-soft pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-subtle">
                  Sector
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All sectors</option>
                    {getSectors().map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="surface-card p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { key: 'all', label: 'All', count: instruments.length },
              { key: 'etf', label: 'ETFs', count: instruments.filter(i => i.type === 'etf').length },
              { key: 'share', label: 'Shares', count: instruments.filter(i => i.type === 'share').length },
              { key: 'reit', label: 'REITs', count: instruments.filter(i => i.type === 'reit').length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'border-brand-purple/40 bg-brand-purple/10 text-primary-ink dark:text-tone-primary shadow-card'
                    : 'border-soft bg-white/60 text-muted hover:text-primary-ink dark:bg-white/5'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredInstruments.map(instrument => (
            <div key={instrument.id} className="card">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(instrument.type)}</span>
                  <div>
                    <h3 className="font-semibold text-primary-ink dark:text-tone-primary">
                      {instrument.symbol}
                    </h3>
                    <p className="text-sm text-subtle">
                      {instrument.name}
                    </p>
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
                  <span className="text-2xl font-bold text-primary-ink dark:text-tone-primary">
                    {instrument.latest_price ? formatCurrency(instrument.latest_price) : 'N/A'}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(instrument.type)}`}>
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

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-subtle">Dividend yield</p>
                  <p className="font-semibold text-primary-ink dark:text-tone-primary">
                    {instrument.dividend_yield.toFixed(1)}%
                  </p>
                </div>
                {instrument.ter > 0 && (
                  <div>
                    <p className="text-sm text-subtle">TER</p>
                    <p className="font-semibold text-primary-ink dark:text-tone-primary">
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
                <button className="btn-secondary px-3 py-2 text-sm">
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredInstruments.length === 0 && (
          <div className="rounded-2xl border border-soft bg-white/60 p-10 text-center dark:bg-white/5">
            <p className="text-subtle">
              No instruments found matching your criteria.
            </p>
          </div>
        )}
      </section>
    </>
  )
}

export default Discover
