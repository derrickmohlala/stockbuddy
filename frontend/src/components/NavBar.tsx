import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'

interface NavBarProps {
  isOnboarded: boolean
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Archetypes', to: '/archetypes' },
  { label: 'Terminology', to: '/terminology' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'News', to: '/news' },
  { label: 'Health', to: '/health' },
]

const NavBar: React.FC<NavBarProps> = ({ isOnboarded }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleStart = () => {
    navigate(isOnboarded ? '/portfolio' : '/onboarding')
    setMenuOpen(false)
  }

  const renderLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium tracking-wide transition ${
      isActive
        ? 'text-brand-purple'
        : 'text-muted hover:text-brand-coral dark:text-tone-secondary dark:hover:text-brand-mint'
    }`

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mt-4 flex h-16 items-center gap-4 rounded-full border border-white/20 bg-white/65 px-4 shadow-[0_18px_38px_rgba(31,38,68,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-surface-base/70">
          <NavLink to="/" aria-label="StockBuddy home" className="flex-shrink-0">
            <img src="/assets/stockbuddy_logo.svg" alt="StockBuddy" className="h-8 w-auto" loading="lazy" />
          </NavLink>
          <div className="hidden flex-1 justify-center md:flex">
            <nav className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-4 py-2 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={renderLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/70 text-brand-purple transition hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:bg-white/10 dark:text-brand-gold"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={handleStart} className="btn-cta hidden whitespace-nowrap md:inline-flex">
              {isOnboarded ? 'View portfolio' : 'Get started'}
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-brand-purple transition hover:border-brand-purple md:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="mx-4 mt-3 rounded-3xl border border-white/25 bg-white/85 p-4 shadow-pop backdrop-blur-xl dark:border-white/10 dark:bg-surface-base/80 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={renderLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={toggleTheme}
              className="btn-secondary mt-2 inline-flex items-center justify-center gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  Light mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Dark mode
                </>
              )}
            </button>
            <button
              onClick={handleStart}
              className="btn-cta mt-4 w-full"
            >
              {isOnboarded ? 'View portfolio' : 'Get started'}
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}

export default NavBar
