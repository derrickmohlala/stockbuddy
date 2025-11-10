import React, { useState } from 'react'
import { BookOpen, Calculator, TrendingUp, Shield, Globe, Building2 } from 'lucide-react'

const Learn: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('basics')

  const categories = [
    { id: 'basics', name: 'Investment Basics', icon: BookOpen },
    { id: 'calculations', name: 'Key Calculations', icon: Calculator },
    { id: 'strategies', name: 'Investment Strategies', icon: TrendingUp },
    { id: 'risks', name: 'Risk Management', icon: Shield },
    { id: 'markets', name: 'SA Markets', icon: Globe },
    { id: 'instruments', name: 'Instruments', icon: Building2 },
  ]

  const content = {
    basics: [
      {
        title: 'What is Investing?',
        content: 'Investing is the act of allocating money with the expectation of generating income or profit. In South Africa, common investment options include shares, ETFs, REITs, and bonds.'
      },
      {
        title: 'Risk vs Return',
        content: 'Generally, higher potential returns come with higher risk. Understanding your risk tolerance is crucial for building a suitable portfolio.'
      },
      {
        title: 'Diversification',
        content: 'Spreading your investments across different assets, sectors, and companies to reduce risk. The saying "don\'t put all your eggs in one basket" applies here.'
      },
      {
        title: 'Time Horizon',
        content: 'The length of time you plan to hold your investments. Longer time horizons generally allow for more aggressive strategies.'
      }
    ],
    calculations: [
      {
        title: 'Price to-Earnings (P/E) Ratio',
        content: 'P/E = Share Price ÷ Earnings per Share. A lower P/E might indicate undervaluation, but context matters.'
      },
      {
        title: 'Dividend Yield',
        content: 'Dividend Yield = Annual Dividends ÷ Share Price × 100. Shows the percentage return from dividends alone.'
      },
      {
        title: 'Total Expense Ratio (TER)',
        content: 'TER = Total Fund Costs ÷ Average Net Assets × 100. Lower TERs mean more of your money stays invested.'
      },
      {
        title: 'Compound Annual Growth Rate (CAGR)',
        content: 'CAGR = (Ending Value ÷ Beginning Value)^(1 ÷ Years) - 1. Shows the average annual growth rate.'
      }
    ],
    strategies: [
      {
        title: 'Growth Investing',
        content: 'Focus on companies expected to grow faster than the market average. Higher risk, higher potential returns.'
      },
      {
        title: 'Value Investing',
        content: 'Looking for undervalued companies trading below their intrinsic value. Requires patience and research.'
      },
      {
        title: 'Income Investing',
        content: 'Focus on generating regular income through dividends. Often includes REITs and dividend paying shares.'
      },
      {
        title: 'Index Investing',
        content: 'Investing in ETFs that track market indices like the JSE Top 40. Lower costs, broad diversification.'
      }
    ],
    risks: [
      {
        title: 'Market Risk',
        content: 'The risk that the entire market will decline. Diversification helps mitigate this risk.'
      },
      {
        title: 'Company Specific Risk',
        content: 'Risk associated with individual companies. Reduced through diversification across many companies.'
      },
      {
        title: 'Sector Risk',
        content: 'Risk that an entire sector (like mining or banking) will underperform. Sector diversification helps.'
      },
      {
        title: 'Currency Risk',
        content: 'Risk from currency fluctuations when investing internationally. Consider hedging strategies.'
      }
    ],
    markets: [
      {
        title: 'JSE Overview',
        content: 'The Johannesburg Stock Exchange is Africa\'s largest stock exchange, home to major South African companies.'
      },
      {
        title: 'Top 40 Index',
        content: 'The 40 largest companies by market cap on the JSE. Often used as a benchmark for SA equity performance.'
      },
      {
        title: 'Sector Breakdown',
        content: 'Major sectors include Financials, Resources, Industrials, and Consumer Services. Each has different risk profiles.'
      },
      {
        title: 'Economic Factors',
        content: 'SA investments are influenced by factors like commodity prices, interest rates, and political stability.'
      }
    ],
    instruments: [
      {
        title: 'Exchange Traded Funds (ETFs)',
        content: 'ETFs track indices or baskets of securities. They offer diversification, low costs, and easy trading.'
      },
      {
        title: 'Real Estate Investment Trusts (REITs)',
        content: 'REITs invest in real estate and must distribute most profits as dividends. Good for income focused investors.'
      },
      {
        title: 'Individual Shares',
        content: 'Direct ownership in companies. Higher potential returns but also higher risk and requires more research.'
      },
      {
        title: 'Unit Trusts',
        content: 'Managed funds that pool money from many investors. Professional management but higher fees than ETFs.'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100 mb-2">
            Learn About Investing
          </h1>
          <p className="text-muted dark:text-gray-300">
            Build your financial literacy with our educational content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-4">
                Topics
              </h3>
              <nav className="space-y-2">
                {categories.map(category => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeCategory === category.id
                          ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'text-muted dark:text-gray-200 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="card">
              <h2 className="text-2xl font-bold text-brand-ink dark:text-gray-100 mb-6">
                {categories.find(c => c.id === activeCategory)?.name}
              </h2>
              
              <div className="space-y-6">
                {content[activeCategory as keyof typeof content]?.map((item, index) => (
                  <div key={index} className="border-l-4 border-primary-500 pl-6">
                    <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted dark:text-gray-200 dark:text-gray-300 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Educational Disclaimer */}
            <div className="mt-6 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">ℹ</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Educational Content Notice
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This content is for educational purposes only and should not be considered as financial advice. 
                    Always consult with a qualified financial advisor before making investment decisions.
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

export default Learn
