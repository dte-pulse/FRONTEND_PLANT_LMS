import { useEffect, useState } from 'react'
import { Crown, Flame, Trophy } from 'lucide-react'
import { gamificationApi } from '@/api/gamification'
import { useAuthStore } from '@/store/authStore'

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
}

const PODIUM_STYLES = [
  'h-24 bg-gradient-to-t from-indigo-800 to-indigo-500', // 1st — tallest
  'h-16 bg-gradient-to-t from-indigo-900 to-indigo-700', // 2nd
  'h-12 bg-gradient-to-t from-indigo-900 to-indigo-800', // 3rd
]

export default function LeaderboardPage() {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState(false)
  const role = useAuthStore((state) => state.role)

  useEffect(() => {
    let alive = true
    gamificationApi.leaderboard()
      .then(({ data }) => { if (alive) setBoard(data) })
      .catch(() => setError(true))
    return () => { alive = false }
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#131825] p-10 text-center text-sm text-slate-400">
        Could not load the leaderboard. Try again shortly.
      </div>
    )
  }

  if (!board) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#131825] p-10 text-center text-sm text-slate-400">
        Loading leaderboard…
      </div>
    )
  }

  const entries = board.entries || []
  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)
  const podiumOrder = [podium[1], podium[0], podium[2]] // 2nd, 1st, 3rd
  const youInList = entries.some((e) => e.is_you)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
            Leaderboard — {board.month_name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Coins reset every month — earn coins by completing learning, assignments and PPWEC modules.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#131825] p-12 text-center">
          <p className="text-3xl mb-2" aria-hidden>🪙</p>
          <p className="text-sm font-semibold text-slate-200">No coins earned yet this month</p>
          <p className="text-xs text-slate-400 mt-1">Be the first — complete a lesson or a module today!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="rounded-3xl border border-slate-800 bg-[#131825] px-6 pb-6 pt-8">
            <div className="grid grid-cols-3 items-end gap-3 max-w-2xl mx-auto">
              {podiumOrder.map((e, i) => {
                if (!e) return <div key={i} />
                const place = e.rank
                return (
                  <div key={e.user_id} className="flex flex-col items-center gap-2">
                    <div className={`flex flex-col items-center ${place === 1 ? 'order-first' : ''}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-extrabold ${
                        place === 1 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300' : 'bg-slate-700 text-slate-200'
                      }`}>
                        {initials(e.name)}
                      </div>
                      <p className="mt-1 max-w-[120px] truncate text-xs font-bold text-white">
                        {e.name}{e.is_you && <span className="text-indigo-300"> (You)</span>}
                      </p>
                      <p className="flex items-center gap-1 text-xs font-bold text-amber-400">
                        {fmt(e.coins)} <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
                      </p>
                    </div>
                    <div className={`w-full rounded-t-xl ${PODIUM_STYLES[place - 1]} flex items-start justify-center pt-2`}>
                      <span className="text-lg font-extrabold text-white">{place}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rest of the board */}
          {rest.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#131825] divide-y divide-slate-800/60">
              {rest.map((e) => (
                <div key={e.user_id}
                  className={`flex items-center gap-3 px-4 py-3 ${e.is_you ? 'bg-indigo-500/10' : ''}`}>
                  <span className="w-8 text-sm font-bold text-slate-400">#{e.rank}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-[10px] font-extrabold text-slate-200">
                    {initials(e.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {e.name} {e.is_you && <span className="text-[10px] font-bold text-indigo-300">(You)</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">{e.department || e.employee_code}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
                    {fmt(e.coins)} <span className="inline-block h-3 w-3 rounded-full bg-amber-400" aria-hidden />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Your row — only when outside the visible list */}
          {board.you && !youInList && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 flex items-center gap-3">
              <span className="w-8 text-sm font-bold text-indigo-300">#{board.you.rank}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-extrabold text-white">
                {initials(board.you.name)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">You</p>
                <p className="text-[11px] text-indigo-300">
                  {board.top5_gap ? `${fmt(board.top5_gap)} coins away from Top 5` : 'Keep learning to climb the board'}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
                {fmt(board.you.coins)} <span className="inline-block h-3 w-3 rounded-full bg-amber-400" aria-hidden />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
