const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} StockBuddy. Educational purposes only — not financial advice.
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Made for South African investors</span>
          <span>FSCA awareness focused</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
