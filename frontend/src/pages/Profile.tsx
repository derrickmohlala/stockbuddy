import React, { useState, useEffect } from 'react'
import { User, Settings, Download, Moon, Sun, LogOut } from 'lucide-react'

interface ProfileProps {
  userId: number | null
}

interface UserProfile {
  id: number
  first_name: string
  age_band: string
  experience: string
  goal: string
  risk: number
  horizon: string
  anchor_stock: string
  literacy_level: string
  interests: string[]
  created_at: string
}

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'data'>('profile')

  useEffect(() => {
    // Check for dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }

    if (userId) {
      fetchProfile()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      // In a real app, you'd fetch user profile from API
      // For now, we'll use mock data
      const mockProfile: UserProfile = {
        id: userId!,
        first_name: 'John',
        age_band: '25-34',
        experience: 'intermediate',
        goal: 'balanced',
        risk: 60,
        horizon: 'medium',
        anchor_stock: 'SBK.JO',
        literacy_level: 'intermediate',
        interests: ['Banks', 'ETFs', 'Property'],
        created_at: '2024-01-01T00:00:00Z'
      }
      setProfile(mockProfile)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const exportData = () => {
    if (!profile) return

    const data = {
      profile: profile,
      export_date: new Date().toISOString(),
      platform: 'StockBuddy'
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockbuddy-profile-${profile.first_name.toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const logout = () => {
    localStorage.removeItem('stockbuddy_user_id')
    localStorage.removeItem('darkMode')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted dark:text-gray-300">Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-ink dark:text-gray-100 mb-2">
            Profile & Settings
          </h1>
          <p className="text-muted dark:text-gray-300">
            Manage your account and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'settings', label: 'Settings', icon: Settings },
            { key: 'data', label: 'Data', icon: Download },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-gray-700 text-brand-ink dark:text-gray-100 shadow-sm'
                    : 'text-muted dark:text-gray-300 hover:text-brand-ink dark:text-gray-100 dark:hover:text-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-6">
              Investment Profile
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100 mb-4">
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <p className="text-brand-ink dark:text-gray-100">{profile.first_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      Age Band
                    </label>
                    <p className="text-brand-ink dark:text-gray-100">{profile.age_band}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      Experience Level
                    </label>
                    <p className="text-brand-ink dark:text-gray-100 capitalize">{profile.experience}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100 mb-4">
                  Investment Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      Investment Goal
                    </label>
                    <p className="text-brand-ink dark:text-gray-100 capitalize">{profile.goal}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      Risk Tolerance
                    </label>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${profile.risk}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted dark:text-gray-300">{profile.risk}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      Time Horizon
                    </label>
                    <p className="text-brand-ink dark:text-gray-100 capitalize">{profile.horizon}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted dark:text-gray-200 dark:text-gray-300 mb-1">
                      Anchor Stock
                    </label>
                    <p className="text-brand-ink dark:text-gray-100">{profile.anchor_stock}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100 mb-4">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-6">
              Settings
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100">
                    Dark Mode
                  </h3>
                  <p className="text-sm text-muted dark:text-gray-300">
                    Switch between light and dark themes
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100">
                    Learning Level
                  </h3>
                  <p className="text-sm text-muted dark:text-gray-300">
                    Adjust content complexity
                  </p>
                </div>
                <select className="input-field w-auto">
                  <option value="novice">Beginner friendly</option>
                  <option value="intermediate" selected>Moderate detail</option>
                  <option value="advanced">Deep dive</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100">
                    Notifications
                  </h3>
                  <p className="text-sm text-muted dark:text-gray-300">
                    Portfolio updates and market alerts
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-brand-ink dark:text-gray-100 mb-6">
              Data & Privacy
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100 mb-2">
                  Export Your Data
                </h3>
                <p className="text-sm text-muted dark:text-gray-300 mb-4">
                  Download your profile and portfolio data in JSON format
                </p>
                <button onClick={exportData} className="btn-cta flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
              </div>

              <div>
                <h3 className="text-lg font-medium text-brand-ink dark:text-gray-100 mb-2">
                  Account Actions
                </h3>
                <p className="text-sm text-muted dark:text-gray-300 mb-4">
                  Manage your account and data
                </p>
                <button onClick={logout} className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Data Privacy
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your data is stored locally and used only for educational purposes. 
                  We don't share your information with third parties.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
