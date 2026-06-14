'use client'

import { useState, useEffect } from 'react'
import { mutate as globalMutate } from 'swr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { BetStatus } from '@/db/schema'

interface BetOutcomeModalProps {
  bet: {
    id: number
    description: string
    stake: string
    odds: string
    currency: string
    status: BetStatus
  }
  open: boolean
  onClose: () => void
}

const OUTCOME_OPTIONS: { value: BetStatus; label: string }[] = [
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'void', label: 'Void' },
  { value: 'cashed_out', label: 'Cashed Out' },
]

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  )
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isDesktop
}

function OutcomeForm({ bet, onClose }: { bet: BetOutcomeModalProps['bet']; onClose: () => void }) {
  const autoCalcPayout = (parseFloat(bet.stake) * parseFloat(bet.odds)).toFixed(2)

  const initialStatus: BetStatus = bet.status === 'pending' ? 'won' : bet.status
  const [status, setStatus] = useState<BetStatus>(initialStatus)
  const [payout, setPayout] = useState(initialStatus === 'won' ? autoCalcPayout : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const showPayout = status === 'won' || status === 'cashed_out'

  function handleStatusChange(v: BetStatus) {
    setStatus(v)
    if (v === 'won') setPayout(autoCalcPayout)
    else if (v !== 'cashed_out') setPayout('')
  }

  async function handleSave() {
    setSubmitting(true)
    setError('')
    try {
      const body: Record<string, unknown> = { status }
      if (showPayout && payout) body.payout = payout

      const res = await fetch(`/api/bets/${bet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save outcome')
      }

      globalMutate('/api/bets')
      globalMutate('/api/dashboard')
      globalMutate('/api/leaderboard')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-400 truncate">
        {bet.description}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Outcome</label>
        <Select value={status} onValueChange={(v) => handleStatusChange(v as BetStatus)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {OUTCOME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showPayout && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Payout ({bet.currency})
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
          {status === 'won' && (
            <p className="text-zinc-500 text-xs">
              Auto: {formatCurrency(parseFloat(autoCalcPayout), bet.currency)} (stake × odds)
            </p>
          )}
        </div>
      )}

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-zinc-700 text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={submitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
        >
          {submitting ? 'Saving…' : 'Save Outcome'}
        </Button>
      </div>
    </div>
  )
}

export default function BetOutcomeModal({ bet, open, onClose }: BetOutcomeModalProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 font-heading">Set Outcome</DialogTitle>
          </DialogHeader>
          <OutcomeForm bet={bet} onClose={onClose} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onClose} modal={false}>
      <DrawerContent className="bg-zinc-900 border-t border-zinc-800 max-h-[70dvh]">
        <DrawerHeader>
          <DrawerTitle className="text-zinc-100 font-heading text-left">Set Outcome</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <OutcomeForm bet={bet} onClose={onClose} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
