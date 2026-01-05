import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, LogOut, Shield, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  label: string
  to: string
  children?: { label: string; to: string }[]
}

const mainNav: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'News', to: '/news' },
  {
    label: 'Portfolio',
    to: '/portfolio',
    children: [
      { label: 'Dashboard', to: '/portfolio' },
      { label: 'Discover', to: '/discover' },
      { label: 'Health', to: '/health' }
    ]
  },
  {
    label: 'Terminology',
    to: '/terminology',
    children: [
      { label: 'Glossary', to: '/terminology' },
      { label: 'Archetypes', to: '/archetypes' }
    ]
  }
]

const NavBar: React.FC<{ isOnboarded: boolean }> = ({ isOnboarded }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const userIsOnboarded = user?.is_onboarded ?? isOnboarded

  const handleStart = () => {
    navigate(userIsOnboarded ? '/portfolio' : '/onboarding')
    setMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const isActiveLink = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

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

          <nav className="hidden items-center gap-1 md:flex">
            {mainNav.map((item) => {
              if (item.children) {
                const isGroupActive = item.children.some(child => isActiveLink(child.to))
                const isOpen = activeDropdown === item.label

                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <NavLink
                      to={item.to}
                      className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${isGroupActive
                          ? 'bg-brand-coral/10 text-brand-coral'
                          : isOpen
                            ? 'text-brand-coral'
                            : 'text-muted hover:text-brand-coral'
                        }`}
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </NavLink>

                    {/* Dropdown Menu */}
                    <div
                      className={`absolute left-1/2 top-full w-48 -translate-x-1/2 pt-4 transition-all duration-200 ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                        }`}
                    >
                      <div className="overflow-hidden rounded-2xl border border-[#e7e9f3] bg-white p-1.5 shadow-xl ring-1 ring-black/5">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                                ? 'bg-brand-coral/10 text-brand-coral'
                                : 'text-primary-ink hover:bg-[#f7f8fb] hover:text-brand-coral'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-brand-coral/10 text-brand-coral' : 'text-muted hover:text-brand-coral'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            })}
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
                <NavLink
                  to="/profile"
                  className="hidden md:flex items-center gap-2 text-sm text-muted hover:text-brand-coral transition-colors cursor-pointer"
                >
                  <span>{user.first_name}</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="hidden md:inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
                <button
                  onClick={handleStart}
                  className="btn-cta hidden whitespace-nowrap md:inline-flex"
                >
                  {userIsOnboarded ? 'View portfolio' : 'Get started'}
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
            {mainNav.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div className="rounded-xl border border-[#e7e9f3] overflow-hidden">
                    <NavLink
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 bg-[#f7f8fb] text-xs font-semibold text-muted hover:text-brand-coral"
                    >
                      {item.label}
                    </NavLink>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `block px-4 py-3 font-medium transition-colors border-t border-[#e7e9f3] ${isActive
                            ? 'bg-brand-coral/10 text-brand-coral border-brand-coral/20'
                            : 'text-primary-ink hover:bg-[#f7f8fb] hover:text-brand-coral'
                          }`
                        }
                        onClick={() => setMenuOpen(false)}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                ) : (
                  <NavLink
                    to={item.to}
                    className="block rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                )}
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-[#e7e9f3] space-y-2">
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
                  <div className="px-4 py-2 text-xs font-medium text-muted">
                    Signed in as {user.first_name}
                  </div>
                  <button onClick={handleStart} className="btn-cta w-full">
                    {userIsOnboarded ? 'View portfolio' : 'Get started'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral flex items-center justify-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="block rounded-xl border border-[#e7e9f3] px-4 py-3 font-medium text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="btn-cta block w-full text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign up
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default NavBar
