export interface ArchetypeItem {
  name: string
  goal: 'growth' | 'balanced' | 'income' | 'fallback'
  risk_band: 'high' | 'medium' | 'low'
  description: string
  persona: string
  guidance: string
  anchor_cap_pct: number
  sleeves: Record<string, number>
}

// Static, front-end bundled archetypes for display (no API required)
export const archetypesData: ArchetypeItem[] = [
  {
    name: 'Dreamer',
    goal: 'growth',
    risk_band: 'high',
    description: 'Aggressive growth tilt with offshore and local equity leaders.',
    persona: 'Early-stage wealth builders comfortable with volatility.',
    guidance: 'Expect sharp drawdowns; stick with long horizons and regular reviews.',
    anchor_cap_pct: 5,
    sleeves: {
      'STX40.JO': 30,
      'STXIND.JO': 20,
      'SYGWD.JO': 15,
      'NPN.JO': 12,
      'MTN.JO': 8,
      'SBK.JO': 5,
      'SHP.JO': 5
    }
  },
  {
    name: 'Builder',
    goal: 'growth',
    risk_band: 'medium',
    description: 'Growth with a steadier hand; diversified between SA and offshore.',
    persona: 'Investors seeking growth with moderated swings.',
    guidance: 'Rebalance annually; keep contributions consistent through cycles.',
    anchor_cap_pct: 5,
    sleeves: {
      'STX40.JO': 28,
      'STXIND.JO': 18,
      'SYGWD.JO': 10,
      'STXDIV.JO': 10,
      'NPN.JO': 10,
      'SBK.JO': 9,
      'MTN.JO': 5,
      'SHP.JO': 5
    }
  },
  {
    name: 'Pathfinder',
    goal: 'balanced',
    risk_band: 'high',
    description: 'Balanced core with a growth sleeve for upside participation.',
    persona: 'Diversifiers who still want meaningful equity exposure.',
    guidance: 'Keep the growth sleeve disciplined; avoid style drift.',
    anchor_cap_pct: 5,
    sleeves: {
      'STX40.JO': 30,
      'STXDIV.JO': 15,
      'STXIND.JO': 10,
      'STXRES.JO': 10,
      'NPN.JO': 10,
      'MTN.JO': 8,
      'SBK.JO': 7,
      'SHP.JO': 5
    }
  },
  {
    name: 'Navigator',
    goal: 'balanced',
    risk_band: 'medium',
    description: 'Even-handed mix of growth and income for smoother rides.',
    persona: 'General investors prioritising steady compounding.',
    guidance: 'Reinvest distributions; widen offshore gradually if needed.',
    anchor_cap_pct: 5,
    sleeves: {
      'STX40.JO': 25,
      'STXDIV.JO': 20,
      'STXIND.JO': 15,
      'STXRES.JO': 8,
      'SBK.JO': 8,
      'NPN.JO': 7,
      'MTN.JO': 7,
      'SHP.JO': 5
    }
  },
  {
    name: 'Harvestor',
    goal: 'income',
    risk_band: 'high',
    description: 'Income-forward with an equity kicker; expects variability.',
    persona: 'Yield hunters who can stomach distribution swings.',
    guidance: 'Watch payout stability and sector concentration closely.',
    anchor_cap_pct: 5,
    sleeves: {
      'STXDIV.JO': 25,
      'GRT.JO': 15,
      'NRP.JO': 15,
      'RDF.JO': 12,
      'VKE.JO': 10,
      'SBK.JO': 8,
      'MTN.JO': 5,
      'STX40.JO': 5
    }
  },
  {
    name: 'Provider',
    goal: 'income',
    risk_band: 'medium',
    description: 'Defensive dividend and property blend targeting smoother cashflows.',
    persona: 'Income investors prioritising predictability.',
    guidance: 'Prefer resilient sectors; review coverage ratios annually.',
    anchor_cap_pct: 5,
    sleeves: {
      'STXDIV.JO': 30,
      'GRT.JO': 15,
      'RDF.JO': 10,
      'STX40.JO': 10,
      'SBK.JO': 10,
      'VKE.JO': 10,
      'MTN.JO': 5,
      'NRP.JO': 5
    }
  },
  {
    name: 'Anchor',
    goal: 'fallback',
    risk_band: 'low',
    description: 'Defensive core to steady the ship during rough markets.',
    persona: 'Capital preservers and default starting point.',
    guidance: 'Use as a ballast sleeve next to goal-driven allocations.',
    anchor_cap_pct: 5,
    sleeves: {
      'STX40.JO': 30,
      'STXDIV.JO': 25,
      'SBK.JO': 10,
      'NPN.JO': 10,
      'MTN.JO': 10,
      'STXIND.JO': 5,
      'SHP.JO': 5
    }
  }
]

export default archetypesData
