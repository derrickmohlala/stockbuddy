import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { User, Mail, Phone, MapPin, Save, Lock, AlertCircle, Check } from 'lucide-react'
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
}

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
]

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const { user: authUser, refreshUser, token } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [cellphone, setCellphone] = useState('')
  const [province, setProvince] = useState('')
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
        province: province.trim()
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
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="btn-cta flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default Profile
