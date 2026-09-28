import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ppwecApi from '@/api/ppwec'
import PpwecCertificateModal from '@/components/ppwec/PpwecCertificateModal'
import {
  Award, CheckCircle2, ChevronRight, GraduationCap, Lock,
  Medal, Play, Sparkles, Trophy, Download,
} from 'lucide-react'

const CARD_STYLES = {
  not_started: 'border-slate-700 bg-[#111827]',
  in_progress: 'border-cyan-500/40 bg-cyan-500/5',
  assessment_pending: 'border-amber-500/40 bg-amber-500/5',
  completed: 'border-emerald-500/40 bg-emerald-500/5',
}

const BADGE_FOR = (m) => {
  const p = m.progress
  if (p.status === 'completed') return (
    <span className='flex items-center gap-1 text-[10px] font-bold text-emerald-300'>
      <Medal className='h-3.5 w-3.5' /> {m.badge_name || 'Completed'}
    </span>
  )
  if (p.status === 'assessment_pending') return (
    <span className='flex items-center gap-1 text-[10px] font-bold text-amber-300'>
      <Award className='h-3.5 w-3.5' /> Assessment ready
    </span>
  )
  if (p.status === 'in_progress') return (
    <span className='flex items-center gap-1 text-[10px] font-bold text-cyan-300'>
      <Play className='h-3.5 w-3.5' /> {p.completion_percentage}% complete
    </span>
  )
  if (m.status !== 'final') return (
    <span className='flex items-center gap-1 text-[10px] font-semibold text-slate-600'>
      <Lock className='h-3 w-3' /> Coming soon
    </span>
  )
  return (
    <span className='flex items-center gap-1 text-[10px] font-semibold text-slate-500'>
      <ChevronRight className='h-3.5 w-3.5' /> Start module
    </span>
  )
}

export default function PpwecPassportPage() {
  const navigate = useNavigate()
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCert, setShowCert] = useState(false)

  useEffect(() => {
    ppwecApi.getPassport()
      .then(({ data }) => setPassport(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500' />
      </div>
    )
  }
  if (!passport) {
    return <p className='p-8 text-center text-sm text-slate-400'>PPWEC programme is not available yet.</p>
  }

  const pct = Math.round((passport.modules_completed / Math.max(1, passport.total_modules)) * 100)

  return (
    <div className='ppwec-scope mx-auto max-w-5xl space-y-6 p-4 pb-10'>
      {/* Passport hero (§19) — PPWEC identity frame */}
      <div className='relative overflow-hidden rounded-3xl border border-[color:var(--ppwec-line)] bg-[color:var(--ppwec-surface-2)]/60 p-6'>
        <div className='absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl' />
        <div className='relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center'>
          <div>
            <span className='ppwec-section-chip'>Learning Passport™</span>
            <h1 className='mt-2 text-2xl font-bold text-[color:var(--ppwec-ink)]'>PPWEC — Professional Workplace Excellence</h1>
            <p className='mt-1 max-w-lg text-xs leading-relaxed text-[color:var(--ppwec-ink-dim)]'>
              One organization. One professional standard. One culture of excellence.
            </p>
          </div>
          <div className='flex items-center gap-6'>
            <div className='text-center'>
              <p className='text-3xl font-black text-slate-100'>
                {passport.modules_completed}<span className='text-slate-500'>/{passport.total_modules}</span>
              </p>
              <p className='text-[10px] font-bold uppercase tracking-wider text-slate-500'>Modules</p>
            </div>
            <div className='text-center'>
              <p className='text-3xl font-black text-amber-300'>{passport.total_points}</p>
              <p className='text-[10px] font-bold uppercase tracking-wider text-slate-500'>Points</p>
            </div>
            <div className='text-center'>
              <p className='text-3xl font-black text-cyan-300'>{passport.badges.length}</p>
              <p className='text-[10px] font-bold uppercase tracking-wider text-slate-500'>Badges</p>
            </div>
          </div>
        </div>
        <div className='ppwec-progress-track relative z-10 mt-5 h-2.5'>
          <div className='ppwec-progress-fill' style={{ width: `${pct}%` }} />
        </div>
        {passport.certification_earned && (
          <div className='relative z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4'>
            <Trophy className='h-8 w-8 text-amber-400' />
            <div className='flex-1'>
              <p className='text-sm font-bold text-amber-200'>Pulse Professional Excellence Champion</p>
              <p className='text-xs text-amber-200/70'>All 18 modules complete — certification earned.</p>
            </div>
            <button onClick={() => setShowCert(true)}
              className='rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400'>
              View Certificate
            </button>
          </div>
        )}
        {!passport.certification_earned && passport.modules_completed > 0 && (
          <button onClick={() => setShowCert(true)}
            className='relative z-10 mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200'>
            <Award className='h-3.5 w-3.5' /> View progress statement / certificate
          </button>
        )}
      </div>

      {/* Earned badges (§20) */}
      {passport.badges.length > 0 && (
        <div className='rounded-3xl border border-slate-800 bg-[#0F1420] p-5'>
          <h2 className='mb-3 flex items-center gap-2 text-sm font-bold text-slate-100'>
            <Medal className='h-4 w-4 text-amber-400' /> Earned Badges
          </h2>
          <div className='flex flex-wrap gap-3'>
            {passport.badges.map(b => (
              <div key={b.name} className={`flex items-center gap-3 rounded-2xl border p-3 ${b.is_final ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 bg-[#111827]'}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${b.is_final ? 'bg-amber-500/20' : 'bg-emerald-500/15'}`}>
                  {b.is_final ? <Trophy className='h-5 w-5 text-amber-400' /> : <Medal className='h-5 w-5 text-emerald-400' />}
                </span>
                <div>
                  <p className='text-xs font-bold text-slate-100'>{b.name}</p>
                  <p className='text-[10px] text-slate-500'>{b.awarded_at ? new Date(b.awarded_at).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module grid (§19: Module X / 18) */}
      <div>
        <h2 className='mb-3 flex items-center gap-2 text-sm font-bold text-slate-100'>
          <Sparkles className='h-4 w-4 text-cyan-400' /> My 18-Module Journey
        </h2>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {passport.modules.map(m => {
            const locked = m.status !== 'final' && m.progress.status === 'not_started'
            return (
              <button
                key={m.id}
                disabled={locked}
                onClick={() => navigate(`/trainee/ppwec/${m.module_number}`)}
                className={`ppwec-passport-card group p-4 text-left ${m.progress.status === 'completed' ? 'is-complete' : ''} ${locked ? 'cursor-not-allowed opacity-60' : ''} ${CARD_STYLES[m.progress.status]}`}
              >
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-[10px] font-bold uppercase tracking-widest text-slate-500'>
                    Module {String(m.module_number).padStart(2, '0')}
                  </span>
                  {m.progress.status === 'completed'
                    ? <CheckCircle2 className='h-4 w-4 text-emerald-400' />
                    : locked ? <Lock className='h-3.5 w-3.5 text-slate-600' /> : null}
                </div>
                <p className='text-sm font-bold leading-snug text-slate-100'>{m.title}</p>
                <p className='mt-0.5 text-[11px] italic text-slate-500'>&ldquo;{m.theme}&rdquo;</p>
                <div className='mt-3 flex items-center justify-between'>
                  {BADGE_FOR(m)}
                  {m.progress.status === 'completed' && (
                    <span className='text-[10px] font-bold text-emerald-400'>{m.progress.best_score}%</span>
                  )}
                </div>
                {m.progress.status !== 'not_started' && (
                  <div className='mt-2 h-1 overflow-hidden rounded-full bg-slate-800'>
                    <div className='h-full bg-cyan-500' style={{ width: `${m.progress.completion_percentage}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <PpwecCertificateModal open={showCert} onClose={() => setShowCert(false)} />
    </div>
  )
}
