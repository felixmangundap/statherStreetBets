'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { mutate as globalMutate } from 'swr'
import { Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn, calcCombinedOdds, formatOdds } from '@/lib/utils'
import type { Fixture } from '@/db/schema'

interface Member {
  id: number
  displayName: string
}

interface BetModalProps {
  fixture: Fixture | null
  members: Member[]
  currentUserId: number
  open: boolean
  onClose: () => void
}

interface LegField {
  description: string
  selection: string
  odds: string
}

interface FormValues {
  userId: string
  betType: 'match_winner' | 'over_under' | 'btts' | 'accumulator' | 'custom'
  description: string
  selection: string
  odds: string
  stake: string
  currency: string
  notes: string
  legs: LegField[]
}

const BET_TYPE_OPTIONS = [
  { value: 'match_winner', label: 'Match Winner' },
  { value: 'over_under', label: 'Over / Under' },
  { value: 'btts', label: 'Both Teams to Score' },
  { value: 'accumulator', label: 'Accumulator / Parlay' },
  { value: 'custom', label: 'Custom' },
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

function BetForm({
  fixture,
  members,
  currentUserId,
  onSuccess,
}: {
  fixture: Fixture | null
  members: Member[]
  currentUserId: number
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      userId: String(currentUserId),
      betType: 'match_winner',
      description: fixture ? `${fixture.homeTeam} vs ${fixture.awayTeam}` : '',
      selection: '',
      odds: '',
      stake: '',
      currency: 'USD',
      notes: '',
      legs: [{ description: '', selection: '', odds: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'legs' })

  const betType = watch('betType')
  const legs = watch('legs')
  const isAccumulator = betType === 'accumulator'

  const combinedOdds = isAccumulator
    ? calcCombinedOdds(legs.map((l) => ({ odds: parseFloat(l.odds) || 1 })))
    : null

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        userId: parseInt(data.userId),
        betType: data.betType,
        description: data.description,
        selection: data.selection,
        odds: data.odds,
        stake: data.stake,
        currency: data.currency,
        notes: data.notes || undefined,
      }
      if (fixture) body.fixtureId = fixture.id
      if (isAccumulator) body.legs = data.legs
      if (data.betType === 'accumulator' && legs.length > 0) {
        body.selection = legs.map(l => l.selection).filter(Boolean).join(', ')
      }

      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add bet')
      }

      globalMutate('/api/bets')
      globalMutate('/api/dashboard')
      globalMutate('/api/leaderboard')
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      {/* Placing For */}
      {members.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Placing for</label>
          <Select
            value={watch('userId')}
            onValueChange={(v) => setValue('userId', v)}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.displayName}{m.id === currentUserId ? ' (you)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Fixture info */}
      {fixture && (
        <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-400">
          📍 {fixture.homeTeam} vs {fixture.awayTeam}
        </div>
      )}

      {/* Bet Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Bet Type</label>
        <Select value={betType} onValueChange={(v) => setValue('betType', v as FormValues['betType'])}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {BET_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Description</label>
        <Input
          {...register('description', { required: true })}
          placeholder="e.g. Brazil to win"
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {/* Accumulator Legs */}
      {isAccumulator ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Legs
            </label>
            {combinedOdds && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full tabular-nums font-semibold">
                Combined: {formatOdds(combinedOdds)}
              </span>
            )}
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="bg-zinc-800/40 rounded-lg p-3 space-y-2 border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">Leg {idx + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input
                {...register(`legs.${idx}.description`)}
                placeholder="Match / description"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-8 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  {...register(`legs.${idx}.selection`)}
                  placeholder="Selection"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-8 text-sm"
                />
                <Input
                  {...register(`legs.${idx}.odds`)}
                  placeholder="Odds (e.g. 2.50)"
                  type="number"
                  step="0.01"
                  min="1.01"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-8 text-sm"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', selection: '', odds: '' })}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-1 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Leg
          </Button>

          {/* Overall stake for accumulator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stake</label>
              <Input
                {...register('stake', { required: true })}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0.01"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Currency</label>
              <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {['USD', 'GBP', 'EUR', 'AUD', 'CAD'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : (
        /* Single bet fields */
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Selection</label>
            <Input
              {...register('selection', { required: !isAccumulator })}
              placeholder="e.g. Brazil to win"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Odds</label>
            <Input
              {...register('odds', { required: !isAccumulator })}
              placeholder="e.g. 2.50"
              type="number"
              step="0.01"
              min="1.01"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stake</label>
            <Input
              {...register('stake', { required: true })}
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0.01"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Currency</label>
            <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {['USD', 'GBP', 'EUR', 'AUD', 'CAD'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Notes (optional)</label>
        <Textarea
          {...register('notes')}
          placeholder="Any additional context…"
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
          rows={2}
        />
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
      >
        {submitting ? 'Adding Bet…' : 'Add Bet'}
      </Button>
    </form>
  )
}

export default function BetModal({
  fixture,
  members,
  currentUserId,
  open,
  onClose,
}: BetModalProps) {
  const isDesktop = useIsDesktop()

  const title = fixture
    ? `Bet on ${fixture.homeTeam} vs ${fixture.awayTeam}`
    : 'Add Bet'

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 font-heading">{title}</DialogTitle>
          </DialogHeader>
          <BetForm
            fixture={fixture}
            members={members}
            currentUserId={currentUserId}
            onSuccess={onClose}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onClose} modal={false}>
      <DrawerContent className="bg-zinc-900 border-t border-zinc-800 max-h-[92dvh]">
        <DrawerHeader>
          <DrawerTitle className="text-zinc-100 font-heading text-left">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <BetForm
            fixture={fixture}
            members={members}
            currentUserId={currentUserId}
            onSuccess={onClose}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
