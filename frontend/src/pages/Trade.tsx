import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Calculator, AlertCircle } from 'lucide-react'
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

interface TradeProps {
  userId: number | null
}

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
  mini_series: Array<{
    date: string
    close: number
  }>
}

const Trade: React.FC<TradeProps> = ({ userId }) => {
  const { theme } = useTheme()
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const [instrument, setInstrument] = useState<Instrument | null>(null)
  const [loading, setLoading] = useState(true)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [totalValue, setTotalValue] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<number>(0)

  useEffect(() => {
    if (symbol) {
      fetchInstrument()
      fetchCurrentPosition()
    }
  }, [symbol, userId])

  useEffect(() => {
    if (quantity && price) {
      setTotalValue(parseFloat(quantity) * parseFloat(price))
    } else {
      setTotalValue(0)
    }
  }, [quantity, price])

  const fetchInstrument = async () => {
    try {
      const response = await apiFetch(`/api/instruments/${symbol}`)
      if (response.ok) {
        const data = await response.json()
        setInstrument(data)
        setPrice(data.latest_price?.toString() || '')
      }
    } catch (error) {
      console.error('Error fetching instrument:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentPosition = async () => {
    if (!userId) return

    try {
      const response = await apiFetch(`/api/portfolio/${userId}`)
      if (response.ok) {
        const data = await response.json()
        const position = data.holdings.find((h: any) => h.symbol === symbol)
        setCurrentPosition(position?.quantity || 0)
      }
    } catch (error) {
      console.error('Error fetching position:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !instrument || !quantity || !price) return

    setSubmitting(true)
    try {
      const response = await apiFetch('/api/trade/sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          symbol: instrument.symbol,
          side: tradeType,
          quantity: parseFloat(quantity),
          price: parseFloat(price)
        })
      })

      if (response.ok) {
        navigate('/portfolio')
      } else {
        console.error('Trade failed')
      }
    } catch (error) {
      console.error('Error executing trade:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const renderChart = () => {
    if (!instrument?.mini_series || instrument.mini_series.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-400">
          No price data available
        </div>
      )
    }

    const data = {
      labels: instrument.mini_series.map(point => 
        new Date(point.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: instrument.symbol,
          data: instrument.mini_series.map(point => point.close),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          tension: 0.1,
        },
      ],
    }

    const isDark = theme === 'dark'
    const axisColor = isDark ? '#dfe6ee' : '#2a2a2a'
    const gridColor = isDark ? 'rgba(223,230,238,0.08)' : 'rgba(0,0,0,0.05)'
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
        y: {
          ticks: {
            callback: function(value: any) {
              return formatCurrency(value)
            },
            color: axisColor,
          },
          grid: {
            color: gridColor,
          }
        },
        x: {
          ticks: { color: axisColor },
          grid: { color: gridColor }
        }
      }
    }

    return (
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted dark:text-gray-300">Loading instrument...</p>
        </div>
      </div>
    )
  }

  if (!instrument) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted dark:text-gray-300">Instrument not found</p>
          <button onClick={() => navigate('/discover')} className="btn-cta mt-4">
            Back to Discover
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/discover')}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100">
              Trade {instrument.symbol}
            </h1>
            <p className="text-muted dark:text-gray-300">
              {instrument.name} • {instrument.type.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-4">
              Price Chart
            </h3>
            {renderChart()}
          </div>

          {/* Trade Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-4">
              Simulated Trade
            </h3>

            {/* Current Position */}
            {currentPosition > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Current Position: {currentPosition.toFixed(2)} shares
                  </span>
                </div>
              </div>
            )}

            {/* Trade Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
                Trade Type
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTradeType('buy')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    tradeType === 'buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-muted dark:text-gray-200 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Buy
                </button>
                <button
                  onClick={() => setTradeType('sell')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    tradeType === 'sell'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-muted dark:text-gray-200 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Sell
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                  placeholder="Enter quantity"
                  required
                />
                <p className="text-xs text-subtle dark:text-muted dark:text-gray-300 mt-1">
                  Fractional shares allowed for educational purposes
                </p>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
                  Price per Share
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-field"
                  placeholder="Enter price"
                  required
                />
                <p className="text-xs text-subtle dark:text-muted dark:text-gray-300 mt-1">
                  Current price: {instrument.latest_price ? formatCurrency(instrument.latest_price) : 'N/A'}
                </p>
              </div>

              {/* Total Value */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300">
                    Total Value:
                  </span>
                  <span className="text-lg font-bold text-brand-ink dark:text-gray-100">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !quantity || !price}
                className="w-full btn-cta disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Executing...' : `Execute ${tradeType.toUpperCase()} Order`}
              </button>
            </form>

            {/* Educational Notice */}
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    Educational Trading
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This is a simulated trade for educational purposes only. 
                    No real money is involved and this is not financial advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instrument Details */}
        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-4">
            Instrument Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted dark:text-gray-300">Symbol</p>
              <p className="font-medium text-brand-ink dark:text-gray-100">{instrument.symbol}</p>
            </div>
            <div>
              <p className="text-sm text-muted dark:text-gray-300">Sector</p>
              <p className="font-medium text-brand-ink dark:text-gray-100">{instrument.sector}</p>
            </div>
            <div>
              <p className="text-sm text-muted dark:text-gray-300">Dividend Yield</p>
              <p className="font-medium text-brand-ink dark:text-gray-100">{instrument.dividend_yield.toFixed(1)}%</p>
            </div>
            {instrument.ter > 0 && (
              <div>
                <p className="text-sm text-muted dark:text-gray-300">TER</p>
                <p className="font-medium text-brand-ink dark:text-gray-100">{instrument.ter.toFixed(2)}%</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Trade
