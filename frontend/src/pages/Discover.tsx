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
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'share':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'reit':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted dark:text-gray-300">Loading instruments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100 mb-2">
            Discover Instruments
          </h1>
          <p className="text-muted dark:text-gray-300">
            Explore JSE ETFs, shares, and REITs for your portfolio
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search instruments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Sort */}
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

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
                    Sector
                  </label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Sectors</option>
                    {getSectors().map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: instruments.length },
            { key: 'etf', label: 'ETFs', count: instruments.filter(i => i.type === 'etf').length },
            { key: 'share', label: 'Shares', count: instruments.filter(i => i.type === 'share').length },
            { key: 'reit', label: 'REITs', count: instruments.filter(i => i.type === 'reit').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-brand-ink dark:text-gray-100 shadow-sm'
                  : 'text-muted dark:text-gray-300 hover:text-brand-ink dark:text-gray-100 dark:hover:text-gray-100'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Instruments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstruments.map(instrument => (
            <div key={instrument.id} className="card hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTypeIcon(instrument.type)}</span>
                  <div>
                    <h3 className="font-semibold text-brand-ink dark:text-gray-100">
                      {instrument.symbol}
                    </h3>
                    <p className="text-sm text-muted dark:text-gray-300">
                      {instrument.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleWatchlist(instrument.symbol)}
                  className={`p-1 rounded-full transition-colors ${
                    watchlist.has(instrument.symbol)
                      ? 'text-yellow-500'
                      : 'text-gray-400 hover:text-yellow-500'
                  }`}
                >
                  <Star className={`w-5 h-5 ${watchlist.has(instrument.symbol) ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Price and Stats */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-brand-ink dark:text-gray-100">
                    {instrument.latest_price ? formatCurrency(instrument.latest_price) : 'N/A'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(instrument.type)}`}>
                    {instrument.type.toUpperCase()}
                  </span>
                </div>
                {instrument.price_date && (
                  <p className="text-sm text-subtle dark:text-muted dark:text-gray-300">
                    Updated {new Date(instrument.price_date).toLocaleDateString('en-ZA')}
                  </p>
                )}
              </div>

              {/* Mini Chart */}
              <div className="mb-4">
                {renderMiniChart(instrument)}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted dark:text-gray-300">Dividend Yield</p>
                  <p className="font-semibold text-brand-ink dark:text-gray-100">
                    {instrument.dividend_yield.toFixed(1)}%
                  </p>
                </div>
                {instrument.ter > 0 && (
                  <div>
                    <p className="text-sm text-muted dark:text-gray-300">TER</p>
                    <p className="font-semibold text-brand-ink dark:text-gray-100">
                      {instrument.ter.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/trade/${instrument.symbol}`)}
                  className="flex-1 btn-cta text-sm py-2"
                >
                  Trade
                </button>
                <button className="btn-secondary text-sm py-2 px-3">
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredInstruments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted dark:text-gray-300">
              No instruments found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Discover
