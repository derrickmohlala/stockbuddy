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
      'STX40.JO (Top 40)': 30,
      'STXIND.JO (Industrials)': 20,
      'SYGWD.JO (World)': 25,
      'Blue chips (NPN, MTN, SBK, SHP)': 20
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
      'STX40.JO (Top 40)': 35,
      'SYGWD.JO (World)': 25,
      'Blue chips (NPN, MTN, SBK, SHP)': 30
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
      'STX40.JO (Top 40)': 30,
      'STXDIV.JO (Dividends)': 20,
      'Blue chips': 30,
      'Growth sector tilt': 15
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
      'STX40.JO (Top 40)': 30,
      'STXDIV.JO (Dividends)': 30,
      'Blue chips': 35
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
      'STXDIV.JO (Dividends)': 35,
      'REITs (GRT, NRP, RDF)': 35,
      'Blue chips': 25
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
      'STXDIV.JO (Dividends)': 40,
      'REITs (GRT, NRP, RDF)': 30,
      'Blue chips': 25
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
      'STX40.JO (Top 40)': 35,
      'STXDIV.JO (Dividends)': 35,
      'Blue chips': 25
    }
  }
]

export default archetypesData

