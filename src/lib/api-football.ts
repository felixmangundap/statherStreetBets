const BASE = 'https://worldcup26.ir'

function headers() {
  return { Authorization: `Bearer ${process.env.WC2026_API_TOKEN}` }
}

// All numeric fields come back as strings from the API
interface RawWC2026Match {
  id: string
  type: string
  group: string | null
  home_team_id: string
  away_team_id: string
  home_team_name_en: string
  away_team_name_en: string
  finished: 'TRUE' | 'FALSE'
  time_elapsed: string
  local_date: string // "MM/DD/YYYY HH:MM" UTC
  home_score: string | null
  away_score: string | null
  stadium_id: string | null
}

export interface WC2026Match {
  id: number
  type: string
  group: string | null
  homeTeamName: string
  awayTeamName: string
  finished: boolean
  timeElapsed: string
  kickoffAt: Date
  homeScore: number | null
  awayScore: number | null
  status: string
}

function parseScore(val: string | null): number | null {
  if (!val || val === 'null') return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

// "06/11/2026 13:00" → Date (UTC)
function parseMatchDate(localDate: string): Date {
  const [datePart, timePart] = localDate.split(' ')
  const [month, day, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}T${timePart}:00Z`)
}

function normalize(raw: RawWC2026Match): WC2026Match {
  const finished = raw.finished === 'TRUE'
  let status: string
  if (finished) status = 'FT'
  else if (raw.time_elapsed !== 'notstarted') status = 'LIVE'
  else status = 'NS'

  return {
    id: parseInt(raw.id, 10),
    type: raw.type,
    group: raw.group,
    homeTeamName: raw.home_team_name_en || 'TBD',
    awayTeamName: raw.away_team_name_en || 'TBD',
    finished,
    timeElapsed: raw.time_elapsed,
    kickoffAt: parseMatchDate(raw.local_date),
    homeScore: parseScore(raw.home_score),
    awayScore: parseScore(raw.away_score),
    status,
  }
}

export async function fetchWC2026Fixtures(): Promise<WC2026Match[]> {
  const res = await fetch(`${BASE}/get/games`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`WC2026 API error: ${res.status}`)
  const data = await res.json() as { games: RawWC2026Match[] }
  return data.games.map(normalize)
}
