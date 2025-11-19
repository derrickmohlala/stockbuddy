import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, LogOut, Shield, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type NavLinkRender = { isActive: boolean }

interface NavBarProps {
  isOnboarded: boolean
}

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Archetypes', to: '/archetypes' },
  { label: 'Terminology', to: '/terminology' }
]

const navItemsAfterPortfolio = [
  { label: 'News', to: '/news' },
  { label: 'Health', to: '/health' }
]

const portfolioSubItems = [
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'Discover', to: '/discover' }
]

const NavBar: React.FC<NavBarProps> = ({ isOnboarded }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [portfolioDropdownOpen, setPortfolioDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  
  const isPortfolioActive = location.pathname.startsWith('/portfolio') || location.pathname.startsWith('/discover')

  const handleStart = () => {
    navigate(isOnboarded ? '/portfolio' : '/onboarding')
    setMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
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
              <span className="text-xs font-medium text-muted">Investment studio</span>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={renderLinkClass}>
                {item.label}
              </NavLink>
            ))}
            
            {/* Portfolio Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setPortfolioDropdownOpen(true)}
              onMouseLeave={() => setPortfolioDropdownOpen(false)}
            >
              <NavLink
                to="/portfolio"
                className={() =>
                  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    isPortfolioActive
                      ? 'bg-brand-coral/10 text-brand-coral' 
                      : 'text-muted hover:text-brand-coral'
                  }`
                }
              >
                Portfolio
                <ChevronDown className={`h-3 w-3 transition-transform ${portfolioDropdownOpen ? 'rotate-180' : ''}`} />
              </NavLink>
              
              {portfolioDropdownOpen && (
                <div className="absolute top-full left-0 pt-2 w-40">
                  <div className="rounded-xl border border-[#e7e9f3] bg-white shadow-lg py-2">
                    {portfolioSubItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm font-medium transition-colors ${
                            isActive 
                              ? 'bg-brand-coral/10 text-brand-coral' 
                              : 'text-primary-ink hover:bg-[#f7f8fb] hover:text-brand-coral'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {navItemsAfterPortfolio.map((item) => (
              <NavLink key={item.to} to={item.to} className={renderLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.is_admin && (
                  <NavLink
                    to="/admin"
                    className="hidden md:inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb]"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </NavLink>
                )}
                <div className="hidden md:flex items-center gap-2 text-sm text-muted">
                  <span>{user.first_name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden md:inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
                <button
                  onClick={handleStart}
                  className="btn-cta hidden whitespace-nowrap md:inline-flex"
                >
                  {isOnboarded ? 'View portfolio' : 'Get started'}
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="hidden md:inline-flex items-center rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb]"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className="btn-cta hidden whitespace-nowrap md:inline-flex"
                >
                  Sign up
                </NavLink>
              </>
            )}
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
            
            {/* Portfolio Section in Mobile Menu */}
            <div className="rounded-xl border border-[#e7e9f3] overflow-hidden">
              <div className="px-4 py-2 bg-[#f7f8fb] text-xs font-semibold text-muted">
                Portfolio
              </div>
              {portfolioSubItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block px-4 py-3 font-medium transition-colors border-t border-[#e7e9f3] ${
                      isActive
                        ? 'bg-brand-coral/10 text-brand-coral border-brand-coral/20'
                        : 'text-primary-ink hover:bg-[#f7f8fb] hover:text-brand-coral'
                    }`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            
            {navItemsAfterPortfolio.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <>
                {user.is_admin && (
                  <NavLink
                    to="/admin"
                    className="rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </NavLink>
                )}
                <div className="rounded-xl border border-[#e7e9f3] px-4 py-3 text-muted">
                  {user.first_name} ({user.email})
                </div>
                <button onClick={handleStart} className="btn-cta mt-2 w-full">
                  {isOnboarded ? 'View portfolio' : 'Get started'}
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className="btn-cta mt-2 w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default NavBar
