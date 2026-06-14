'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { formatCurrency, fmtEst } from '@/lib/utils'

interface ChartDataPoint {
  date: string
  pnl: number
}

interface PLChartProps {
  data: ChartDataPoint[]
  currency?: string
}

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
  currency?: string
}) {
  if (!active || !payload || !payload.length) return null

  const pnlPos = payload.find(p => p.dataKey === 'pnlPos')?.value ?? 0
  const pnlNeg = payload.find(p => p.dataKey === 'pnlNeg')?.value ?? 0
  const pnl = pnlPos !== 0 ? pnlPos : pnlNeg
  const isPositive = pnl >= 0

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-xs mb-1">
        {label ? fmtEst(label, 'MMM d, yyyy') : ''}
      </p>
      <p className={`text-sm font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? '+' : ''}{formatCurrency(pnl, currency)}
      </p>
    </div>
  )
}

function formatYAxis(value: number, currency: string) {
  const abs = Math.abs(value)
  const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    .format(0)
    .replace(/[\d.,\s]/g, '')
  if (abs >= 1000) return `${value < 0 ? '-' : ''}${symbol}${(abs / 1000).toFixed(1)}k`
  return `${value < 0 ? '-' : ''}${symbol}${abs.toFixed(0)}`
}

export default function PLChart({ data, currency = 'USD' }: PLChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-zinc-500 text-sm">
        No settled bets yet — P&L chart will appear here
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date,
    pnlPos: Math.max(0, d.pnl),
    pnlNeg: Math.min(0, d.pnl),
  }))

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0} />
              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.25} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtEst(v, 'MMM d')}
            tick={{ fill: '#71717A', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={(v) => formatYAxis(v, currency)}
            tick={{ fill: '#71717A', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ stroke: '#3F3F46', strokeWidth: 1 }}
          />

          <ReferenceLine y={0} stroke="#3F3F46" strokeDasharray="4 4" />

          <Area
            type="monotone"
            dataKey="pnlPos"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#gradPos)"
            dot={false}
            activeDot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="pnlNeg"
            stroke="#F43F5E"
            strokeWidth={2}
            fill="url(#gradNeg)"
            dot={false}
            activeDot={{ r: 4, fill: '#F43F5E', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
