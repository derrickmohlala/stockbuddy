import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

type NavLinkRender = { isActive: boolean }

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
  { label: 'Health', to: '/health' }
]

const NavBar: React.FC<NavBarProps> = ({ isOnboarded }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleStart = () => {
    navigate(isOnboarded ? '/portfolio' : '/onboarding')
    setMenuOpen(false)
  }

  const renderLinkClass = ({ isActive }: NavLinkRender) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-coral/10 text-brand-coral' : 'text-muted hover:text-brand-coral'
    }`

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="border-b border-[#e7e9f3]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
          <div className="flex items-center gap-3">
            <NavLink to="/" aria-label="StockBuddy home" className="flex items-center gap-2">
              <img src="/assets/stockbuddy_logo.svg" alt="StockBuddy" className="h-9 w-auto" loading="lazy" />
            </NavLink>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-primary-ink">StockBuddy</span>
              <span className="text-xs font-medium text-muted">Investing studio</span>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={renderLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStart}
              className="btn-cta hidden whitespace-nowrap md:inline-flex"
            >
              {isOnboarded ? 'View portfolio' : 'Get started'}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full border border-[#e7e9f3] p-2 text-primary-ink transition hover:border-brand-coral hover:text-brand-coral md:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="border-b border-[#e7e9f3] bg-white/95">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <button onClick={handleStart} className="btn-cta mt-2 w-full">
              {isOnboarded ? 'View portfolio' : 'Get started'}
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}

export default NavBar
