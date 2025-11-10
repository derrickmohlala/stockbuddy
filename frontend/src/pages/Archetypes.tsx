import React, { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface ArchetypeItem {
  name: string
  goal: string
  risk_band: string
  description: string
  persona: string
  guidance: string
  anchor_cap_pct: number
  sleeves: Record<string, number>
  total_pre_anchor?: number
}

const goalLabels: Record<string, string> = {
  growth: 'Growth',
  balanced: 'Balanced',
  income: 'Income',
  fallback: 'Fallback',
}

const riskLabels: Record<string, string> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
}

const Archetypes: React.FC = () => {
  const [archetypes, setArchetypes] = useState<ArchetypeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArchetypes = async () => {
      try {
        const response = await apiFetch('/api/archetypes')
        if (response.ok) {
          const data = await response.json()
          setArchetypes(data)
        }
      } catch (error) {
        console.error('Error fetching archetypes', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArchetypes()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted dark:text-gray-300">Loading archetypes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-brand-ink dark:text-gray-100">Portfolio archetypes</h1>
          <p className="text-lg text-muted dark:text-gray-300 max-w-3xl mx-auto">
            Each archetype blends JSE ETFs, blue chips, and income counters to match a specific goal and risk profile.
            Anchor stocks are capped at 5% to keep concentration risk in check.
          </p>
        </header>

        <div className="space-y-8">
          {archetypes.map((archetype) => {
            const sleeves = Object.entries(archetype.sleeves || {})
            const allocations = [...sleeves, ['Anchor stock (user preference)', archetype.anchor_cap_pct]]

            return (
              <div key={archetype.name} className="card bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-white/10 dark:border-gray-800/80">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="md:w-1/2 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="badge bg-white/90 text-brand-purple uppercase tracking-wide text-xs font-semibold">
                        {goalLabels[archetype.goal] || archetype.goal}
                      </span>
                      <span className="badge bg-brand-mint/20 text-brand-mint uppercase tracking-wide text-xs font-semibold">
                        {riskLabels[archetype.risk_band] || archetype.risk_band}
                      </span>
                      <span className="badge bg-brand-gold/20 text-brand-gold uppercase tracking-wide text-xs font-semibold">
                        Anchor cap {archetype.anchor_cap_pct}%
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold text-brand-ink dark:text-gray-100">{archetype.name}</h2>
                    <p className="text-muted dark:text-gray-300">{archetype.description}</p>
                    {archetype.persona && (
                      <p className="text-sm text-subtle dark:text-muted dark:text-gray-300">
                        <span className="font-medium text-brand-ink dark:text-gray-100">Who it suits:</span> {archetype.persona}
                      </p>
                    )}
                    {archetype.guidance && (
                      <p className="text-sm text-subtle dark:text-muted dark:text-gray-300">
                        <span className="font-medium text-brand-ink dark:text-gray-100">How to use it:</span> {archetype.guidance}
                      </p>
                    )}
                  </div>
                  <div className="md:w-1/2">
                    <table className="w-full text-sm">
                      <tbody>
                        {allocations.map(([label, weight]) => (
                          <tr key={label} className="border-b border-gray-200/70 dark:border-gray-700/50">
                            <td className="py-2 pr-4 text-muted dark:text-gray-200 dark:text-gray-300">{label}</td>
                            <td className="py-2 text-right font-medium text-brand-ink dark:text-gray-100">
                              {Number(weight).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Archetypes
