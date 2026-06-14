'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function JoinPage() {
  const router = useRouter()
  const [leagueName, setLeagueName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [inviteCode, setInviteCode] = useState('')

  async function createLeague() {
    if (!leagueName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: leagueName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create league')
      router.push('/dashboard')
    } catch {
      setCreateError('Failed to create league. Please try again.')
      setCreating(false)
    }
  }

  function joinWithCode() {
    const code = inviteCode.trim()
    if (!code) return
    // Accept either a raw slug or a full invite URL
    const slug = code.startsWith('http') ? new URL(code).pathname.split('/join/')[1] : code
    router.push(`/join/${slug}`)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
          <span className="font-heading font-bold text-2xl text-zinc-100">StatherStreetBets</span>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Join a league</CardTitle>
            <CardDescription className="text-zinc-400">
              Enter the invite code your friend shared with you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Invite code or link"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinWithCode()}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <Button
              onClick={joinWithCode}
              disabled={!inviteCode.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Join League
            </Button>
          </CardContent>
        </Card>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-base">Create a new league</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="League name (e.g. The Stathers)"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createLeague()}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
              {createError && <p className="text-rose-500 text-sm">{createError}</p>}
            </div>
            <Button
              onClick={createLeague}
              disabled={creating || !leagueName.trim()}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
            >
              {creating ? 'Creating…' : 'Create League'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
