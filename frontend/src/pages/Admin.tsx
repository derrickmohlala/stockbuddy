import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { Shield, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface UserData {
  id: number
  email: string
  first_name: string
  is_admin: boolean
  age_band: string | null
  experience: string | null
  goal: string | null
  risk: number | null
  horizon: string | null
  anchor_stock: string | null
  literacy_level: string | null
  is_onboarded: boolean
  created_at: string | null
}

const Admin: React.FC = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '50'
      })
      if (search.trim()) {
        params.append('search', search.trim())
      }
      
      const response = await apiFetch(`/api/admin/users?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
      setTotalPages(data.pages || 1)
      setTotalUsers(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers()
    }
  }, [user, fetchUsers])

  useEffect(() => {
    // Reset to page 1 when search changes
    setPage(1)
  }, [search])

  if (!user?.is_admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="mx-auto h-12 w-12 text-muted" />
          <h2 className="text-2xl font-bold text-primary-ink">Access Denied</h2>
          <p className="text-subtle">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'N/A'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-primary-ink mb-2">Admin Dashboard</h1>
          <p className="text-subtle">Manage users and view system data</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-brand-coral/40 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-[#e7e9f3] bg-white p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by email or name..."
              className="w-full rounded-full border border-[#e7e9f3] bg-white pl-10 pr-4 py-2 text-sm text-primary-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
            />
          </div>
          <div className="text-sm font-semibold text-subtle">
            Total users: {totalUsers}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-purple" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-subtle">
            <p>No users found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#e7e9f3]">
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Admin</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Onboarded</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Goal</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Risk</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-[#e7e9f3] hover:bg-[#f7f8fb]">
                      <td className="px-4 py-3 text-muted">{user.id}</td>
                      <td className="px-4 py-3 font-medium text-primary-ink">{user.first_name}</td>
                      <td className="px-4 py-3 text-subtle">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.is_admin ? (
                          <span className="inline-flex items-center rounded-full bg-brand-purple/10 px-2 py-1 text-xs font-semibold text-brand-purple">
                            Admin
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_onboarded ? (
                          <span className="inline-flex items-center rounded-full bg-brand-mint/10 px-2 py-1 text-xs font-semibold text-brand-mint">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-subtle">{user.goal || '-'}</td>
                      <td className="px-4 py-3 text-subtle">{user.risk ?? '-'}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-[#e7e9f3] pt-4">
                <div className="text-sm text-subtle">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e7e9f3] px-3 py-1.5 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e7e9f3] px-3 py-1.5 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Admin

