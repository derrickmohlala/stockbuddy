import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, AlertCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface OnboardingData {
  first_name: string
  age_band: string
  experience: string
  goal: string
  risk: number
  horizon: string
  anchor_stock: string
  literacy_level: string
  interests: string[]
}

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const { register, refreshUser, user } = useAuth()
  
  // Account creation state (Step 0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Onboarding state (Steps 1-3)
  const [currentStep, setCurrentStep] = useState(0) // 0 = signup, 1-3 = onboarding
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    first_name: '',
    age_band: '',
    experience: '',
    goal: '',
    risk: 50,
    horizon: '',
    anchor_stock: '',
    literacy_level: '',
    interests: []
  })
  
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const updateData = (field: keyof OnboardingData, value: any) => {
    setOnboardingData(prev => ({ ...prev, [field]: value }))
  }

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate email format
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate first name
    if (!onboardingData.first_name || onboardingData.first_name.trim().length < 1) {
      setError('Please enter your first name')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Move to onboarding step 1
    setCurrentStep(1)
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleCompleteOnboarding()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      setCurrentStep(0) // Back to account creation
    }
  }

  const handleCompleteOnboarding = async () => {
    setError(null)
    
    // Validate all required fields before submitting
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }
    
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    if (!onboardingData.first_name || onboardingData.first_name.trim().length < 1) {
      setError('First name is required')
      return
    }
    
    if (!onboardingData.age_band || !onboardingData.experience || !onboardingData.goal || 
        !onboardingData.horizon || !onboardingData.anchor_stock || !onboardingData.literacy_level) {
      setError('Please complete all onboarding questions')
      return
    }
    
    if (!onboardingData.interests || onboardingData.interests.length === 0) {
      setError('Please select at least one interest')
      return
    }
    
    setSubmitting(true)

    try {
      const requestBody = {
        email: email.trim().toLowerCase(),
        password,
        ...onboardingData,
        first_name: onboardingData.first_name.trim() // Override with trimmed version
      }
      
      console.log('Attempting registration with data:', {
        email: requestBody.email,
        hasPassword: !!requestBody.password,
        first_name: requestBody.first_name,
        age_band: requestBody.age_band,
        experience: requestBody.experience,
        goal: requestBody.goal,
        risk: requestBody.risk,
        horizon: requestBody.horizon,
        anchor_stock: requestBody.anchor_stock,
        literacy_level: requestBody.literacy_level,
        interests: requestBody.interests
      })
      
      // Register with onboarding data included
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Registration response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })

      if (!response.ok) {
        let errorMessage = 'Registration failed'
        let errorDetail = ''
        
        // Read the response body as text first (can only be read once)
        try {
          const text = await response.text()
          console.log('Error response text:', text)
          
          if (text) {
            try {
              // Try to parse as JSON
              const errorData = JSON.parse(text)
              console.log('Error response data:', errorData)
              errorMessage = errorData.error || errorData.message || errorMessage
              errorDetail = errorData.detail || ''
            } catch (jsonError) {
              // If not JSON, use text as error message
              errorMessage = text || errorMessage
            }
          } else {
            // No body, use status text
            errorMessage = response.statusText || `Server error (${response.status})`
          }
        } catch (textError) {
          console.error('Failed to get error text:', textError)
          // Use status text as fallback
          errorMessage = response.statusText || `Server error (${response.status})`
        }
        
        const fullError = errorDetail ? `${errorMessage}: ${errorDetail}` : errorMessage
        console.error('Registration failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          detail: errorDetail,
          fullError
        })
        throw new Error(fullError)
      }

      const data = await response.json()
      console.log('Registration successful:', { user_id: data.user_id, email: data.email, is_onboarded: data.is_onboarded })
      
      // Use the auth context register function to properly set state
      // But since we already have the token from the response, we'll manually update state
      const accessToken = data.access_token
      localStorage.setItem('stockbuddy_token', accessToken)
      localStorage.setItem('stockbuddy_user_id', data.user_id.toString())
      
      // Refresh auth context to get full user data including onboarding status
      await refreshUser()
      
      // Wait a moment for state to update, then navigate
      setTimeout(() => {
        // Navigate based on onboarding status
        if (data.is_onboarded) {
          navigate('/portfolio')
        } else {
          navigate('/onboarding')
        }
      }, 100)
    } catch (err: any) {
      console.error('Registration catch block:', err)
      
      let errorMsg = 'Registration failed. Please try again.'
      
      // Extract error message from various error types
      if (err?.message) {
        errorMsg = String(err.message)
      } else if (err?.error) {
        errorMsg = String(err.error)
      } else if (typeof err === 'string') {
        errorMsg = err
      } else if (err?.toString && err.toString() !== '[object Object]') {
        errorMsg = err.toString()
      } else {
        // Last resort - stringify the error
        try {
          errorMsg = JSON.stringify(err)
        } catch {
          errorMsg = 'Registration failed. Please check the console for details.'
        }
      }
      
      console.log('Extracted error message:', errorMsg)
      
      // Show more helpful error messages
      const errorLower = errorMsg.toLowerCase()
      if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('failed to fetch') || errorLower.includes('cors')) {
        errorMsg = 'Unable to connect to the server. Please check your internet connection and try again.'
      } else if (errorLower.includes('already exists') || errorLower.includes('duplicate')) {
        errorMsg = 'An account with this email already exists. Please try logging in instead.'
      } else if (errorLower.includes('required') || errorLower.includes('missing')) {
        errorMsg = 'Please fill in all required fields.'
      } else if (errorLower.includes('valid email') || (errorLower.includes('email') && errorLower.includes('invalid'))) {
        errorMsg = 'Please enter a valid email address.'
      } else if (errorLower.includes('password') && errorLower.includes('6')) {
        errorMsg = 'Password must be at least 6 characters long.'
      } else if (errorMsg === 'Registration failed. Please try again.' && err) {
        // If we still have the generic message, try to show something more useful
        errorMsg = `Registration failed: ${errorLower.includes('detail') ? errorMsg : 'Please check all fields are filled correctly.'}`
      }
      
      console.error('Final registration error:', {
        originalError: err,
        extractedMessage: errorMsg,
        errorType: typeof err,
        errorKeys: err ? Object.keys(err) : [],
        errorString: String(err),
        errorJSON: JSON.stringify(err, null, 2)
      })
      
      setError(errorMsg)
      setSubmitting(false)
    }
  }

  const renderStep0 = () => (
    <form onSubmit={handleAccountCreation} className="space-y-6" noValidate>
      <div>
        <label htmlFor="firstName" className="block text-sm font-semibold text-primary-ink mb-2">
          First name
        </label>
        <input
          id="firstName"
          type="text"
          value={onboardingData.first_name}
          onChange={(e) => updateData('first_name', e.target.value)}
          required
          className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
          placeholder="John"
        />
      </div>

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
          minLength={6}
          className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-muted">At least 6 characters</p>
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
          className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-brand-purple px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-purple/90"
      >
        Continue
      </button>
    </form>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          What's your age range?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
            <button
              key={age}
              type="button"
              onClick={() => updateData('age_band', age)}
              className={`p-3 rounded-xl border text-center transition-colors ${
                onboardingData.age_band === age
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-[#e7e9f3] bg-white text-primary-ink hover:border-brand-purple/40'
              }`}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          How would you describe your investing experience?
        </label>
        <div className="space-y-3">
          {[
            { value: 'novice', label: 'Novice', desc: 'New to investing, want to learn the basics' },
            { value: 'intermediate', label: 'Intermediate', desc: 'Some experience, looking to improve' },
            { value: 'advanced', label: 'Advanced', desc: 'Experienced investor, want to optimize' }
          ].map(exp => (
            <button
              key={exp.value}
              type="button"
              onClick={() => updateData('experience', exp.value)}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                onboardingData.experience === exp.value
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-[#e7e9f3] bg-white text-primary-ink hover:border-brand-purple/40'
              }`}
            >
              <div className="font-semibold">{exp.label}</div>
              <div className="text-sm text-subtle mt-1">{exp.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          What's your primary investment goal?
        </label>
        <div className="space-y-3">
          {[
            { value: 'growth', label: 'Growth', desc: 'Build wealth over the long term' },
            { value: 'balanced', label: 'Balanced', desc: 'Steady growth with some income' },
            { value: 'income', label: 'Income', desc: 'Generate regular income from investments' }
          ].map(goal => (
            <button
              key={goal.value}
              type="button"
              onClick={() => updateData('goal', goal.value)}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                onboardingData.goal === goal.value
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-[#e7e9f3] bg-white text-primary-ink hover:border-brand-purple/40'
              }`}
            >
              <div className="font-semibold">{goal.label}</div>
              <div className="text-sm text-subtle mt-1">{goal.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          Risk Tolerance: {onboardingData.risk}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={onboardingData.risk}
          onChange={(e) => updateData('risk', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
        />
        <div className="flex justify-between text-sm text-subtle mt-1">
          <span>Conservative</span>
          <span>Aggressive</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          Investment time horizon?
        </label>
        <div className="space-y-3">
          {[
            { value: 'short', label: 'Short (1-3 years)', desc: 'Saving for near term goals' },
            { value: 'medium', label: 'Medium (3-7 years)', desc: 'Building towards major goals' },
            { value: 'long', label: 'Long (7+ years)', desc: 'Planning for retirement or long term wealth' }
          ].map(horizon => (
            <button
              key={horizon.value}
              type="button"
              onClick={() => updateData('horizon', horizon.value)}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                onboardingData.horizon === horizon.value
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-[#e7e9f3] bg-white text-primary-ink hover:border-brand-purple/40'
              }`}
            >
              <div className="font-semibold">{horizon.label}</div>
              <div className="text-sm text-subtle mt-1">{horizon.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          Pick your anchor stock (we'll cap it at 5% of your portfolio)
        </label>
        <select
          value={onboardingData.anchor_stock}
          onChange={(e) => updateData('anchor_stock', e.target.value)}
          className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        >
          <option value="">Select an anchor stock</option>
          <option value="SBK.JO">Standard Bank</option>
          <option value="FSR.JO">FirstRand</option>
          <option value="CPI.JO">Capitec</option>
          <option value="VOD.JO">Vodacom</option>
          <option value="NPN.JO">Naspers</option>
          <option value="SOL.JO">Sasol</option>
        </select>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          What interests you most? (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Banks', 'Resource counters', 'Retailers', 'Telcos', 
            'Property', 'Broad ETFs', 'Healthcare', 'Technology'
          ].map(interest => (
            <button
              key={interest}
              type="button"
              onClick={() => {
                const newInterests = onboardingData.interests.includes(interest)
                  ? onboardingData.interests.filter(i => i !== interest)
                  : [...onboardingData.interests, interest]
                updateData('interests', newInterests)
              }}
              className={`p-3 rounded-xl border text-center transition-colors ${
                onboardingData.interests.includes(interest)
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-[#e7e9f3] bg-white text-primary-ink hover:border-brand-purple/40'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary-ink mb-2">
          What's your preferred learning style?
        </label>
        <div className="space-y-3">
          {[
            { value: 'novice', label: 'Beginner friendly', desc: 'Simple explanations, step-by-step guidance' },
            { value: 'intermediate', label: 'Moderate detail', desc: 'Balanced explanations with some depth' },
            { value: 'advanced', label: 'Deep dive', desc: 'Detailed analysis and advanced concepts' }
          ].map(style => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateData('literacy_level', style.value)}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                onboardingData.literacy_level === style.value
                  ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                  : 'border-[#e7e9f3] bg-white text-primary-ink hover:border-brand-purple/40'
              }`}
            >
              <div className="font-semibold">{style.label}</div>
              <div className="text-sm text-subtle mt-1">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return email && onboardingData.first_name && password && confirmPassword && password === confirmPassword
      case 1:
        return onboardingData.age_band && onboardingData.experience
      case 2:
        return onboardingData.goal && onboardingData.horizon && onboardingData.anchor_stock
      case 3:
        return onboardingData.interests.length > 0 && onboardingData.literacy_level
      default:
        return false
    }
  }

  const totalSteps = 4 // Step 0 (signup) + Steps 1-3 (onboarding)
  const stepNumber = currentStep + 1

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-8">
      <div className="w-full max-w-2xl px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary-ink">
              Step {stepNumber} of {totalSteps}
            </span>
            <span className="text-sm text-subtle">
              {Math.round((stepNumber / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-brand-purple h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#e7e9f3] bg-white p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10">
              <UserPlus className="h-8 w-8 text-brand-purple" />
            </div>
            <h1 className="text-3xl font-bold text-primary-ink mb-2">
              {currentStep === 0 && "Create your account"}
              {currentStep === 1 && "Tell us about yourself"}
              {currentStep === 2 && "Define your investment goals"}
              {currentStep === 3 && "Customize your experience"}
            </h1>
            <p className="text-subtle">
              {currentStep === 0 && "Join StockBuddy and start your investing journey"}
              {currentStep === 1 && "We'll personalize your experience based on your profile"}
              {currentStep === 2 && "Help us understand your investment objectives"}
              {currentStep === 3 && "Final touches to tailor your StockBuddy experience"}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-coral/40 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Navigation */}
          {currentStep > 0 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] bg-white px-6 py-3 text-sm font-semibold text-primary-ink transition hover:border-brand-purple/40 hover:text-brand-purple disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleNext}
                disabled={!isStepValid() || submitting}
                className="inline-flex items-center gap-2 rounded-full bg-brand-purple px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Creating...' : (currentStep === 3 ? 'Complete Setup' : 'Next')}</span>
                {currentStep === 3 ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          )}

          {currentStep === 0 && (
            <div className="mt-6 text-center text-sm text-subtle">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-purple hover:underline">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Signup
