'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Copy, LogOut, RefreshCw, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

const CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'CAD']
const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Paris', 'America/New_York',
  'America/Los_Angeles', 'America/Chicago', 'Asia/Singapore', 'Australia/Sydney',
]

interface LeagueData {
  id: number
  name: string
  slug: string
  adminId: number
}

interface UserData {
  id: number
  displayName: string
  currency: string
  timezone: string
}

export default function SettingsPage() {
  const { data: userData, mutate: mutateUser } = useSWR<UserData>('/api/user/me', fetcher)
  const { data: leagueData, mutate: mutateLeague } = useSWR<LeagueData>('/api/league/me', fetcher)

  const [displayName, setDisplayName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('UTC')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [leagueName, setLeagueName] = useState('')
  const [savingLeague, setSavingLeague] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [leavingLeague, setLeavingLeague] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName)
      setCurrency(userData.currency)
      setTimezone(userData.timezone)
    }
  }, [userData])

  useEffect(() => {
    if (leagueData) setLeagueName(leagueData.name)
  }, [leagueData])

  async function saveProfile() {
    setSavingProfile(true)
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, currency, timezone }),
      })
      mutateUser()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveLeague() {
    setSavingLeague(true)
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueName }),
      })
      mutateLeague()
    } finally {
      setSavingLeague(false)
    }
  }

  async function regenerateSlug() {
    if (!confirm('This will invalidate the current invite link. Continue?')) return
    setRegenerating(true)
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSlug: true }),
      })
      mutateLeague()
    } finally {
      setRegenerating(false)
    }
  }

  async function leaveLeague() {
    setLeavingLeague(true)
    try {
      await fetch('/api/league/me', { method: 'DELETE' })
      mutateLeague()
      window.location.href = '/join'
    } finally {
      setLeavingLeague(false)
      setLeaveConfirm(false)
    }
  }

  async function syncFixtures() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/sync-fixtures', { method: 'POST' })
      const data = await res.json()
      setSyncResult(res.ok ? `Synced ${data.synced} fixtures` : 'Sync failed')
      setTimeout(() => setSyncResult(null), 4000)
    } catch {
      setSyncResult('Sync failed')
      setTimeout(() => setSyncResult(null), 4000)
    } finally {
      setSyncing(false)
    }
  }

  function copyInviteLink() {
    if (!leagueData) return
    const url = `${window.location.origin}/join/${leagueData.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inviteUrl = leagueData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${leagueData.slug}`
    : ''

  const isAdmin = leagueData && userData && leagueData.adminId === userData.id

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 font-heading">Settings</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Manage your profile and league</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
          <TabsTrigger value="profile" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
            Profile
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="league" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
              League
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Timezone</label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={saveProfile}
              disabled={savingProfile}
              className={cn(
                'gap-2',
                profileSaved
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
              )}
            >
              {profileSaved ? (
                <><Check className="w-4 h-4" /> Saved</>
              ) : (
                <><Save className="w-4 h-4" /> Save Profile</>
              )}
            </Button>
          </div>

          {leagueData && !isAdmin && (
            <div className="mt-4 bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">League</h3>
              <p className="text-zinc-500 text-xs">
                You&apos;re a member of <span className="text-zinc-300">{leagueData.name}</span>.
              </p>
              {leaveConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-rose-400">Are you sure you want to leave <span className="font-semibold">{leagueData.name}</span>?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLeaveConfirm(false)}
                      disabled={leavingLeague}
                      className="border-zinc-700 text-zinc-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={leaveLeague}
                      disabled={leavingLeague}
                      className="bg-rose-600 hover:bg-rose-500 text-white"
                    >
                      {leavingLeague ? 'Leaving…' : 'Leave league'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeaveConfirm(true)}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Leave league
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="league">
            <div className="space-y-4">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300">League Settings</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">League Name</label>
                  <div className="flex gap-2">
                    <Input
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                    <Button
                      onClick={saveLeague}
                      disabled={savingLeague}
                      className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 shrink-0"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300">Fixtures</h3>
                <p className="text-zinc-500 text-xs">Manually pull the latest match statuses and scores from the API.</p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={syncFixtures}
                    disabled={syncing}
                    className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 gap-2"
                  >
                    <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
                    {syncing ? 'Syncing…' : 'Sync Fixtures'}
                  </Button>
                  {syncResult && (
                    <span className={cn('text-xs', syncResult.startsWith('Synced') ? 'text-emerald-400' : 'text-rose-400')}>
                      {syncResult}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300">Invite</h3>
                <p className="text-zinc-500 text-xs">
                  Share the invite code or full link. Friends can enter the code at{' '}
                  <span className="text-zinc-400 font-mono">/join</span>.
                </p>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Invite code</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 font-mono tracking-wider">
                      {leagueData?.slug ?? '—'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (leagueData) {
                          navigator.clipboard.writeText(leagueData.slug)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }
                      }}
                      className={cn(
                        'border-zinc-700 gap-1 shrink-0',
                        copied ? 'text-emerald-400 border-emerald-500/50' : 'text-zinc-300'
                      )}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Full invite link</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-400 font-mono truncate">
                      {inviteUrl}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                      className="border-zinc-700 text-zinc-300 shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateSlug}
                  disabled={regenerating}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1"
                >
                  <RefreshCw className={cn('w-4 h-4', regenerating && 'animate-spin')} />
                  Regenerate Link
                </Button>
                <p className="text-zinc-600 text-xs">
                  Regenerating invalidates the current invite link immediately.
                </p>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
