import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Shield, BookOpen, Users, Sparkles, Brain, Wallet } from 'lucide-react'

interface HomeProps {
  onGetStarted?: () => void
  ctaLabel?: string
  ctaPath?: string
}

const flashcards = [
  {
    term: 'Bond',
    analogy: 'A bond is like lending money to the government for a taxi permit – they promise fixed interest and give your capital back on a set date.'
  },
  {
    term: 'Bond yield',
    analogy: 'Bond yield works like rental yield: if the bond price falls but coupons stay the same, your income as a percentage jumps higher.'
  },
  {
    term: 'REIT',
    analogy: 'A REIT lets you own a slice of a shopping mall – the tenants pay rent, and the trust passes most of it straight to you.'
  },
  {
    term: 'Commodity',
    analogy: 'Commodities are the raw mielies and oil of the investing pantry – standard ingredients that trade globally.'
  },
  {
    term: 'Market index',
    analogy: 'An index is the PSL log for shares – one scorecard that tells you how the entire squad performed.'
  },
  {
    term: 'Blue chip share',
    analogy: 'A blue chip is the Springbok of the JSE – seasoned, reliable and still scoring dividends in tough seasons.'
  },
  {
    term: 'Share buyback',
    analogy: 'A buyback is slicing a cake into fewer pieces, so the slice you already own suddenly gets thicker.'
  },
  {
    term: 'IPO',
    analogy: 'An initial public offering is opening night for a restaurant – you finally invite the public in to buy a stake at the table.'
  },
  {
    term: 'Bid ask spread',
    analogy: 'The spread is the haggling gap between the top buyer and bottom seller – the wider it is, the harder it is to trade cheaply.'
  },
  {
    term: 'Capital loss',
    analogy: 'A capital loss is selling your bakkie for less than you bought it because the gearbox packed up – you bank the hit once the cash swaps hands.'
  },
  {
    term: 'Repo rate',
    analogy: 'Repo is the Reserve Bank’s tap – open it and cheap money flows to banks; close it and the system dries up.'
  },
  {
    term: 'Prime lending rate',
    analogy: 'Prime is your bank’s menu price for loans – repo sets their ingredient cost, prime adds the kitchen’s mark up.'
  },
  {
    term: 'Volatility',
    analogy: 'Think of volatility as Cape Town weather – gorgeous one minute, gale force the next. It measures how wildly prices swing around their average.'
  },
  {
    term: 'Dividends',
    analogy: 'Dividends are like rental income from a flat you own – companies share a slice of profits with you simply for holding their shares.'
  },
  {
    term: 'Return',
    analogy: 'Return is the distance you’ve jogged financially – how far your money has travelled from the starting line to today.'
  },
  {
    term: 'EPS',
    analogy: 'Earnings per share acts like the average mark per learner in a class – it tells you how much profit each share “student” contributed.'
  },
  {
    term: 'Diversification',
    analogy: 'Diversification is a braai plate – pap, salad, wors, and steak. If one goes wrong, you still have something tasty on the plate.'
  },
  {
    term: 'Liquidity',
    analogy: 'Liquidity is the queue at a Spur – the shorter it is, the faster you get a table (or sell a share) without discounting the price.'
  },
  {
    term: 'Sharpe Ratio',
    analogy: 'Sharpe ratio is like calculating points scored per minute in a rugby match – how much extra return you “score” for each unit of risk you take.'
  },
  {
    term: 'Standard Deviation',
    analogy: 'It’s the distance your shots scatter around the hole on a golf green. Tight cluster? Consistent. Wild scatter? High standard deviation.'
  },
  {
    term: 'Beta',
    analogy: 'Beta is the bakkie’s suspension – does it bounce exactly with the road (market), or absorb bumps better/worse?'
  },
  {
    term: 'Alpha',
    analogy: 'Alpha is bragging rights after a Parkrun – how much faster you were than the average runner who did the same course.'
  },
  {
    term: 'Drawdown',
    analogy: 'Drawdown is the deepest dip on a rollercoaster ride. It tracks how far you fall from the highest peak before climbing again.'
  },
  {
    term: 'Compound Interest',
    analogy: 'Compound interest eats like a hungry hippo – it gobbles up returns and keeps growing because it munches on the previous gains too.'
  },
  {
    term: 'Price to-Earnings (P/E)',
    analogy: 'P/E is like paying for a pizza – it tells you how many rand you fork out for every rand the pizza shop earns.'
  },
  {
    term: 'Price to-Book (P/B)',
    analogy: 'P/B compares the sticker price of a house to the cost of bricks and mortar. Are you paying more than it’s worth on paper?' 
  },
  {
    term: 'Return on Equity (ROE)',
    analogy: 'ROE is the report card for management – how much profit they squeezed out of the shareholders’ capital.'
  },
  {
    term: 'Free Cash Flow',
    analogy: 'Free cash flow is like the cash left after your salary covers rent, electricity, and transport – money you can actually put to work.'
  },
  {
    term: 'Dividend Yield',
    analogy: 'Dividend yield shows how juicy the mango tree is – what percentage of sweet fruit (income) you get every season for owning the tree.'
  },
  {
    term: 'Market Capitalisation',
    analogy: 'Market cap is a company’s “street value” – the going price if you bought all the shares today.'
  },
  {
    term: 'Earnings Growth',
    analogy: 'Earnings growth is a startup’s growth spurt – how much its profits have been bulking up year after year.'
  },
  {
    term: 'Gross Margin',
    analogy: 'Gross margin measures how much braai meat is left after paying for charcoal and spices – the profit before other expenses.'
  },
  {
    term: 'Operating Margin',
    analogy: 'Operating margin is the petrol left in the Uber driver’s tank after paying e tolls and oil changes – profit from everyday operations.'
  },
  {
    term: 'Debt to-Equity',
    analogy: 'Debt to-equity is measuring how much of the house is bought on bond versus paid with cash. Too much bond? A bit risky.'
  },
  {
    term: 'Interest Coverage',
    analogy: 'Interest coverage asks: “Can the business pay its interest like paying month end rent comfortably, or are they counting coins?”'
  },
  {
    term: 'Net Asset Value',
    analogy: 'NAV is like weighing your pantry after debts – what’s truly yours if you sold everything and settled accounts.'
  },
  {
    term: 'Dividend Cover',
    analogy: 'Dividend cover is checking if a restaurant’s kitchen can keep up with orders – how many times profits can pay the dividends.'
  },
  {
    term: 'Enterprise Value',
    analogy: 'Enterprise value is the real takeover price – what you pay for the business, including debts and cash, not just share price.'
  }
]

const Home: React.FC<HomeProps> = ({ onGetStarted, ctaLabel = "Get Started - It's Free", ctaPath = '/onboarding' }) => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    onGetStarted?.()
    navigate(ctaPath)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-20 pb-20 text-brand-ink transition-colors duration-500 ease-out dark:text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(233,75,75,0.2),rgba(233,75,75,0))]" />
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-2/3 max-w-3xl translate-x-1/4 rounded-[60%] bg-gradient-to-bl from-brand-purple/45 via-brand-mint/35 to-brand-gold/30 blur-3xl md:block" />
        <div className="absolute -top-40 left-1/3 hidden h-72 w-72 rounded-full bg-brand-purple/20 blur-3xl md:block" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-purple/10 px-4 py-1 text-sm font-semibold text-brand-purple shadow-inner shadow-brand-purple/10">
              Build confidence with paper trading
            </span>
            <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
              Learn investing, the South African way
            </h1>
            <p className="max-w-xl text-lg text-muted dark:text-gray-300">
              Master investing with curated baskets, auto adjusting sleeves, and real SA market data —
              all in a risk free sandbox built for South Africans.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={ctaPath}
                onClick={(event) => {
                  event.preventDefault()
                  handleGetStarted()
                }}
                className="btn-cta shadow-card shadow-brand-coral/30"
                data-testid="cta-view-portfolio"
              >
                {ctaLabel}
              </a>
              <a href="/archetypes" className="btn-secondary">
                Explore Archetypes
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide text-subtle dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-mint" />
                Live SA market data
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-gold" />
                Inflation adjusted returns
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="relative mx-auto max-w-md rounded-[32px] bg-white/95 p-6 shadow-card ring-1 ring-brand-purple/15 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-subtle dark:text-gray-400">Current plan</p>
                  <h3 className="text-2xl font-semibold text-brand-ink dark:text-white">Navigator Growth</h3>
                </div>
                <span className="rounded-full bg-brand-mint/20 px-3 py-1 text-xs font-semibold text-brand-mint">Rebalanced</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-brand-purple/5 p-4">
                  <p className="text-subtle dark:text-gray-300">Portfolio value</p>
                  <p className="text-2xl font-bold text-brand-purple">R 2 959</p>
                </div>
                <div className="rounded-2xl bg-brand-mint/5 p-4">
                  <p className="text-subtle dark:text-gray-300">Annualised return</p>
                  <p className="text-2xl font-bold text-brand-mint">+24.74%</p>
                </div>
                <div className="rounded-2xl bg-brand-gold/10 p-4">
                  <p className="text-subtle dark:text-gray-300">Total P&L</p>
                  <p className="text-2xl font-bold text-brand-gold">R 1 959</p>
                </div>
                <div className="rounded-2xl bg-brand-purple/5 p-4">
                  <p className="text-subtle dark:text-gray-300">Benchmark</p>
                  <p className="text-lg font-semibold text-brand-purple">STX40 · +18.2%</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-r from-brand-purple/10 via-brand-mint/10 to-brand-gold/10 p-4 text-sm text-brand-ink dark:text-gray-200">
                Rebalance suggestions ready. Lock them in with two clicks.
              </div>
            </div>
            <div className="absolute -top-8 -left-6 hidden h-20 w-20 rounded-full bg-brand-gold/40 blur-xl md:block" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-brand-ink dark:text-gray-100 mb-4">
            Why StockBuddy?
          </h2>
          <p className="text-lg text-muted dark:text-gray-300">
            Learn investing the South African way with our educational platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="card text-center">
            <TrendingUp className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Paper Trading</h3>
            <p className="text-muted dark:text-gray-300">
              Practice with simulated trades on real JSE instruments without risking real money
            </p>
          </div>

          <div className="card text-center">
            <Shield className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Educational Focus</h3>
            <p className="text-muted dark:text-gray-300">
              Learn about ETFs, REITs, and Top 40 shares with guided explanations and insights
            </p>
          </div>

          <div className="card text-center">
            <BookOpen className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Curated Baskets</h3>
            <p className="text-muted dark:text-gray-300">
              Start with proven model portfolios tailored to your goals and risk tolerance
            </p>
          </div>

          <div className="card text-center">
            <Users className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">SA Market Focus</h3>
            <p className="text-muted dark:text-gray-300">
              Deep dive into JSE Top 40, sector ETFs, and South African REITs
            </p>
          </div>
        </div>
      </div>

      {/* Flashcard Section */}
      <div className="bg-slate-950/90 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-primary-100 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary-400" /> Jargon Flashcards
              </h2>
              <p className="text-primary-300 text-sm sm:text-base mt-2 max-w-2xl">
                Tap the cards to flip them and see investing explained with playful SA flavoured analogies. Perfect for novice investors getting comfortable with the lingo.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary-200 text-xs sm:text-sm">
              <Brain className="w-5 h-5" />
              <span>Swipe through for a quick confidence boost.</span>
            </div>
          </div>

          <FlashcardCarousel cards={flashcards} perPage={6} />
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-brand-ink dark:text-gray-100 mb-4">
            Ready to start your investing journey?
          </h2>
          <p className="text-lg text-muted dark:text-gray-300 mb-8">
            Join thousands of South Africans learning to invest smarter
          </p>
          <button 
            onClick={handleGetStarted}
            className="btn-cta text-lg px-8 py-4"
          >
            {ctaLabel === "Get Started - It's Free" ? 'Begin Your Journey' : 'Go to Portfolio'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home

interface FlashcardProps {
  term: string
  analogy: string
}

const Flashcard: React.FC<FlashcardProps> = ({ term, analogy }) => {
  const [flipped, setFlipped] = React.useState(false)

  return (
    <button
      type="button"
      onClick={() => setFlipped(prev => !prev)}
      className="group perspective"
      aria-label={`Flashcard for ${term}`}
    >
      <div className={`relative h-52 w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? 'rotate-y-180' : ''}`}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-px shadow-lg [backface-visibility:hidden]">
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[inherit] bg-slate-950/95 px-6 py-6 text-center">
            <Wallet className="h-8 w-8 text-primary-100" />
            <p className="text-lg font-semibold text-white tracking-wide">{term}</p>
            <p className="text-xs uppercase text-primary-200/80 tracking-[0.25em]">Tap to flip</p>
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-slate-900/90 px-6 py-6 text-left text-sm text-primary-100 shadow-lg [backface-visibility:hidden] rotate-y-180">
          <p className="font-semibold text-primary-200 mb-3">{term} in plain language</p>
          <p className="leading-relaxed text-slate-100 text-sm">{analogy}</p>
        </div>
      </div>
    </button>
  )
}

interface FlashcardCarouselProps {
  cards: typeof flashcards
  perPage?: number
}

const FlashcardCarousel: React.FC<FlashcardCarouselProps> = ({ cards, perPage = 6 }) => {
  const [page, setPage] = React.useState(0)
  const totalPages = Math.ceil(cards.length / perPage)

  const handleNext = () => setPage((prev) => (prev + 1) % totalPages)
  const handlePrev = () => setPage((prev) => (prev - 1 + totalPages) % totalPages)

  const startIndex = page * perPage
  const currentCards = cards.slice(startIndex, startIndex + perPage)

  // Shuffle if fewer than requested (last page)
  const displayCards = currentCards.length === perPage
    ? currentCards
    : [...currentCards, ...cards.slice(0, perPage - currentCards.length)]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handlePrev}
          className="rounded-full border border-primary-400/60 px-4 py-2 text-sm text-primary-100 hover:bg-primary-500/10 transition-colors"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <span
              key={idx}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                idx === page ? 'bg-primary-300' : 'bg-primary-800'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-full border border-primary-400/60 px-4 py-2 text-sm text-primary-100 hover:bg-primary-500/10 transition-colors"
        >
          Next
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayCards.map((card, idx) => (
          <Flashcard key={`${card.term}-${startIndex + idx}`} term={card.term} analogy={card.analogy} />
        ))}
      </div>
    </div>
  )
}
