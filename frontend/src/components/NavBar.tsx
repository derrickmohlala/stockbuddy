import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  label: string
  to: string
  children?: { label: string; to: string }[]
}

const mainNav: NavItem[] = [
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
    label: 'Resources',
    to: '/terminology',
    children: [
      { label: 'Terminology', to: '/terminology' },
      { label: 'Archetypes', to: '/archetypes' },
      { label: 'Daily News', to: '/news' }
    ]
  },
  { label: 'About', to: '/about' }
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
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm transition-shadow">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-12">
          <NavLink to="/" aria-label="StockBuddy home" className="flex items-center gap-2.5">
            <img src="/assets/stockbuddy_logo.svg" alt="StockBuddy" className="h-8 w-auto" loading="lazy" />
            <span className="text-xl font-semibold tracking-tight text-slate-900">StockBuddy</span>
          </NavLink>

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
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-medium transition-all ${isOpen || isGroupActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </NavLink>

                    {/* Dropdown Menu */}
                    <div
                      className={`absolute left-0 top-full pt-2 transition-all duration-200 ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                        }`}
                    >
                      <div className="w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `block rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${isActive
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                    `rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Right: Auth Buttons (Right corner) */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-6">
              {user.is_admin && (
                <NavLink
                  to="/admin"
                  className="hidden text-[14px] font-medium text-slate-600 hover:text-slate-900 md:block"
                >
                  Admin
                </NavLink>
              )}
              <NavLink
                to="/profile"
                className="hidden text-[14px] font-medium text-slate-600 hover:text-slate-900 md:block"
              >
                {user.first_name}
              </NavLink>
              <button
                onClick={handleLogout}
                className="hidden text-slate-400 hover:text-slate-600 transition-colors md:block"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <button
                onClick={handleStart}
                className="hidden rounded-full bg-slate-900 px-6 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg md:block"
              >
                {userIsOnboarded ? 'Portfolio' : 'Get started'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <NavLink
                to="/login"
                className="hidden px-4 py-2 text-[15px] font-medium text-slate-600 hover:text-slate-900 md:block"
              >
                Sign in
              </NavLink>
              <NavLink
                to="/signup"
                className="hidden rounded-full bg-slate-900 px-6 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg md:block"
              >
                Sign up
              </NavLink>
            </div>
          )}

          {/* Mobile Toggle */}
          <button
            className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {mainNav.map((item) => (
              <div key={item.label} className="py-1">
                <div className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-slate-400">
                  {item.label}
                </div>
                {item.children ? (
                  <div className="mt-1 flex flex-col gap-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
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
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
                      }`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    View {item.label}
                  </NavLink>
                )}
              </div>
            ))}

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-slate-500">Logged in as {user.first_name}</div>
                  <button onClick={handleStart} className="w-full rounded-full bg-slate-900 py-4 font-bold text-white">
                    {userIsOnboarded ? 'Go to Portfolio' : 'Get Started'}
                  </button>
                  <button onClick={handleLogout} className="w-full py-3 text-slate-600 font-medium">Logout</button>
                </>
              ) : (
                <>
                  <NavLink to="/signup" onClick={() => setMenuOpen(false)} className="w-full rounded-full bg-slate-900 py-4 text-center font-bold text-white">
                    Sign up free
                  </NavLink>
                  <NavLink to="/login" onClick={() => setMenuOpen(false)} className="w-full py-4 text-center font-bold text-slate-600">
                    Sign in
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
