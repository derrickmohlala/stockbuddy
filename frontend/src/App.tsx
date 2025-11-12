import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect, ReactNode } from 'react'
import Home from './pages/Home'
import { apiFetch } from './lib/api'
import Onboarding from './pages/Onboarding'
import Discover from './pages/Discover'
import Portfolio from './pages/Portfolio'
import Baskets from './pages/Baskets'
import Trade from './pages/Trade'
import Learn from './pages/Learn'
import Profile from './pages/Profile'
import About from './pages/About'
import Archetypes from './pages/Archetypes'
import Terminology from './pages/Terminology'
import News from './pages/News'
import Health from './pages/Health'
import NavBar from './components/NavBar'
import Footer from './components/Footer'

interface PageLayoutProps {
  children: ReactNode
  fullBleed?: boolean
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, fullBleed = false }) => (
  <div className="page-shell">
    <div className={fullBleed ? 'page-shell-inner-full' : 'page-shell-inner'}>
      {children}
    </div>
  </div>
)

function App() {
  const [userId, setUserId] = useState<number | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    // Bootstrap from localStorage then verify with backend (handles new deployments with a fresh DB)
    const saved = localStorage.getItem('stockbuddy_user_id')
    if (!saved) {
      setIsOnboarded(false)
      setUserId(null)
      return
    }
    const id = parseInt(saved)
    if (!Number.isFinite(id)) {
      localStorage.removeItem('stockbuddy_user_id')
      setIsOnboarded(false)
      setUserId(null)
      return
    }
    // Optimistically set, then verify
    setUserId(id)
    ;(async () => {
      try {
        const resp = await apiFetch(`/api/users/${id}`)
        if (resp.ok) {
          setIsOnboarded(true)
        } else {
          // Stale userId (e.g., new backend instance). Reset and send user through onboarding.
          localStorage.removeItem('stockbuddy_user_id')
          setIsOnboarded(false)
          setUserId(null)
        }
      } catch {
        // On network error keep soft state; pages that need data will guide the user.
        setIsOnboarded(!!id)
      }
    })()
  }, [])

  const handleOnboardingComplete = (newUserId: number) => {
    setUserId(newUserId)
    setIsOnboarded(true)
    localStorage.setItem('stockbuddy_user_id', newUserId.toString())
  }

  return (
    <Router>
      <div className="app-shell">
        <NavBar isOnboarded={isOnboarded} />

        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <PageLayout>
                  <Home
                    onGetStarted={() => {
                      if (!isOnboarded) {
                        setIsOnboarded(false)
                      }
                    }}
                    ctaPath={isOnboarded ? '/portfolio' : '/onboarding'}
                    ctaLabel={isOnboarded ? 'View Portfolio' : "Get Started - It's Free"}
                  />
                </PageLayout>
              } 
            />
            <Route 
              path="/onboarding" 
              element={
                <PageLayout fullBleed>
                  <Onboarding 
                    onComplete={handleOnboardingComplete}
                    userId={userId}
                  />
                </PageLayout>
              } 
            />
            <Route path="/discover" element={<PageLayout><Discover /></PageLayout>} />
            <Route path="/portfolio" element={<PageLayout><Portfolio userId={userId} /></PageLayout>} />
            <Route path="/news" element={<PageLayout><News userId={userId} /></PageLayout>} />
            <Route path="/baskets" element={<PageLayout><Baskets userId={userId} /></PageLayout>} />
            <Route path="/trade/:symbol" element={<PageLayout fullBleed><Trade userId={userId} /></PageLayout>} />
            <Route path="/learn" element={<PageLayout><Learn /></PageLayout>} />
            <Route path="/profile" element={<PageLayout><Profile userId={userId} /></PageLayout>} />
            <Route path="/about" element={<PageLayout><About /></PageLayout>} />
            <Route path="/archetypes" element={<PageLayout><Archetypes /></PageLayout>} />
            <Route path="/terminology" element={<PageLayout><Terminology /></PageLayout>} />
            <Route path="/health" element={<PageLayout><Health userId={userId} /></PageLayout>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
