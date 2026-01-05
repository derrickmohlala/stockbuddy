const About: React.FC = () => {
  return (
    <div className="space-y-16">
      <section className="rounded-[44px] border border-[#e7e9f3] bg-white px-8 py-12 shadow-[0_40px_110px_-70px_rgba(94,102,135,0.45)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-1 text-xs font-semibold text-muted">
              Why StockBuddy exists
            </span>
            <h1 className="text-4xl font-semibold text-primary-ink">We decode investing for South Africans who deserve clarity before committing capital.</h1>
            <p className="text-lg text-subtle">
              StockBuddy pairs local market data with cultural fluency. We ground every lesson in South African examples, taxes, and regulation so your first real trade already feels familiar.
            </p>
          </div>
          <div className="space-y-4 rounded-[30px] border border-[#e7e9f3] bg-white px-5 py-6">
            <p className="text-sm font-semibold text-primary-ink">What guides us</p>
            <ul className="space-y-3 text-sm text-subtle">
              <li>• Teach through analogy so finance becomes conversational.</li>
              <li>• Mirror real JSE pricing, inflation, and risk dynamics.</li>
              <li>• Design every screen for accessibility and momentum.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
        {[
          {
            title: 'Mission',
            copy: 'Equip every South African with the vocabulary, confidence, and tools to steward long-term savings.'
          },
          {
            title: 'Paper trading philosophy',
            copy: 'Experience volatility, fees, and position sizing without risk — the best teacher is muscle memory.'
          },
          {
            title: 'Education promise',
            copy: 'Plain-language insights, archetype-guided planning, and local compliance baked into every touchpoint.'
          }
        ].map((item) => (
          <div key={item.title} className="rounded-[28px] border border-[#e7e9f3] bg-white px-6 py-8 shadow-[0_30px_80px_-60px_rgba(94,102,135,0.45)]">
            <h2 className="text-xl font-semibold text-primary-ink">{item.title}</h2>
            <p className="mt-3 text-subtle">{item.copy}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl rounded-[36px] border border-[#e7e9f3] bg-white px-6 py-12 shadow-[0_35px_100px_-70px_rgba(94,102,135,0.45)]">
        <div className="grid gap-10 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4">
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-1 text-xs font-semibold text-muted">
              Guided experience
            </span>
            <p className="text-xl font-semibold text-primary-ink">What you can expect inside the platform</p>
            <p className="text-subtle">
              From first archetype questionnaire to simulated rebalance, StockBuddy follows a rhythm built on exploration, insight, and action.
            </p>
          </div>
          <div className="space-y-6">
            {[
              'Localised education covering ETFs, REITs, unit trusts, and dividend-tax implications.',
              'Guided onboarding that matches you to an archetype aligned with your goal and risk appetite.',
              'Scenario testing that compares lump sums and debit orders through an inflation-aware lens.',
              'Plain-language reporting that highlights return, volatility, and rand drawdown in terms you recognise.'
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-2xl border border-[#e7e9f3] bg-white px-4 py-4">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-coral"></span>
                <p className="text-sm text-subtle">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl rounded-[36px] border border-[#e7e9f3] bg-white px-8 py-12 shadow-[0_40px_120px_-70px_rgba(94,102,135,0.45)]">
        <div className="grid gap-10 md:grid-cols-[280px_minmax(0,1fr)] md:items-center">
          <div className="flex flex-col items-center gap-4 text-center md:text-left">
            <div className="flex h-48 w-48 items-center justify-center rounded-[32px] border border-[#e7e9f3] bg-[#f7f8fb] text-5xl font-bold text-brand-coral">
              DM
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Founder</p>
              <h3 className="text-2xl font-semibold text-primary-ink">Derrick Mohlala</h3>
            </div>
          </div>
          <div className="space-y-4 text-lg text-subtle">
            <p>
              I originally started StockBuddy as a smart tool to organise my own investing decisions. I was tired of
              jumping through multiple hoops — spreadsheets, download folders, and half-finished calculators — just to
              get a clear read on what to buy or trim next.
            </p>
            <p>
              As I kept building, I realised the experience could help far more people than me. South Africans deserve
              an investment studio that feels local, fun, and genuinely educational, so I began scaling StockBuddy beyond
              a personal prototype.
            </p>
            <p>
              Today the product reflects that journey: immersive lessons, archetype-guided planning, and simulations that
              feel like your future broker portal — minus the risk. My goal is still the same as day one: give people the
              confidence and clarity to move from theory to their first real trade.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
