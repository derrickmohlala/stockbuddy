import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, AlertCircle } from 'lucide-react'
import { apiFetch } from '../lib/api'

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const { login, user, setAuthFromToken } = useAuth()

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      if (user.is_onboarded) {
        navigate('/portfolio')
      } else {
        navigate('/onboarding')
      }
    }
  }, [user, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!firstName || firstName.trim().length < 1) {
      setError('Please enter your first name')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const requirements = [
      { met: password.length >= 8, error: 'Password must be at least 8 characters long' },
      { met: /[A-Z]/.test(password), error: 'Password must contain at least one uppercase letter' },
      { met: /[a-z]/.test(password), error: 'Password must contain at least one lowercase letter' },
      { met: /\d/.test(password), error: 'Password must contain at least one number' },
      { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), error: 'Password must contain at least one special character' }
    ]

    const unmet = requirements.find(r => !r.met)
    if (unmet) {
      setError(unmet.error)
      return
    }

    setSubmitting(true)

    try {
      const requestBody = {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim()
      }

      console.log('Attempting registration:', { email: requestBody.email, first_name: requestBody.first_name })

      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Registration failed')
      }

      const data = await response.json()

      if (data.access_token) {
        setAuthFromToken(data.access_token, {
          user_id: data.user_id,
          email: data.email,
          first_name: data.first_name,
          is_admin: data.is_admin || false,
          is_onboarded: false, // Force false to trigger onboarding flow
          is_profile_complete: false
        })

        // IMPORTANT: Redirect to /onboarding to start the AI flow
        navigate('/onboarding', { replace: true })
      } else {
        await login(email, password)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-8">
      <div className="w-full max-w-md px-4">
        <div className="rounded-2xl border border-[#e7e9f3] bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-coral/10">
              <UserPlus className="h-8 w-8 text-brand-coral" />
            </div>
            <h1 className="text-3xl font-bold text-primary-ink mb-2">Create your account</h1>
            <p className="text-subtle">Join StockBuddy to start your journey</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-coral/40 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6" noValidate>
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-primary-ink mb-2">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                placeholder="John"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-primary-ink mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                placeholder="you@example.com"
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
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                placeholder="••••••••"
              />
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: '8+ chars', met: password.length >= 8 },
                  { label: 'Uppercase', met: /[A-Z]/.test(password) },
                  { label: 'Lowercase', met: /[a-z]/.test(password) },
                  { label: 'Number', met: /\d/.test(password) },
                  { label: 'Symbol', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
                ].map((req, i) => (
                  <div key={i} className={`flex items-center gap-1.5 text-[11px] font-bold ${req.met ? 'text-brand-mint' : 'text-slate-400'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-brand-mint' : 'bg-slate-300'}`} />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-primary-ink mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-brand-coral px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-coral/90 disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-subtle">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-coral hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
