import { useEffect, useRef, useState } from 'react'

/**
 * Full-screen celebration overlay for a PPWEC module completion:
 * trophy pop, badge name, coin count-up animation, confetti particles.
 *
 * Respects prefers-reduced-motion (no confetti/count-up — static reveal).
 * Dismissed by click, Escape, or auto after 6s.
 */
export default function PpwecCelebration({ show, badgeName, coins, score, onClose }) {
  const reduced = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      : false
  ).current
  const [displayCoins, setDisplayCoins] = useState(reduced ? (coins || 0) : 0)
  const [leaving, setLeaving] = useState(false)

  // Coin count-up (skip when reduced motion)
  useEffect(() => {
    if (!show || reduced || !coins) return
    const duration = 1200
    const t0 = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setDisplayCoins(Math.round(eased * coins))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [show, coins, reduced])

  // Auto-dismiss + Escape
  useEffect(() => {
    if (!show) return
    setLeaving(false)
    const onKey = (e) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', onKey)
    const timer = setTimeout(dismiss, 6000)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => {
      setDisplayCoins(0)
      onClose?.()
    }, reduced ? 0 : 200)
  }

  const confetti = reduced
    ? []
    : Array.from({ length: 14 }, (_, i) => ({
        left: `${6 + (i * 89) % 88}%`,
        delay: `${(i % 7) * 0.12}s`,
        color: ['#f59e0b', '#34d399', '#22d3ee', '#a78bfa', '#f472b6'][i % 5],
        size: 6 + (i % 3) * 3,
      }))

  return (
    <div
      role='alertdialog'
      aria-modal='true'
      aria-label='Module completed celebration'
      onClick={dismiss}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Confetti */}
      {!reduced && (
        <div aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden'>
          {confetti.map((c, i) => (
            <span
              key={i}
              className='ppwec-confetti absolute top-[-16px] rounded-sm'
              style={{
                left: c.left,
                width: c.size,
                height: c.size * 1.6,
                backgroundColor: c.color,
                animationDelay: c.delay,
              }}
            />
          ))}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative mx-4 w-full max-w-sm rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#1a2135] to-[#111827] p-8 text-center shadow-2xl transition-transform duration-200 ${leaving ? 'scale-95' : 'ppwec-pop'}`}
      >
        <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 ring-4 ring-amber-500/30'>
          <span aria-hidden className='text-5xl ppwec-trophy'>🏆</span>
        </div>

        <h2 className='mt-4 text-xl font-black text-white'>Module Completed!</h2>
        <p className='mt-1 text-xs font-semibold text-amber-300'>
          Badge earned: {badgeName || 'Module Champion'}
        </p>
        {typeof score === 'number' && (
          <p className='mt-0.5 text-[11px] text-slate-400'>Score: {score}%</p>
        )}

        <div className='mt-5 flex items-center justify-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3'>
          <span aria-hidden className='h-6 w-6 rounded-full bg-amber-400 shadow-[inset_0_-2px_2px_rgba(0,0,0,0.25)]' />
          <span className='text-2xl font-black tabular-nums text-amber-400' data-testid='celebration-coins'>
            +{displayCoins}
          </span>
          <span className='text-xs font-bold uppercase tracking-wider text-amber-300/80'>coins</span>
        </div>

        <button
          onClick={dismiss}
          className='mt-6 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500'
        >
          Continue Learning
        </button>
        <p className='mt-3 text-[10px] text-slate-500'>
          Your streak and leaderboard position update instantly
        </p>
      </div>
    </div>
  )
}
