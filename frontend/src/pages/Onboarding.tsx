import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface OnboardingProps {
  onComplete: (userId: number) => void
  userId: number | null
}

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

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userId }) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
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
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitStartedAt, setSubmitStartedAt] = useState<number | null>(null)

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (!userId) return
      setLoadingProfile(true)
      try {
        const response = await apiFetch(`/api/users/${userId}`)
        if (response.ok) {
          const profile = await response.json()
          setData({
            first_name: profile.first_name || '',
            age_band: profile.age_band || '',
            experience: profile.experience || '',
            goal: profile.goal || '',
            risk: profile.risk ?? 50,
            horizon: profile.horizon || '',
            anchor_stock: profile.anchor_stock || '',
            literacy_level: profile.literacy_level || '',
            interests: profile.interests || []
          })
        } else if (response.status === 404) {
          // User not found - that's OK for a new user completing signup flow, just use empty data
          // Silently handle - this is expected for users who haven't completed onboarding yet
        }
        // For other errors, silently ignore and use empty form
      } catch (error: any) {
        // Silently handle all errors - new users won't have profiles yet
        // This prevents console errors from blocking the onboarding flow
        // Network errors, 404s, etc. are all expected and handled gracefully
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchExistingProfile()
  }, [userId])

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setSubmitStartedAt(Date.now())
      const response = await apiFetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          user_id: userId
        }),
      })

      if (response.ok) {
        const result = await response.json()
        onComplete(result.user_id)
        navigate('/portfolio')
        setSubmitError(null)
      } else {
        let message = 'We could not save your preferences. Please review your inputs.'
        try {
          const err = await response.json()
          if (err?.error) {
            if (Array.isArray(err.missing) && err.missing.length) {
              message = `Missing: ${err.missing.join(', ')}`
            } else {
              message = String(err.error)
            }
          }
        } catch {}
        setSubmitError(message)
      }
    } catch (error) {
      console.error('Error during onboarding:', error)
      setSubmitError('Something went wrong. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
          What's your first name?
        </label>
        <input
          type="text"
          value={data.first_name}
          onChange={(e) => updateData('first_name', e.target.value)}
          className="input-field"
          placeholder="Enter your first name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
          What's your age range?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
            <button
              key={age}
              onClick={() => updateData('age_band', age)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                data.age_band === age
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
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
              onClick={() => updateData('experience', exp.value)}
              className={`w-full p-4 rounded-lg border text-left transition-colors ${
                data.experience === exp.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="font-medium">{exp.label}</div>
              <div className="text-sm opacity-75">{exp.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
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
              onClick={() => updateData('goal', goal.value)}
              className={`w-full p-4 rounded-lg border text-left transition-colors ${
                data.goal === goal.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="font-medium">{goal.label}</div>
              <div className="text-sm opacity-75">{goal.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
          Risk Tolerance: {data.risk}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={data.risk}
          onChange={(e) => updateData('risk', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm text-subtle dark:text-muted dark:text-gray-300 mt-1">
          <span>Conservative</span>
          <span>Aggressive</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
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
              onClick={() => updateData('horizon', horizon.value)}
              className={`w-full p-4 rounded-lg border text-left transition-colors ${
                data.horizon === horizon.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="font-medium">{horizon.label}</div>
              <div className="text-sm opacity-75">{horizon.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
          Pick your anchor stock (we'll cap it at 5% of your portfolio)
        </label>
        <select
          value={data.anchor_stock}
          onChange={(e) => updateData('anchor_stock', e.target.value)}
          className="input-field"
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
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
          What interests you most? (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Banks', 'Resource counters', 'Retailers', 'Telcos', 
            'Property', 'Broad ETFs', 'Healthcare', 'Technology'
          ].map(interest => (
            <button
              key={interest}
              onClick={() => {
                const newInterests = data.interests.includes(interest)
                  ? data.interests.filter(i => i !== interest)
                  : [...data.interests, interest]
                updateData('interests', newInterests)
              }}
              className={`p-3 rounded-lg border text-center transition-colors ${
                data.interests.includes(interest)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-2">
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
              onClick={() => updateData('literacy_level', style.value)}
              className={`w-full p-4 rounded-lg border text-left transition-colors ${
                data.literacy_level === style.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="font-medium">{style.label}</div>
              <div className="text-sm opacity-75">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return data.first_name && data.age_band && data.experience
      case 2:
        return data.goal && data.horizon && data.anchor_stock
      case 3:
        return data.interests.length > 0 && data.literacy_level
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4">
        {loadingProfile && (
          <div className="mb-4 text-sm text-gray-300 dark:text-gray-400">
            Loading your previous selections...
          </div>
        )}
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300">
              Step {currentStep} of 3
            </span>
            <span className="text-sm text-subtle dark:text-muted dark:text-gray-300">
              {Math.round((currentStep / 3) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          <h2 className="text-2xl font-bold text-brand-ink dark:text-gray-100 mb-6">
            {currentStep === 1 && "Tell us about yourself"}
            {currentStep === 2 && "Define your investment goals"}
            {currentStep === 3 && "Customize your experience"}
          </h2>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!isStepValid() || submitting}
              className="btn-cta flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{submitting ? 'Finishing…' : (currentStep === 3 ? 'Complete Setup' : 'Next')}</span>
              {currentStep === 3 ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {submitError && (
            <p className="mt-4 text-sm text-danger-600 dark:text-danger-500">{submitError}</p>
          )}
        </div>
      </div>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="card max-w-md w-full text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-purple mx-auto" />
            <h3 className="text-lg font-semibold text-brand-ink dark:text-gray-100">Setting up your plan…</h3>
            <p className="text-sm text-muted dark:text-gray-300">
              We’re saving your preferences and preparing your starter options.
            </p>
            {submitStartedAt && Date.now() - submitStartedAt > 7000 && (
              <button onClick={() => navigate('/portfolio')} className="btn-secondary mt-2">Continue to portfolio</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Onboarding
