import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Trophy, Medal } from 'lucide-react'
import { gamificationApi } from '@/api/gamification'
import { useAuthStore } from '@/store/authStore'

const Coin = ({ className = 'h-3.5 w-3.5' }) => (
  <span className={`inline-block ${className} rounded-full bg-amber-400 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.25)]`} aria-hidden />
)

const GROUP_LABELS = {
  daily: { label: 'Daily Activities', icon: '✓' },
  learning: { label: 'Learning', icon: '📄' },
  practice: { label: 'Practice', icon: '📖' },
}

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
}

function useLeaderboardPath() {
  const role = useAuthStore((state) => state.role)
  return `/${role || 'trainee'}/leaderboard`
}

export function CoinWidget() {
  const [open, setOpen] = useState(false)
  const [wallet, setWallet] = useState(null)
  const [history, setHistory] = useState([])
  const dropRef = useRef(null)
  const navigate = useNavigate()
  const lbPath = useLeaderboardPath()

  const refresh = () => {
    gamificationApi.wallet()
      .then(({ data }) => setWallet(data))
      .catch(() => {})
  }

  useEffect(() => {
    refresh()
    // Learning flows award coins server-side — refresh on their signal.
    window.addEventListener('coins:refresh', refresh)
    return () => window.removeEventListener('coins:refresh', refresh)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !history.length) {
      try {
        const { data } = await gamificationApi.history(10)
        setHistory(data)
      } catch { /* silent */ }
    }
  }

  if (!wallet) return null

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-all"
        title="Your coins"
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-controls='coins-panel'
      >
        <Coin className="h-4 w-4" />
        <span data-testid="coin-balance">{wallet.total_coins}</span>
      </button>

      {open && (
        <section id='coins-panel' role='dialog' aria-label='Coin wallet'
          className="absolute right-0 top-full mt-2 w-[340px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden">
          {/* Total coins hero */}
          <div className="m-3 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-700/10 border border-amber-500/20 p-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-lg" aria-hidden>🪙</div>
              <p className="text-[11px] font-semibold text-amber-200/80">Total coins</p>
            </div>
            <p className="mt-1 text-3xl font-extrabold text-white flex items-center gap-2" data-testid="wallet-total">
              {wallet.total_coins} <Coin className="h-5 w-5" />
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-black/20 px-2.5 py-2">
                <p className="flex items-center gap-1 text-xs font-bold text-amber-300"><ArrowUpRight className="h-3 w-3" /> {wallet.month_coins} <Coin className="h-2.5 w-2.5" /></p>
                <p className="text-[10px] text-slate-400 mt-0.5">This Month</p>
              </div>
              <div className="rounded-xl bg-black/20 px-2.5 py-2">
                <p className="flex items-center gap-1 text-xs font-bold text-slate-200"><Trophy className="h-3 w-3 text-amber-400" /> #{wallet.global_rank ?? '—'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Global Rank</p>
              </div>
              <div className="rounded-xl bg-black/20 px-2.5 py-2">
                <p className="flex items-center gap-1 text-xs font-bold text-slate-200"><Medal className="h-3 w-3 text-rose-400" /> {wallet.college_rank ? `#${wallet.college_rank}` : '—'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Plant Rank</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="px-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-bold text-white">Coin Breakdown</p>
            <button
              onClick={() => { setOpen(false); navigate(lbPath) }}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Earning history <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3 py-2">
            {Object.entries(GROUP_LABELS).map(([key, { label, icon }]) => (
              <div key={key} className="rounded-xl border border-slate-700/70 bg-slate-800/40 px-2.5 py-2">
                <p className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                  <span aria-hidden>{icon}</span> {label}
                </p>
                <p className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1">
                  {wallet.breakdown?.[key] ?? 0} <Coin className="h-2.5 w-2.5" />
                </p>
              </div>
            ))}
          </div>

          {/* Leaderboard teaser */}
          <div className="px-3 pb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-white">Leaderboard</p>
            <button
              onClick={() => { setOpen(false); navigate(lbPath) }}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300"
            >
              View all →
            </button>
          </div>

          {/* Recent earnings */}
          {history.length > 0 && (
            <div className="mx-3 mb-3 max-h-28 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/60">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                  <span className="text-slate-300 capitalize">{h.activity_type.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1">+{h.coins} <Coin className="h-2 w-2" /></span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export function StreakWidget() {
  const [open, setOpen] = useState(false)
  const [streak, setStreak] = useState(null)
  const dropRef = useRef(null)

  useEffect(() => {
    const refresh = () => {
      gamificationApi.getStreak()
        .then(({ data }) => setStreak(data))
        .catch(() => {})
    }
    refresh()
    window.addEventListener('coins:refresh', refresh)
    return () => window.removeEventListener('coins:refresh', refresh)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!streak) return null

  const activeDays = new Set(streak.week_activity || [])
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold text-xs transition-all"
        title="Your streak"
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-controls='streak-panel'
      >
        <span aria-hidden>🔥</span>
        <span data-testid="streak-count">{streak.current_streak}</span>
      </button>

      {open && (
        <section id='streak-panel' role='dialog' aria-label='Learning streak'
          className="absolute right-0 top-full mt-2 w-[320px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden">
          {/* Streak hero */}
          <div className="m-3 rounded-2xl bg-gradient-to-br from-orange-500/25 to-orange-700/10 border border-orange-500/20 p-4 flex items-center gap-4">
            <span className="text-4xl" aria-hidden>🔥</span>
            <div>
              <p className="text-3xl font-extrabold text-white leading-none" data-testid="streak-current">{streak.current_streak}</p>
              <p className="text-xs text-orange-200/80 mt-1">
                {streak.current_streak > 0 ? "You're officially on a streak" : 'Earn coins today to start a streak'}
              </p>
            </div>
          </div>

          {/* Week strip */}
          <div className="px-4 pb-1 flex items-center justify-between">
            <p className="text-xs font-bold text-white">THIS WEEK</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5 px-4 py-2" data-testid="streak-week">
            {days.map((d, i) => {
              const day = i + 1
              const active = activeDays.has(day)
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400">{d}</span>
                  <div className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm ${
                    active
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                      : 'bg-slate-800/40 border-slate-700 text-slate-600'
                  }`} aria-label={active ? `${d}: active` : `${d}: inactive`}>
                    {active ? '🔥' : ''}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-4 pb-4">
            <p className="text-[11px] text-slate-400">
              Longest streak: <span className="font-bold text-slate-200">{streak.longest_streak} days</span>
              {' · '}Every 7-day streak earns <span className="font-bold text-amber-400">+20 bonus coins</span>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
