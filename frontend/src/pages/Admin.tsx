import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../lib/api'
import { Shield, Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Download, Edit2, X, Phone, Target, Activity } from 'lucide-react'

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
  cellphone: string | null
  province: string | null
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

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<UserData>>({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#e7e9f3] px-4 py-2 text-sm font-semibold text-primary-ink transition hover:bg-[#f7f8fb] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={async () => {
              try {
                setExporting(true)
                const response = await apiFetch('/api/admin/users/export')
                if (!response.ok) throw new Error('Export failed')
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `stockbuddy_users_${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
              } catch (err: any) {
                setError(err.message)
              } finally {
                setExporting(false)
              }
            }}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full bg-brand-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-coral/90 disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Users
          </button>
        </div>
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
              className="w-full rounded-full border border-[#e7e9f3] bg-white pl-10 pr-4 py-2 text-sm text-primary-ink focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
            />
          </div>
          <div className="text-sm font-semibold text-subtle">
            Total users: {totalUsers}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-coral" />
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
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Goal</th>
                    <th className="px-4 py-3 text-left font-semibold text-primary-ink">Created</th>
                    <th className="px-4 py-3 text-right font-semibold text-primary-ink">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-[#e7e9f3] hover:bg-[#f7f8fb]">
                      <td className="px-4 py-3 text-muted">{user.id}</td>
                      <td className="px-4 py-3 font-medium text-primary-ink">{user.first_name}</td>
                      <td className="px-4 py-3 text-subtle">{user.email}</td>
                      <td className="px-4 py-3 text-subtle">{user.cellphone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-subtle">{user.goal || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setEditData(user)
                            setIsEditing(false)
                          }}
                          className="inline-flex items-center gap-1 text-brand-coral hover:underline font-semibold"
                        >
                          Details
                        </button>
                      </td>
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

      {/* User Details & Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#e7e9f3] bg-[#f7f8fb] px-8 py-4">
              <h3 className="text-xl font-bold text-primary-ink">
                {isEditing ? 'Edit User Record' : 'User Inspector'}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-2 hover:bg-gray-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Header Info */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-brand-coral/10 flex items-center justify-center text-2xl font-bold text-brand-coral">
                  {selectedUser.first_name?.[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-primary-ink">{selectedUser.first_name}</h4>
                  <p className="text-subtle">{selectedUser.email}</p>
                  <div className="mt-2 flex gap-2">
                    {selectedUser.is_admin && (
                      <span className="badge bg-brand-coral/10 text-brand-coral rounded-full px-2 py-1 text-[10px] font-bold">System Admin</span>
                    )}
                    <span className="badge bg-gray-100 text-subtle rounded-full px-2 py-1 text-[10px] font-bold">ID: {selectedUser.id}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Contact Details */}
                <div className="space-y-4">
                  <h5 className="flex items-center gap-2 text-sm font-black text-muted tracking-widest uppercase">
                    <Phone className="h-4 w-4" /> Contact
                  </h5>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-xl border border-[#e7e9f3] p-3 text-sm"
                        value={editData.cellphone || ''}
                        onChange={(e) => setEditData({ ...editData, cellphone: e.target.value })}
                        placeholder="Phone number"
                      />
                      <input
                        className="w-full rounded-xl border border-[#e7e9f3] p-3 text-sm"
                        value={editData.province || ''}
                        onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                        placeholder="Province"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p className="text-primary-ink"><strong>Phone:</strong> {selectedUser.cellphone || 'N/A'}</p>
                      <p className="text-primary-ink"><strong>Province:</strong> {selectedUser.province || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div className="space-y-4">
                  <h5 className="flex items-center gap-2 text-sm font-black text-muted tracking-widest uppercase">
                    <Target className="h-4 w-4" /> Investment Profile
                  </h5>
                  {isEditing ? (
                    <div className="space-y-3">
                      <select
                        className="w-full rounded-xl border border-[#e7e9f3] p-3 text-sm"
                        value={editData.goal || ''}
                        onChange={(e) => setEditData({ ...editData, goal: e.target.value })}
                      >
                        <option value="growth">Growth</option>
                        <option value="balanced">Balanced</option>
                        <option value="income">Income</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Risk:</span>
                        <input
                          type="range" min="0" max="100"
                          className="flex-1 accent-brand-coral"
                          value={editData.risk || 0}
                          onChange={(e) => setEditData({ ...editData, risk: parseInt(e.target.value) })}
                        />
                        <span className="text-xs font-bold text-brand-coral">{editData.risk}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-primary-ink">
                      <p className="capitalize"><strong>Goal:</strong> {selectedUser.goal || 'Not set'}</p>
                      <p><strong>Risk:</strong> {selectedUser.risk}%</p>
                      <p className="capitalize"><strong>Experience:</strong> {selectedUser.experience || 'Novice'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* System Info */}
              <div className="border-t border-[#e7e9f3] pt-6">
                <h5 className="flex items-center gap-2 text-sm font-black text-muted tracking-widest uppercase mb-4">
                  <Activity className="h-4 w-4" /> System Metadata
                </h5>
                <div className="grid gap-4 text-xs text-subtle md:grid-cols-2">
                  <p><strong>Acount Created:</strong> {formatDate(selectedUser.created_at)}</p>
                  <p><strong>Age Band:</strong> {selectedUser.age_band || 'N/A'}</p>
                  <p><strong>Time Horizon:</strong> {selectedUser.horizon || 'N/A'}</p>
                  <p><strong>Anchor Choice:</strong> {selectedUser.anchor_stock || 'None'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e7e9f3] px-8 py-5 bg-[#f7f8fb] flex items-center justify-between">
              {isEditing ? (
                <div className="flex gap-3 w-full">
                  <button
                    disabled={saving}
                    onClick={async () => {
                      try {
                        setSaving(true)
                        const response = await apiFetch(`/api/admin/users/${selectedUser.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(editData)
                        })
                        if (!response.ok) throw new Error('Update failed')
                        const updated = await response.json()
                        setUsers(users.map(u => u.id === updated.id ? updated : u))
                        setSelectedUser(updated)
                        setIsEditing(false)
                      } catch (err: any) {
                        setError(err.message)
                      } finally {
                        setSaving(false)
                      }
                    }}
                    className="flex-1 rounded-full bg-brand-coral py-3 text-sm font-semibold text-white transition hover:bg-brand-coral/90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-full border border-[#e7e9f3] py-3 text-sm font-semibold text-primary-ink transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-coral px-6 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral hover:text-white"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Record
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-sm font-semibold text-muted hover:text-primary-ink"
                  >
                    Close Inspector
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
