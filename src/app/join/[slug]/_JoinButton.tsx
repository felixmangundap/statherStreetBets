'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function JoinButton({ slug, leagueName }: { slug: string; leagueName: string }) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      const res = await fetch(`/api/league/${slug}/join`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to join')
      router.push('/dashboard')
    } catch {
      setError('Failed to join. Please try again.')
      setJoining(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleJoin}
        disabled={joining}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        {joining ? 'Joining…' : `Join ${leagueName}`}
      </Button>
      {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
    </div>
  )
}
