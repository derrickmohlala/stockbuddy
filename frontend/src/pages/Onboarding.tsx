import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { apiFetch } from '../lib/api'
import MagicInput from '../components/MagicInput'

interface OnboardingProps {
  onComplete: (userId: number) => void
  userId: number | null
}

interface OnboardingData {
  first_name: string
  age_band: string
  experience: string
  income_bracket: string
  employment_industry: string
  debt_level: string
  goal: string
  risk: number
  horizon: string
  anchor_stock: string
  literacy_level: string
  interests: string[]
}

const INCOME_BRACKETS = [
  'R0 - R10,000', 'R10,001 - R25,000', 'R25,001 - R50,000',
  'R50,001 - R100,000', 'R100,001+'
]

const INDUSTRIES = [
  'Finance', 'Technology', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Public Sector', 'Mining', 'Energy', 'Other'
]

const DEBT_LEVELS = [
  'None', 'Low (Minor credit)', 'Medium (Vehicle/Personal)', 'High (Multiple loans)'
]

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userId }) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1) // 1=Magic, 2=Personal, 3=Goals, 4=Interests
  const [data, setData] = useState<OnboardingData>({
    first_name: '',
    age_band: '',
    experience: '',
    income_bracket: '',
    employment_industry: '',
    debt_level: '',
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

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiRationale, setAiRationale] = useState<string | null>(null)

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
            income_bracket: profile.income_bracket || '',
            employment_industry: profile.employment_industry || '',
            debt_level: profile.debt_level || '',
            goal: profile.goal || '',
            risk: profile.risk ?? 50,
            horizon: profile.horizon || '',
            anchor_stock: profile.anchor_stock || '',
            literacy_level: profile.literacy_level || '',
            interests: profile.interests || []
          })
          // If profile exists AND has a meaningful goal, skip magic step
          // But for a fresh user, goal should be null/empty, so we stay on Step 1
          if (profile.goal && profile.goal.trim().length > 0) {
            setCurrentStep(2)
          }
        }
      } catch (error: any) {
        // Silently handle
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchExistingProfile()
  }, [userId])

  const handleNext = () => {
    if (currentStep < 4) {
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

  const handleAIAnalyze = async (text: string) => {
    setIsAnalyzing(true)
    try {
      const res = await apiFetch('/api/ai/analyze-profile', {
        method: 'POST',
        body: JSON.stringify({ text })
      })
      if (res.ok) {
        const prediction = await res.json()
        setData(prev => ({
          ...prev,
          goal: prediction.goal || prev.goal,
          risk: prediction.risk_score || prev.risk,
          horizon: prediction.horizon || prev.horizon,
          anchor_stock: prediction.anchor_stock || prev.anchor_stock,
          interests: prediction.interests || prev.interests,
        }))
        setAiRationale(prediction.rationale)
        // Move to review steps
        setCurrentStep(2)
      } else {
        console.error("AI Analysis failed")
        // Just move next manually
        setCurrentStep(2)
      }
    } catch (e) {
      console.error(e)
      setCurrentStep(2)
    } finally {
      setIsAnalyzing(false)
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
        } catch { }
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

  // --- Render Steps ---

  const renderMagicStep = () => (
    <div className="flex flex-col items-center">
      <MagicInput onAnalyze={handleAIAnalyze} isAnalyzing={isAnalyzing} />
      {/* Fallback link */}
      <div className="mt-8 text-center">
        <button
          onClick={handleNext}
          className="text-sm text-slate-400 hover:text-brand-ink dark:hover:text-white transition-colors"
        >
          I'd rather fill it out manually &rarr;
        </button>
      </div>
    </div>
  )

  const renderPersonalDetails = () => (
    <div className="space-y-6">
      {aiRationale && (
        <div className="p-4 bg-brand-context/10 border border-brand-context/20 rounded-xl text-sm text-brand-ink dark:text-gray-200">
          <strong>Initial thought:</strong> {aiRationale}
        </div>
      )}
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
              className={`p-3 rounded-lg border text-center transition-colors ${data.age_band === age
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
              className={`w-full p-4 rounded-lg border text-left transition-colors ${data.experience === exp.value
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

      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-muted dark:text-gray-200 mb-2">
            Monthly Income Bracket
          </label>
          <select
            value={data.income_bracket}
            onChange={(e) => updateData('income_bracket', e.target.value)}
            className="input-field"
          >
            <option value="">Select income range</option>
            {INCOME_BRACKETS.map(bracket => (
              <option key={bracket} value={bracket}>{bracket}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted dark:text-gray-200 mb-2">
            Employment Industry
          </label>
          <select
            value={data.employment_industry}
            onChange={(e) => updateData('employment_industry', e.target.value)}
            className="input-field"
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted dark:text-gray-200 mb-2">
            Debt Level
          </label>
          <select
            value={data.debt_level}
            onChange={(e) => updateData('debt_level', e.target.value)}
            className="input-field"
          >
            <option value="">Select debt level</option>
            {DEBT_LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  const renderGoals = () => (
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
              className={`w-full p-4 rounded-lg border text-left transition-colors ${data.goal === goal.value
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
              className={`w-full p-4 rounded-lg border text-left transition-colors ${data.horizon === horizon.value
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
          <option value="SHP.JO">Shoprite</option>
        </select>
      </div>
    </div>
  )

  const renderInterests = () => (
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
              className={`p-3 rounded-lg border text-center transition-colors ${data.interests.includes(interest)
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
              className={`w-full p-4 rounded-lg border text-left transition-colors ${data.literacy_level === style.value
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
        return true // Magic step is always valid to skip
      case 2:
        return data.first_name && data.age_band && data.experience && data.income_bracket && data.employment_industry
      case 3:
        return data.goal && data.horizon && data.anchor_stock
      case 4:
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
              Step {currentStep} of 4
            </span>
            <span className="text-sm text-subtle dark:text-muted dark:text-gray-300">
              {Math.round((currentStep / 4) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        {!isAnalyzing && currentStep === 1 ? (
          // Magic Step Render (No card styling to allow full width effect/custom style)
          renderMagicStep()
        ) : (
          <div className="card">
            <h2 className="text-2xl font-bold text-brand-ink dark:text-gray-100 mb-6">
              {currentStep === 2 && "Confirm your details"}
              {currentStep === 3 && "Review your goals"}
              {currentStep === 4 && "Customize your experience"}
            </h2>

            {currentStep === 2 && renderPersonalDetails()}
            {currentStep === 3 && renderGoals()}
            {currentStep === 4 && renderInterests()}

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
                <span>{submitting ? 'Finishing…' : (currentStep === 4 ? 'Complete Setup' : 'Next')}</span>
                {currentStep === 4 ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {submitError && (
              <p className="mt-4 text-sm text-danger-600 dark:text-danger-500">{submitError}</p>
            )}
          </div>
        )}
      </div>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="card max-w-md w-full text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-coral mx-auto" />
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
