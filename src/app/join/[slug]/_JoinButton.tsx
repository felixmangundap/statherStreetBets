'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  slug: string
  leagueName: string
  currentLeagueName: string | null
}

export default function JoinButton({ slug, leagueName, currentLeagueName }: Props) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function doJoin(replace: boolean) {
    setJoining(true)
    setError('')
    try {
      const res = await fetch(`/api/league/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace }),
      })
      if (!res.ok) throw new Error('Failed to join')
      router.push('/dashboard')
    } catch {
      setError('Failed to join. Please try again.')
      setJoining(false)
    }
  }

  function handleClick() {
    if (currentLeagueName) {
      setShowConfirm(true)
    } else {
      doJoin(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            You&apos;re currently in <span className="font-semibold">{currentLeagueName}</span>.
            Joining will remove you from that league.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConfirm(false)}
            disabled={joining}
            className="flex-1 border-zinc-700 text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            onClick={() => doJoin(true)}
            disabled={joining}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {joining ? 'Switching…' : 'Switch leagues'}
          </Button>
        </div>
        {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={joining}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        {joining ? 'Joining…' : `Join ${leagueName}`}
      </Button>
      {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
    </div>
  )
}
