import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        <Skeleton className="h-4 w-32 bg-zinc-800" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        <Skeleton className="h-7 w-20 bg-zinc-800 rounded-md" />
        <Skeleton className="h-7 w-20 bg-zinc-800 rounded-md" />
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
            <Skeleton className="h-3 w-16 bg-zinc-800" />
            <Skeleton className="h-7 w-24 bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Leaderboard rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
            <Skeleton className="w-6 h-5 bg-zinc-800" />
            <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
            <Skeleton className="h-4 w-28 bg-zinc-800" />
            <div className="ml-auto flex gap-6">
              <Skeleton className="h-4 w-16 bg-zinc-800" />
              <Skeleton className="h-4 w-10 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Fixture cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
            <Skeleton className="h-3 w-20 bg-zinc-800" />
            <Skeleton className="h-10 w-full bg-zinc-800 rounded-lg" />
            <Skeleton className="h-8 w-full bg-zinc-800 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
