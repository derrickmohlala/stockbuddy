const Footer: React.FC = () => {
  return (
    <footer className="mt-16">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="rounded-3xl border border-white/15 bg-white/70 px-6 py-8 shadow-[0_15px_50px_rgba(18,24,46,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-surface-base/75">
          <div className="flex flex-col gap-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} StockBuddy. Educational purposes only — not financial advice.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-subtle">
              <span>Made for South African investors</span>
              <span>FSCA awareness focused</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
