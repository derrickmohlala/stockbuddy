import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'

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
    <div className="space-y-20">
      <section className="rounded-2xl border border-[#e7e9f3] bg-white px-8 py-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] bg-white px-4 py-2 text-xs font-semibold text-muted">
              Paper trading studio
            </span>
            <div className="space-y-5">
              <h1 className="text-5xl font-semibold leading-tight text-primary-ink lg:text-6xl">
                Build investing confidence with live JSE data — before you spend a single rand.
              </h1>
              <p className="max-w-xl text-lg text-subtle">
                StockBuddy scaffolds your journey with South African market insights, guided archetypes, and hands-on simulations that feel like the real exchange — minus the risk.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={ctaPath}
                onClick={(event) => {
                  event.preventDefault()
                  handleGetStarted()
                }}
                className="btn-cta text-base"
                data-testid="cta-view-portfolio"
              >
                {ctaLabel}
              </a>
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-5 py-3 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
              >
                Explore live instruments
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <span>Live SA data feed</span>
              <span>Archetype guidance</span>
              <span>Inflation aware metrics</span>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[#e7e9f3] bg-white px-6 py-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted">Navigator growth</span>
                <span className="rounded-full bg-brand-mint/15 px-3 py-1 text-xs font-semibold text-brand-mint">Live</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3">
                  <p className="text-subtle">Portfolio value</p>
                  <p className="text-2xl font-semibold text-primary-ink">R 2 959</p>
                </div>
                <div className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3">
                  <p className="text-subtle">Annualised return</p>
                  <p className="text-2xl font-semibold text-brand-mint">+24.74%</p>
                </div>
                <div className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3">
                  <p className="text-subtle">Target runway</p>
                  <p className="text-2xl font-semibold text-primary-ink">R 500 000</p>
                </div>
                <div className="rounded-2xl border border-[#e7e9f3] bg-white px-4 py-3">
                  <p className="text-subtle">Inflation guardrail</p>
                  <p className="text-lg font-semibold text-brand-purple">+3.1 pts</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 rounded-2xl border border-[#e7e9f3] bg-white px-6 py-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Daily rhythm</p>
                <span className="text-xs font-medium text-brand-purple">Auto curated</span>
              </div>
              <div className="space-y-3 text-sm text-subtle">
                <div className="flex items-center justify-between">
                  <span>Rebalance insight: Top 40 vs Income basket</span>
                  <span className="rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple">+6.3%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dividend calendar alert: Satrix DIVI</span>
                  <span className="rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-brand-gold">Two weeks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inflation watch: SARB band threshold</span>
                  <span className="rounded-full bg-brand-coral/10 px-3 py-1 text-xs font-semibold text-brand-coral">On track</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
        {[
          {
            title: 'Simulated trades with heart',
            copy: 'Layer in real JSE instruments, slippage, and costs — all safely paper traded so every lesson sticks.'
          },
          {
            title: 'Archetypes matched to you',
            copy: 'Growth, income, or balanced? We decode the jargon and map your goals to curated market sleeves.'
          },
          {
            title: 'Metrics that speak rand',
            copy: 'See returns, inflation gaps, and dividend cover in language South African investors trust.'
          }
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-[#e7e9f3] bg-white px-6 py-8"
          >
            <h3 className="text-xl font-semibold text-primary-ink">{feature.title}</h3>
            <p className="mt-3 text-subtle">{feature.copy}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl rounded-2xl border border-[#e7e9f3] bg-white px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-3 py-1 text-xs font-semibold text-muted">
              Learning journey
            </span>
            <h2 className="text-3xl font-semibold text-primary-ink">From definition to decision in four steps.</h2>
            <p className="text-subtle">
              StockBuddy is more than a glossary. We pair daily flashes of theory with situation-based practice and portfolio reflection.
            </p>
          </div>
          <div className="space-y-6">
            {[
              {
                title: 'Translate the jargon',
                detail: 'Flashcards and explainers convert investing slang into real-world examples from SA life.'
              },
              {
                title: 'Match your archetype',
                detail: 'Answer a friendly prompt sheet and we align you with a goal-based archetype that adjusts over time.'
              },
              {
                title: 'Simulate with intent',
                detail: 'Paper trades feed into performance dashboards that highlight inflation gaps and cash-flow coverage.'
              },
              {
                title: 'Act on insights',
                detail: 'Action prompts tell you when to rebalance, top up, or pivot to income — all before you spend a rand.'
              }
            ].map((item, idx) => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e9f3] text-sm font-semibold text-primary-ink">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary-ink">{item.title}</p>
                  <p className="text-sm text-subtle">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-primary-ink">Flashcards that sound local.</h2>
            <p className="text-subtle">
              Tap any card to see the plain-language explanation South Africans actually use.
            </p>
          </div>
          <div className="rounded-full border border-[#e7e9f3] px-4 py-2 text-xs text-muted">
            Local insight feed
          </div>
        </div>
        <div className="rounded-2xl border border-[#e7e9f3] bg-white px-6 py-8">
          <FlashcardCarousel cards={flashcards} perPage={6} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl rounded-2xl border border-[#e7e9f3] bg-white px-8 py-12 text-center">
        <h2 className="text-3xl font-semibold text-primary-ink">Launch your investing era with clarity.</h2>
        <p className="mt-3 text-lg text-subtle">
          Join thousands of South Africans who now understand their risk, their inflation gap, and their dividend runway.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <button onClick={handleGetStarted} className="btn-cta text-base px-8 py-4">
            {ctaLabel === "Get Started - It's Free" ? 'Begin your journey' : 'Go to portfolio'}
          </button>
          <a href="/discover" className="inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-6 py-3 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral">
            Browse the instrument library
          </a>
        </div>
      </section>
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
        <div className="absolute inset-0 rounded-2xl border border-[#e7e9f3] bg-white p-6 [backface-visibility:hidden]">
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Wallet className="h-8 w-8 text-brand-purple" />
            <p className="text-lg font-semibold text-primary-ink">{term}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Tap to flip</p>
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-[#e7e9f3] bg-white px-6 py-6 text-left text-sm text-subtle [backface-visibility:hidden] rotate-y-180">
          <p className="font-semibold text-primary-ink mb-3">{term} in plain language</p>
          <p className="leading-relaxed">{analogy}</p>
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
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          className="rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:border-brand-purple/30 hover:text-brand-purple"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <span
              key={idx}
              className={`h-2.5 w-2.5 rounded-full ${idx === page ? 'bg-brand-purple' : 'bg-[#d7d9e5]'}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:border-brand-purple/30 hover:text-brand-purple"
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
