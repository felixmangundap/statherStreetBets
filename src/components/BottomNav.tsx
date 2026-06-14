'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Ticket, Trophy, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/game', label: 'Game', icon: Gamepad2 },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bets', label: 'Bets', icon: Ticket },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

interface BottomNavProps {
  className?: string
}

export default function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const current = window.scrollY
        setVisible(current < lastScrollY || current < 80)
        setLastScrollY(current)
      }, 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeout)
    }
  }, [lastScrollY])

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 transition-transform duration-200',
        visible ? 'translate-y-0' : 'translate-y-full',
        className
      )}
    >
      <div className="flex items-stretch h-16 safe-bottom">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 pt-2',
                active ? 'text-emerald-400' : 'text-zinc-500'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </div>
              <span className={cn('text-[10px] font-medium', active ? 'text-emerald-400' : 'text-zinc-500')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
