import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { User, Mail, Phone, MapPin, Save, Lock, AlertCircle, Check, Briefcase, Wallet, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ProfileProps {
  userId: number | null
}

interface ProfileData {
  user_id: number
  email: string
  first_name: string
  cellphone: string
  province: string
  age_band: string
  experience: string
  goal: string
  risk: number
  horizon: string
  anchor_stock: string
  literacy_level: string
  interests: string[]
  income_bracket: string
  employment_industry: string
  debt_level: string
  is_profile_complete: boolean
}

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
]

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

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const { user: authUser, refreshUser, token } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [cellphone, setCellphone] = useState('')
  const [province, setProvince] = useState('')
  const [incomeBracket, setIncomeBracket] = useState('')
  const [industry, setIndustry] = useState('')
  const [debtLevel, setDebtLevel] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    // Use authUser.user_id if available, otherwise fall back to userId prop
    const effectiveUserId = authUser?.user_id || userId

    if (effectiveUserId || token) {
      fetchProfile()
    } else {
      // Redirect to login if not authenticated
      navigate('/login')
    }
  }, [userId, authUser, token, navigate])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      if (!token && !authUser) {
        navigate('/login')
        return
      }

      const response = await apiFetch('/api/profile')

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          navigate('/login')
          return
        }
        if (response.status === 404) {
          setProfile(null)
          setError('We could not find your profile. Please sign in again to refresh your session.')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load profile')
      }

      const data = await response.json()
      setProfile(data)

      // Populate form fields
      setEmail(data.email || '')
      setFirstName(data.first_name || '')
      setCellphone(data.cellphone || '')
      setProvince(data.province || '')
      setIncomeBracket(data.income_bracket || '')
      setIndustry(data.employment_industry || '')
      setDebtLevel(data.debt_level || '')
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message || 'Failed to load profile')
      setProfile(null)
      if (err.message?.includes('401') || err.message?.includes('403')) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const updateData: any = {
        email: email.trim(),
        first_name: firstName.trim(),
        cellphone: cellphone.trim(),
        province: province.trim(),
        income_bracket: incomeBracket,
        employment_industry: industry,
        debt_level: debtLevel
      }

      // Only include password if new password is provided
      if (newPassword) {
        const requirements = [
          { met: newPassword.length >= 8, error: 'Password must be at least 8 characters long' },
          { met: /[A-Z]/.test(newPassword), error: 'Password must contain at least one uppercase letter' },
          { met: /[a-z]/.test(newPassword), error: 'Password must contain at least one lowercase letter' },
          { met: /\d/.test(newPassword), error: 'Password must contain at least one number' },
          { met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), error: 'Password must contain at least one special character' }
        ]

        const unmet = requirements.find(r => !r.met)
        if (unmet) {
          setError(unmet.error)
          setSaving(false)
          return
        }

        if (newPassword !== confirmPassword) {
          setError('New passwords do not match')
          setSaving(false)
          return
        }

        updateData.password = newPassword
      }

      const response = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updatedData = await response.json()
      setProfile(updatedData)
      setSuccess('Profile updated successfully!')

      // Clear password fields
      setNewPassword('')
      setConfirmPassword('')

      // Refresh auth context to update user info in navbar
      if (authUser) {
        await refreshUser()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    try {
      setIsDeleting(true)
      setError(null)

      const response = await apiFetch('/api/profile', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete account')
      }

      // Logout and redirect
      localStorage.removeItem('stockbuddy_token')
      localStorage.removeItem('stockbuddy_user_id')
      window.location.href = '/'
    } catch (err: any) {
      console.error('Error deleting account:', err)
      setError(err.message || 'Failed to delete account')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-coral mx-auto mb-4"></div>
          <p className="text-subtle">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-subtle">{error || 'Profile not found'}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fetchProfile()}
              className="w-full sm:w-auto rounded-full border border-[#e7e9f3] px-6 py-2 text-sm font-semibold text-primary-ink transition hover:border-brand-coral/40 hover:text-brand-coral"
            >
              Try again
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto rounded-full bg-brand-coral px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-coral/90"
            >
              Sign in again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-primary-ink mb-2">
          Profile & Settings
        </h1>
        <p className="text-lg text-subtle">
          Manage your account information and preferences
        </p>
      </div>

      {/* Completion Banner */}
      {!profile.is_profile_complete && (
        <div className="mb-8 rounded-[28px] bg-gradient-to-r from-brand-coral to-[#ff6b6b] p-6 text-white shadow-lg shadow-brand-coral/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Star className="h-6 w-6 text-white fill-current" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Profile Incomplete</h3>
                <p className="text-white/80 text-sm">Fill in your details to unlock smarter suggestions.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Strength:</span>
              <div className="h-2 w-32 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${Object.values(profile).filter(val => val && val !== '').length * 5}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-mint/40 bg-brand-mint/10 px-4 py-3 text-sm text-brand-mint">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-coral/40 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Information Section */}
      <section className="mb-8 rounded-[28px] border border-[#e7e9f3] bg-white px-6 py-8">
        <h2 className="text-2xl font-semibold text-primary-ink mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-brand-coral" />
          Personal Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-primary-ink mb-2">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="Enter your first name"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-primary-ink mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="you@example.com"
            />
          </div>

          {/* Cellphone */}
          <div>
            <label htmlFor="cellphone" className="block text-sm font-semibold text-primary-ink mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Cellphone Number
            </label>
            <input
              id="cellphone"
              type="tel"
              value={cellphone}
              onChange={(e) => setCellphone(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="082 123 4567"
            />
          </div>

          {/* Province */}
          <div>
            <label htmlFor="province" className="block text-sm font-semibold text-primary-ink mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Province
            </label>
            <select
              id="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            >
              <option value="">Select a province</option>
              {SOUTH_AFRICAN_PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* Income Bracket */}
          <div>
            <label htmlFor="income" className="block text-sm font-semibold text-primary-ink mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Monthly Income
            </label>
            <select
              id="income"
              value={incomeBracket}
              onChange={(e) => setIncomeBracket(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            >
              <option value="">Select income range</option>
              {INCOME_BRACKETS.map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>

          {/* Employment Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-semibold text-primary-ink mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Employment Industry
            </label>
            <select
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Debt Level */}
          <div>
            <label htmlFor="debt" className="block text-sm font-semibold text-primary-ink mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Debt Level
            </label>
            <select
              id="debt"
              value={debtLevel}
              onChange={(e) => setDebtLevel(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            >
              <option value="">Select debt level</option>
              {DEBT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Password Change Section */}
      <section className="mb-8 rounded-[28px] border border-[#e7e9f3] bg-white px-6 py-8">
        <h2 className="text-2xl font-semibold text-primary-ink mb-6 flex items-center gap-2">
          <Lock className="h-6 w-6 text-brand-coral" />
          Change Password
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-primary-ink mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="Leave blank to keep current password"
            />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { label: '8+ characters', met: newPassword.length >= 8 },
                { label: 'Uppercase', met: /[A-Z]/.test(newPassword) },
                { label: 'Lowercase', met: /[a-z]/.test(newPassword) },
                { label: 'Number', met: /\d/.test(newPassword) },
                { label: 'Special char', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) }
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
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </section>

      {/* Investment Profile (Read-only) */}
      {profile.age_band && (
        <section className="mb-8 rounded-[28px] border border-[#e7e9f3] bg-white px-6 py-8">
          <h2 className="text-2xl font-semibold text-primary-ink mb-6">
            Investment Profile
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-subtle mb-1">
                Age Band
              </label>
              <p className="text-primary-ink">{profile.age_band}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-subtle mb-1">
                Experience Level
              </label>
              <p className="text-primary-ink capitalize">{profile.experience}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-subtle mb-1">
                Investment Goal
              </label>
              <p className="text-primary-ink capitalize">{profile.goal}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-subtle mb-1">
                Risk Tolerance
              </label>
              <p className="text-primary-ink">{profile.risk}%</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-subtle mb-1">
                Time Horizon
              </label>
              <p className="text-primary-ink capitalize">{profile.horizon}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-subtle mb-1">
                Anchor Stock
              </label>
              <p className="text-primary-ink">{profile.anchor_stock}</p>
            </div>
          </div>

          {profile.interests && profile.interests.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-subtle mb-2">
                Interests
              </label>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-brand-coral/10 text-brand-coral rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Save Button */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm font-semibold text-brand-coral hover:underline"
        >
          Delete Account
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="btn-cta flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Danger Zone Section (Alternative UI) */}
      <section className="mt-12 rounded-[28px] border border-brand-coral/20 bg-brand-coral/5 px-6 py-8">
        <h2 className="text-xl font-semibold text-brand-coral mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-subtle mb-6">
          Permanently delete your account and all associated data, including your simulated portfolio and trading history. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="rounded-full border border-brand-coral px-6 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral hover:text-white"
        >
          Delete My Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-primary-ink mb-4">Are you absolutely sure?</h3>
            <p className="text-subtle mb-6 leading-relaxed">
              This will permanently delete your StockBuddy account and all simulate-trading progress. There is no way to recover your data.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-primary-ink mb-2">
                Type <span className="text-brand-coral font-bold italic">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-xl border border-[#e7e9f3] bg-white px-4 py-3 text-primary-ink focus:border-brand-coral focus:outline-none"
                placeholder="DELETE"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="w-full rounded-full bg-brand-coral py-3 text-sm font-semibold text-white transition hover:bg-brand-coral/90 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={isDeleting}
                className="w-full rounded-full border border-[#e7e9f3] py-3 text-sm font-semibold text-primary-ink transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
