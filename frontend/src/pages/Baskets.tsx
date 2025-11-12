import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, TrendingUp, Users, CheckCircle, ArrowRight } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { Doughnut } from 'react-chartjs-2'
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

interface BasketsProps {
  userId: number | null
}

interface Basket {
  id: number
  code: string
  name: string
  goal: string
  description: string
  allocations: Record<string, number>
}

const Baskets: React.FC<BasketsProps> = ({ userId }) => {
  const navigate = useNavigate()
  const [baskets, setBaskets] = useState<Basket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<string>('')

  useEffect(() => {
    fetchBaskets()
  }, [])

  const fetchBaskets = async () => {
    try {
      const response = await apiFetch('/api/baskets')
      if (response.ok) {
        const data = await response.json()
        setBaskets(data)
      }
    } catch (error) {
      console.error('Error fetching baskets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdoptBasket = async (basketId: number) => {
    if (!userId) return

    try {
      const response = await apiFetch('/api/portfolio/apply-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          basket_id: basketId
        })
      })

      if (response.ok) {
        navigate('/portfolio')
      }
    } catch (error) {
      console.error('Error adopting basket:', error)
    }
  }

  const getGoalIcon = (goal: string) => {
    switch (goal) {
      case 'growth':
        return <TrendingUp className="w-6 h-6 text-green-600" />
      case 'balanced':
        return <PieChart className="w-6 h-6 text-blue-600" />
      case 'income':
        return <Users className="w-6 h-6 text-purple-600" />
      default:
        return <PieChart className="w-6 h-6 text-muted dark:text-gray-300" />
    }
  }

  const getGoalColor = (goal: string) => {
    switch (goal) {
      case 'growth':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      case 'balanced':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
      case 'income':
        return 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
    }
  }

  const renderAllocationChart = (allocations: Record<string, number>) => {
    const labels = Object.keys(allocations)
    const data = Object.values(allocations)

    const chartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#0ea5e9',
            '#22c55e',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#06b6d4',
            '#84cc16',
            '#f97316',
          ],
        },
      ],
    }

    const legendColor = '#2a2a2a'
    const tooltipBg = 'rgba(42,42,42,0.9)'

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            boxWidth: 12,
            font: { size: 10 },
            color: legendColor,
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: 'transparent',
          borderWidth: 0,
          callbacks: {
            label: (context: any) => `${context.label}: ${context.parsed}%`
          }
        }
      }
    }

    return (
      <div className="h-48">
        <Doughnut data={chartData} options={options} />
      </div>
    )
  }

  const filteredBaskets = selectedGoal 
    ? baskets.filter(basket => basket.goal === selectedGoal)
    : baskets

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted dark:text-gray-300">Loading baskets...</p>
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
            Model Baskets
          </h1>
          <p className="text-muted dark:text-gray-300">
            Curated portfolios designed by investment professionals
          </p>
        </div>

        {/* Goal Filter */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedGoal('')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGoal === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-muted dark:text-gray-200 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All Baskets
            </button>
            {['growth', 'balanced', 'income'].map(goal => (
              <button
                key={goal}
                onClick={() => setSelectedGoal(goal)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  selectedGoal === goal
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-muted dark:text-gray-200 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Baskets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredBaskets.map(basket => (
            <div key={basket.id} className={`card border-2 ${getGoalColor(basket.goal)}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getGoalIcon(basket.goal)}
                  <div>
                    <h3 className="text-xl font-bold text-brand-ink dark:text-gray-100">
                      {basket.name}
                    </h3>
                    <p className="text-sm text-muted dark:text-gray-300 capitalize">
                      {basket.goal} strategy
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
                  {basket.code}
                </span>
              </div>

              {/* Description */}
              <p className="text-muted dark:text-gray-200 dark:text-gray-300 mb-6">
                {basket.description}
              </p>

              {/* Allocation Chart */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-3">
                  Allocation Breakdown
                </h4>
                {renderAllocationChart(basket.allocations)}
              </div>

              {/* Holdings List */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-3">
                  Holdings
                </h4>
                <div className="space-y-2">
                  {Object.entries(basket.allocations).map(([symbol, weight]) => (
                    <div key={symbol} className="flex justify-between items-center">
                      <span className="text-sm text-muted dark:text-gray-300">
                        {symbol}
                      </span>
                      <span className="text-sm font-medium text-brand-ink dark:text-gray-100">
                        {weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <div className="flex items-center space-x-4 text-sm text-muted dark:text-gray-300">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Diversified</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Risk Managed</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>SA Focused</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleAdoptBasket(basket.id)}
                  className="flex-1 btn-cta flex items-center justify-center space-x-2"
                >
                  <span>Adopt Basket</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button className="btn-secondary px-4">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredBaskets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted dark:text-gray-300">
              No baskets found for the selected criteria
            </p>
          </div>
        )}

        {/* Educational Note */}
        <div className="mt-8 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 dark:text-blue-400 text-sm">ℹ</span>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                About Model Baskets
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                These baskets are designed for educational purposes and represent different investment strategies. 
                They are not recommendations and should not be considered as financial advice. 
                Always do your own research before making any investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Baskets
