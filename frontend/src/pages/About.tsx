const About: React.FC = () => {
  return (
    <>
      <section className="section-hero space-y-4">
        <h1 className="text-4xl font-bold">About StockBuddy</h1>
        <p className="text-lg text-subtle max-w-3xl">
          StockBuddy is a learning ground for South African investors who want to build confidence before putting real rands to work. We blend paper trading, curated JSE research, and contextual education tailored to local regulation, tax rules, and market behaviour.
        </p>
      </section>

      <section className="section-surface grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-xl font-semibold">Our mission</h2>
          <p className="text-subtle">
            Equip every South African with the tools and language to manage long term savings. We celebrate goals such as building retirement capital, protecting purchasing power, and funding big life moments.
          </p>
        </div>
        <div className="card">
          <h2 className="mb-3 text-xl font-semibold">Why paper trading?</h2>
          <p className="text-subtle">
            Practising trades without risk lets you experience JSE volatility, learn order types, and test strategies with rand based results — all before opening a brokerage account.
          </p>
        </div>
      </section>

      <section className="section-neutral">
        <h2 className="mb-4 text-xl font-semibold">What you can expect</h2>
        <ul className="list-disc space-y-2 pl-5 text-subtle">
          <li>Localised education covering ETFs, REITs, unit trusts, and dividend tax implications.</li>
          <li>Guided onboarding that matches you to an archetype aligned with your goal and risk appetite.</li>
          <li>Scenario testing: compare lump sum contributions to debit order investing across timeframes.</li>
          <li>Plain language reporting that highlights return, volatility, and rand drawdown in familiar terms.</li>
        </ul>
      </section>
    </>
  )
}

export default About
