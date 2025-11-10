import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
import NavBar from './components/NavBar'
import Footer from './components/Footer'

function App() {
  const [userId, setUserId] = useState<number | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    // Check if user is already onboarded
    const savedUserId = localStorage.getItem('stockbuddy_user_id')
    if (savedUserId) {
      setUserId(parseInt(savedUserId))
      setIsOnboarded(true)
    }
  }, [])

  const handleOnboardingComplete = (newUserId: number) => {
    setUserId(newUserId)
    setIsOnboarded(true)
    localStorage.setItem('stockbuddy_user_id', newUserId.toString())
  }

  return (
    <Router>
      <div className="app-shell min-h-screen flex flex-col">
        <NavBar isOnboarded={isOnboarded} />

        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <Home
                  onGetStarted={() => {
                    if (!isOnboarded) {
                      setIsOnboarded(false)
                    }
                  }}
                  ctaPath={isOnboarded ? '/portfolio' : '/onboarding'}
                  ctaLabel={isOnboarded ? 'View Portfolio' : "Get Started - It's Free"}
                />
              } 
            />
            <Route 
              path="/onboarding" 
              element={
                <Onboarding 
                  onComplete={handleOnboardingComplete}
                  userId={userId}
                />
              } 
            />
            <Route path="/discover" element={<Discover />} />
            <Route path="/portfolio" element={<Portfolio userId={userId} />} />
            <Route path="/news" element={<News userId={userId} />} />
            <Route path="/baskets" element={<Baskets userId={userId} />} />
            <Route path="/trade/:symbol" element={<Trade userId={userId} />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/profile" element={<Profile userId={userId} />} />
            <Route path="/about" element={<About />} />
            <Route path="/archetypes" element={<Archetypes />} />
            <Route path="/terminology" element={<Terminology />} />
            <Route path="/health" element={<Health userId={userId} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
