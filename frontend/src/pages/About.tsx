const About: React.FC = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-10">
        <section className="card bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-white/10 dark:border-gray-800/70">
          <h1 className="text-4xl font-bold text-brand-ink dark:text-gray-100 mb-4">About StockBuddy</h1>
          <p className="text-lg text-muted dark:text-gray-300">
            StockBuddy is a learning ground for South African investors who want to build confidence before putting
            real rands to work. We blend paper trading, curated JSE research, and contextual education tailored to
            local regulation, tax rules, and market behaviour.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-2">Our mission</h2>
            <p className="text-muted dark:text-gray-300">
              Equip every South African with the tools and language to manage long term savings. We celebrate goals
              such as building retirement capital, protecting purchasing power, and funding big life moments.
            </p>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-2">Why paper trading?</h2>
            <p className="text-muted dark:text-gray-300">
              Practising trades without risk lets you experience JSE volatility, learn order types, and test strategies
              with rand based results — all before opening a brokerage account.
            </p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-4">What you can expect</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted dark:text-gray-300">
            <li>Localised education covering ETFs, REITs, unit trusts, and dividend tax implications.</li>
            <li>Guided onboarding that matches you to an archetype aligned with your goal and risk appetite.</li>
            <li>Scenario testing: compare lump sum contributions to debit order investing across timeframes.</li>
            <li>Plain language reporting that highlights return, volatility, and rand drawdown in familiar terms.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default About
