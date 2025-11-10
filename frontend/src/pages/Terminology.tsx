interface GlossaryEntry {
  term: string
  definition: string
  analogy?: string
}

interface GlossaryCategory {
  key: string
  title: string
  description: string
  entries: GlossaryEntry[]
}

import React from 'react'

const glossaryCategories: GlossaryCategory[] = [
  {
    key: 'portfolio-basics',
    title: 'Portfolio Building Blocks',
    description: 'Core lingo you will see across StockBuddy — from sleeves to debit orders.',
    entries: [
      {
        term: 'Sleeve weight',
        definition:
          'The target percentage of your portfolio allocated to a specific sleeve (e.g. Growth SA shares or Offshore ETFs). We normalise sleeve weights so they add up to 100% unless you customise them.',
        analogy:
          'Picture a bunny chow: sleeve weights decide how much curry, how much bread. You don’t want all fillings spilling out one side!',
      },
      {
        term: 'Sleeve yield',
        definition:
          'The weighted dividend income expected from the instruments inside a sleeve, expressed as a percentage per year.',
        analogy: 'Imagine blending juices: each sleeve adds its own sweetness; sleeve yield tells you how sugary the final mix is.',
      },
      {
        term: 'Indicative yield',
        definition:
          'The latest distribution yield reported for an instrument. Helpful for estimating expected cash flow before you buy.',
        analogy: 'It’s the price tag on a mielie at the market – tells you roughly how sweet the haul will be before you take a bite.',
      },
      {
        term: 'Asset allocation',
        definition:
          'The mix of asset classes (equities, property, cash, etc.) in a portfolio. Allocation drives most of your long term return and volatility.',
        analogy: 'It’s the balance of pap, salad, and vleis on your braai plate — too much of one and the meal feels lopsided.',
      },
      {
        term: 'Diversification',
        definition:
          'Owning a variety of assets so no single setback derails the plan.',
        analogy: 'It’s packing both a jersey and sunscreen for Cape Town — whatever the weather does, you’re prepared.',
      },
      {
        term: 'Debit order investing',
        definition:
          'Monthly contributions that automate saving into the market. Great for rand cost averaging and smoothing out timing risk.',
        analogy: 'It’s like buying airtime every payday automatically – small top ups that keep the calls (investing) going without stressing.',
      },
      {
        term: 'Compound interest',
        definition:
          'Interest that accrues on both your original capital and the interest already earned. Over time it accelerates growth.',
        analogy: 'It’s a snowball rolling down Table Mountain – every rotation picks up more snow, so the ball grows faster the longer it rolls.',
      },
      {
        term: 'Total expense ratio (TER)',
        definition:
          'The annual cost of running an ETF or unit trust, expressed as a percentage of assets. Lower TER leaves more return in your pocket.',
        analogy: 'Think of TER as the admin fee at the toll plaza – the less you pay, the more petrol you keep for the trip.',
      },
      {
        term: 'Inflation',
        definition:
          'The rise in the general cost of goods and services, often tracked by CPI. Your portfolio should aim to beat inflation to protect buying power.',
        analogy: 'Inflation is like Cape Town parking fees creeping up every season – if your salary/investments don’t rise, you’ll be walking further.',
      }
    ]
  },
  {
    key: 'statistical',
    title: 'Statistical & Risk Metrics',
    description: 'Return, risk and consistency measures you’ll see on performance charts.',
    entries: [
      {
        term: 'Return',
        definition:
          'The percentage gain or loss on your portfolio over a period, expressed in rand terms.',
        analogy: 'Return is your financial Parkrun finish time – how far you’ve progressed from the start line.',
      },
      {
        term: 'Annualised return (CAGR)',
        definition:
          'Compound annual growth rate. The steady yearly percentage gain needed to move from starting value to ending value over the period.',
        analogy: 'CAGR is like telling friends you drove Joburg to Durban at a steady 120km/h, even if you hit robots and potholes on the way.',
      },
      {
        term: 'Volatility (Standard deviation)',
        definition:
          'Measures how widely returns swing around the average. High volatility = a bumpy ride.',
        analogy: 'It’s like Cape Town wind: some days calm, other days your umbrella turns inside-out.',
      },
      {
        term: 'Sharpe ratio',
        definition:
          'Shows how much return you earn for each unit of risk taken versus a risk free rate.',
        analogy: 'Think of points per minute in a rugby match — not just scoring, but how efficiently you scored.',
      },
      {
        term: 'Beta',
        definition:
          'A measure of how sensitively a share or portfolio moves compared to the market (beta of 1 = moves in sync).',
        analogy: 'It’s your bakkie’s suspension: does it bounce with every pothole (beta 1) or smooth the bumps (beta < 1)?',
      },
      {
        term: 'Alpha',
        definition:
          'Return earned above what beta would predict — your skill premium.',
        analogy: 'It’s bragging about beating the average Parkrun time on the same course.',
      },
      {
        term: 'Worst drawdown',
        definition:
          'The largest peak to-trough drop experienced during the selected period.',
        analogy: 'It marks the lowest dip on the rollercoaster before you climb back up.',
      },
      {
        term: 'Downside capture',
        definition:
          'How much of the benchmark’s losses your portfolio participates in during down months. Less than 100% means better protection.',
        analogy: 'It’s measuring if your raincoat keeps you dryer than friends in the same storm. Under 100% means you avoided some splashes.',
      },
      {
        term: 'Tracking error',
        definition:
          'Standard deviation of the difference between your returns and the benchmark. Low tracking error = hugs the benchmark.',
        analogy: 'Imagine tracing a stencil: tracking error is how wobbly your pen line gets compared with the original outline.',
      },
    ]
  },
  {
    key: 'income',
    title: 'Income & Cash Flow',
    description: 'Everything related to dividends, distributions and yield.',
    entries: [
      {
        term: 'Distribution yield',
        definition:
          'Income (dividends or interest) paid by ETFs and REITs each year. Useful for investors targeting rand income streams.',
        analogy: 'It’s the rental income percentage on a property – how much cash the building pays you back every year.',
      },
      {
        term: 'Dividend yield',
        definition:
          'Annual dividends as a percentage of the share price.',
        analogy: 'It shows how juicy the mango tree is – what portion of fruit you get each season per rand invested.',
      },
      {
        term: 'Dividend cover',
        definition:
          'How many times profits can pay the current dividend. Dividend cover below 1 suggests payouts rely on reserves or debt.',
        analogy: 'It’s like checking how many refill bottles a soda fountain can handle – enough syrup and CO₂ or are you running on fumes?',
      },
      {
        term: 'Free cash flow',
        definition:
          'Cash left after operating costs and capital spending. Strong free cash flow supports dividends, buybacks and growth.',
        analogy: 'It’s the money left after salary covers rent, transport and groceries — cash you can actually put to work.',
      },
    ]
  },
  {
    key: 'fundamental',
    title: 'Fundamental Analysis',
    description: 'Balance sheet, income statement, and valuation terminology to decode company results.',
    entries: [
      {
        term: 'Earnings per share (EPS)',
        definition:
          'Company profit divided by the number of shares. Indicates how much profit each share “claims”.',
        analogy: 'It’s the average mark per learner in the class.',
      },
      {
        term: 'Price to-earnings ratio (P/E)',
        definition:
          'Share price divided by EPS; shows how many rand investors pay for each rand of earnings.',
        analogy: 'It’s the price you’re willing to pay for a slice of pizza relative to the shop’s profits.',
      },
      {
        term: 'Price to-book ratio (P/B)',
        definition:
          'Market value compared to accounting book value. Highlights how much you’re paying for assets on the balance sheet.',
        analogy: 'It’s like comparing a house’s selling price to what the bricks, roof and erf cost – are you paying a designer premium?',
      },
      {
        term: 'Return on equity (ROE)',
        definition:
          'Profit generated for each rand of shareholder equity.',
        analogy: 'ROE is management’s report card — how effectively they use investor capital.',
      },
      {
        term: 'Gross margin',
        definition:
          'Revenue minus cost of goods sold, as a percentage of revenue. Shows basic profitability before overheads.',
        analogy: 'Imagine a kota stand: gross margin is what’s left after paying for vetkoek and polony, before rent or staff.',
      },
      {
        term: 'Operating margin',
        definition:
          'Operating profit divided by revenue. Indicates profitability after operating expenses.',
        analogy: 'It’s what the Uber driver pockets after petrol, oil changes, and e tolls – before tax or financing costs.',
      },
      {
        term: 'Net asset value (NAV)',
        definition:
          'Total assets minus liabilities per share. Essentially the company’s equity on a per share basis.',
        analogy: 'NAV is cleaning out the fridge and tallying what’s left after debts – what’s truly yours if you sold everything.',
      },
      {
        term: 'Debt to-equity ratio',
        definition:
          'Total liabilities divided by shareholder equity. Measures leverage.',
        analogy: 'It’s how much of your house is paid via bond versus cash deposit. Too much bond and the bank owns more than you do.',
      },
      {
        term: 'Interest coverage ratio',
        definition:
          'EBIT divided by interest expense. Shows how comfortably a company can service its debt.',
        analogy: 'Like checking if your month end salary can cover rent easily or if you’re counting coins for the landlord.',
      },
      {
        term: 'Enterprise value (EV)',
        definition:
          'Market cap plus debt minus cash. Represents the total takeover cost of a company.',
        analogy: 'Buying a business is like buying a car with outstanding finance – EV is the sticker price plus unpaid instalments minus the cash in the cubbyhole.',
      },
      {
        term: 'Earnings growth',
        definition:
          'The rate at which a company’s profits are growing over time. Sustained growth can justify higher valuations.',
        analogy: 'It’s a bakery selling more koeksisters every month – the faster the ovens churn, the more valuable the shop becomes.',
      }
    ]
  },
  {
    key: 'market instruments',
    title: 'Market Instruments & Benchmarks',
    description: 'Understand the building blocks you can buy on the JSE—bonds, property trusts, commodities and landmark indices.',
    entries: [
      {
        term: 'Bond',
        definition:
          'A loan you make to a government or company. In return you receive fixed or floating interest (coupons) and the face value back at maturity.',
        analogy: 'It’s lending your cousin money for a taxi permit: he pays you set interest every month and the principal when the permit expires.',
      },
      {
        term: 'Bond yield',
        definition:
          'The annual return you earn from a bond’s coupons relative to its current market price. Bond yields move inversely to bond prices.',
        analogy: 'It’s like rental yield on a flat – if the property price drops but the rent stays the same, the yield suddenly looks juicier.',
      },
      {
        term: 'REIT (Real Estate Investment Trust)',
        definition:
          'A listed property company that owns income producing real estate and must pay most rental profits out as distributions.',
        analogy: 'Owning a REIT is like holding keys to a shopping centre – you collect rent without fixing the leaking roof yourself.',
      },
      {
        term: 'Commodity',
        definition:
          'Standardised raw materials such as gold, platinum, oil or maize that trade on global exchanges.',
        analogy: 'Commodities are the ingredients of a chakalaka pot – basic components everyone recognises and swaps at market prices.',
      },
      {
        term: 'Market index',
        definition:
          'A basket of securities that tracks a segment of the market, such as the FTSE/JSE Top 40. Used as a benchmark for performance.',
        analogy: 'An index is the PSL log for shares – one scoreboard that tells you how the whole squad played this season.',
      },
      {
        term: 'Blue chip share',
        definition:
          'A large, financially sound company with a long history of steady earnings and dividends.',
        analogy: 'A blue chip is the Springbok of the stock world – seasoned, reliable and rarely benched during tough seasons.',
      },
      {
        term: 'Share buyback',
        definition:
          'When a company repurchases its own shares, reducing the share count and boosting metrics like earnings per share.',
        analogy: 'It’s like slicing a malva pudding into fewer pieces so the portion you already own suddenly gets thicker.',
      },
      {
        term: 'Initial public offering (IPO)',
        definition:
          'The first time a company sells shares to the public to list on the stock exchange.',
        analogy: 'An IPO is opening night for a restaurant – you invite the public in and sell them a seat at the table.',
      },
    ]
  },
  {
    key: 'trading-desk',
    title: 'Trading Desk Lingo',
    description: 'Price mechanics you see on an order ticket and quote screen.',
    entries: [
      {
        term: 'Bid price',
        definition:
          'The highest price a buyer is currently willing to pay for a share.',
        analogy: 'It’s the shout from the front row at a boerewors auction – the best bid wins the packet.',
      },
      {
        term: 'Ask price',
        definition:
          'The lowest price a seller is prepared to accept (also called the offer price).',
        analogy: 'It’s the sticker price the butcher insists on before handing over the wors.',
      },
      {
        term: 'Bid ask spread',
        definition:
          'The gap between bid and ask prices. Narrow spreads signal healthy liquidity; wide spreads add to trading costs.',
        analogy: 'It’s the haggling gap between what the buyer will pay and the seller wants – the wider it is, the harder the deal.',
      },
      {
        term: 'Capital loss',
        definition:
          'The reduction in value when you sell an investment for less than you paid. Losses remain “paper” until realised.',
        analogy: 'It’s like selling your bakkie for less than you bought it because the gearbox packed up – you bank the loss once the keys change hands.',
      },
    ]
  },
  {
    key: 'macro-rates',
    title: 'Rates & Monetary Policy',
    description: 'Interest rate jargon that forms the hurdle return for your portfolio.',
    entries: [
      {
        term: 'Repo rate',
        definition:
          'The rate at which the South African Reserve Bank lends to commercial banks. It anchors short term interest rates in the economy.',
        analogy: 'Repo is the SARB’s water tap – open it and cheap money flows, close it and the system dries up.',
      },
      {
        term: 'Prime lending rate',
        definition:
          'The benchmark rate banks charge their best customers, typically the repo rate plus a fixed margin (currently 3.5%).',
        analogy: 'Prime is your bank’s menu price for loans – repo is their ingredient cost, prime adds the kitchen’s mark up.',
      },
      {
        term: 'Risk free rate',
        definition:
          'The theoretical return on an investment with zero credit risk, often approximated by short term government bills.',
        analogy: 'It’s like the guaranteed interest your gran earns from a Post Office savings book – the baseline you expect to beat elsewhere.',
      },
    ]
  }
]

const Terminology: React.FC = () => {
  const [activeCategory, setActiveCategory] = React.useState(glossaryCategories[0].key)
  const [searchTerm, setSearchTerm] = React.useState('')
  const trimmedSearch = searchTerm.trim().toLowerCase()

  const selectedCategory = React.useMemo(() => {
    return glossaryCategories.find((cat) => cat.key === activeCategory) ?? glossaryCategories[0]
  }, [activeCategory])

  const searchResults = React.useMemo(() => {
    if (!trimmedSearch) return null
    const matches: Array<{ category: GlossaryCategory; entry: GlossaryEntry }> = []
    glossaryCategories.forEach((category) => {
      category.entries.forEach((entry) => {
        const haystack = `${entry.term} ${entry.definition} ${entry.analogy ?? ''}`.toLowerCase()
        if (haystack.includes(trimmedSearch)) {
          matches.push({ category, entry })
        }
      })
    })
    return matches
  }, [trimmedSearch])

  const isSearching = Boolean(trimmedSearch)

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-brand-ink dark:text-gray-100">Investment terminology</h1>
          <p className="text-lg text-muted dark:text-gray-300">
            Speak the language of South African investing. These are the phrases you’ll see throughout StockBuddy and
            on trading statements from the JSE or your broker.
          </p>
        </header>

        <div className="max-w-xl mx-auto space-y-2">
          <div className="relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for a term, concept, or analogy..."
              className="w-full rounded-full border border-gray-300 bg-white px-4 py-3 text-sm text-brand-ink dark:text-gray-100 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-300"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-subtle dark:text-muted dark:text-gray-300">
            Tip: try “bond”, “spread”, or “repo” to jump straight to the relevant definition.
          </p>
        </div>

        {!isSearching && (
          <>
            <nav className="flex flex-wrap items-center justify-center gap-3">
              {glossaryCategories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    category.key === activeCategory
                      ? 'bg-primary-600 text-white shadow'
                      : 'bg-gray-100 text-muted dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.title}
                </button>
              ))}
            </nav>

            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-semibold text-brand-ink dark:text-gray-100">{selectedCategory.title}</h2>
              <p className="text-muted dark:text-gray-300">{selectedCategory.description}</p>
            </div>

            <div className="space-y-4">
              {selectedCategory.entries.map((entry) => (
                <div key={entry.term} className="card space-y-2">
                  <h3 className="text-xl font-semibold text-brand-ink dark:text-gray-100">{entry.term}</h3>
                  <p className="text-muted dark:text-gray-300">{entry.definition}</p>
                  {entry.analogy && (
                    <p className="text-sm text-primary-600 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-500/10 rounded-md px-3 py-2 italic">
                      {entry.analogy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {isSearching && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-brand-ink dark:text-gray-100">Search results</h2>
              <p className="text-sm text-muted dark:text-gray-300">
                {searchResults && searchResults.length > 0
                  ? `${searchResults.length} entr${searchResults.length === 1 ? 'y' : 'ies'} mention “${searchTerm.trim()}”.`
                  : 'No matches yet – try a different keyword or synonym.'}
              </p>
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map(({ category, entry }) => (
                  <div key={`${category.key}-${entry.term}`} className="card space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                      <span>{category.title}</span>
                      <span className="text-gray-400 dark:text-subtle dark:text-gray-400">•</span>
                      <span>{entry.term}</span>
                    </div>
                    <p className="text-muted dark:text-gray-300">{entry.definition}</p>
                    {entry.analogy && (
                      <p className="text-sm text-primary-600 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-500/10 rounded-md px-3 py-2 italic">
                        {entry.analogy}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Terminology
