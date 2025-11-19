import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, AlertCircle } from 'lucide-react'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }
    
    setLoading(true)

    try {
      await login(email.trim().toLowerCase(), password)
      navigate('/portfolio')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#e7e9f3] bg-white p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10">
              <LogIn className="h-8 w-8 text-brand-purple" />
            </div>
            <h1 className="text-3xl font-bold text-primary-ink mb-2">Welcome back</h1>
            <p className="text-subtle">Sign in to your StockBuddy account</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-coral/40 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-primary-ink mb-2">
                Email address
              </label>
              <input
                id="email"
                type="text"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-primary-ink mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-purple px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-subtle">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-purple hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

