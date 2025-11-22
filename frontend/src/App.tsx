import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, ReactNode } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Home from './pages/Home'
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
import Login from './pages/Login'
import Signup from './pages/Signup'
import Admin from './pages/Admin'
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

function AppContent() {
  const { user, refreshUser } = useAuth()
  const [userId, setUserId] = useState<number | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)

  // Sync auth user with legacy userId for backwards compatibility
  useEffect(() => {
    if (user && user.user_id) {
      // User is authenticated - use their user_id
      setUserId(user.user_id)
      setIsOnboarded(user.is_onboarded)
      localStorage.setItem('stockbuddy_user_id', user.user_id.toString())
    } else {
      // User is not authenticated - clear userId and localStorage
      setUserId(null)
      setIsOnboarded(false)
      localStorage.removeItem('stockbuddy_user_id')
    }
  }, [user])

  const handleOnboardingComplete = (newUserId: number) => {
    setUserId(newUserId)
    setIsOnboarded(true)
    localStorage.setItem('stockbuddy_user_id', newUserId.toString())
    // Refresh auth user if logged in
    if (user && user.user_id === newUserId) {
      refreshUser()
    }
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
                    ctaPath={
                      user && isOnboarded 
                        ? '/portfolio' 
                        : user && !isOnboarded 
                        ? '/onboarding' 
                        : '/signup'
                    }
                    ctaLabel={
                      user && isOnboarded 
                        ? 'View Portfolio' 
                        : user && !isOnboarded 
                        ? 'Complete Setup' 
                        : "Get Started - It's Free"
                    }
                  />
                  </PageLayout>
                } 
              />
              <Route path="/login" element={<PageLayout><Login /></PageLayout>} />
              <Route path="/signup" element={<PageLayout><Signup /></PageLayout>} />
              <Route path="/admin" element={<PageLayout><Admin /></PageLayout>} />
              <Route 
                path="/onboarding" 
                element={
                  <PageLayout fullBleed>
                  {user && userId ? (
                    <Onboarding 
                      onComplete={handleOnboardingComplete}
                      userId={userId}
                    />
                  ) : (
                    <Navigate to="/signup" replace />
                  )}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
