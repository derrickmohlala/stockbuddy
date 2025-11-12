const About: React.FC = () => {
  return (
    <div className="space-y-16">
      <section className="rounded-[44px] border border-[#e7e9f3] bg-white px-8 py-12 shadow-[0_40px_110px_-70px_rgba(94,102,135,0.45)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-muted">
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
            <span className="inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-muted">
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

      <section className="mx-auto max-w-5xl rounded-[32px] border border-[#e7e9f3] bg-white px-8 py-12 text-center shadow-[0_40px_120px_-70px_rgba(94,102,135,0.45)]">
        <h2 className="text-3xl font-semibold text-primary-ink">Our north star</h2>
        <p className="mt-3 text-lg text-subtle">
          Confidence comes from context. StockBuddy provides the translation layer — so when you place your first real trade, it feels like the next logical step.
        </p>
      </section>
    </div>
  )
}

export default About
