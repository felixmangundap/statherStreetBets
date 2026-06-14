import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatInTimeZone } from 'date-fns-tz'
import type { BetStatus } from '@/db/schema'

const EST = 'America/New_York'

export function fmtEst(date: Date | string | number, fmt: string): string {
  return formatInTimeZone(new Date(date), EST, fmt)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcPayout(stake: number, odds: number, status: BetStatus): number {
  if (status === 'won') return stake * odds
  if (status === 'lost' || status === 'pending') return 0
  return 0
}

export function calcROI(stake: number, netPnl: number): number {
  if (stake === 0) return 0
  return (netPnl / stake) * 100
}

export function calcWinRate(won: number, total: number): number {
  if (total === 0) return 0
  return (won / total) * 100
}

export function calcCombinedOdds(legs: { odds: number }[]): number {
  return legs.reduce((product, leg) => product * leg.odds, 1)
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}
