'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Trophy,
  Settings,
  TrendingUp,
  Gamepad2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/game', label: 'Game', icon: Gamepad2 },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/bets', label: 'My Bets', icon: Ticket },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  className?: string
  leagueName?: string
}

export default function Sidebar({ className, leagueName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex flex-col w-64 h-full bg-zinc-900 border-r border-zinc-800',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-800">
        <TrendingUp className="w-6 h-6 text-emerald-500" />
        <div>
          <span className="font-heading font-bold text-zinc-100 text-sm tracking-tight">
            StatherStreetBets
          </span>
          {leagueName && (
            <p className="text-zinc-500 text-xs truncate max-w-[160px]">{leagueName}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
            >
              <Icon
                className={cn('w-4 h-4', active ? 'text-emerald-400' : 'text-zinc-500')}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
              userButtonTrigger: 'flex items-center gap-3 w-full p-2 rounded-lg hover:bg-zinc-800 transition-colors',
            },
          }}
          showName
        />
      </div>
    </aside>
  )
}
