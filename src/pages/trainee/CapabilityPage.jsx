import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get } from '@/api/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  BrainCircuit, Target, Award, AlertTriangle, BookOpen, RefreshCw,
  ChevronRight, Sparkles, TrendingUp, Layers, GraduationCap, Zap,
  CheckCircle2, BarChart3, Lightbulb, MapPin,
} from 'lucide-react'

const MASTERY_META = {
  mastered: { label: 'Mastered', color: 'bg-emerald-500', text: 'text-emerald-400', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  proficient: { label: 'Proficient', color: 'bg-emerald-500', text: 'text-emerald-400', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  learning: { label: 'Learning', color: 'bg-amber-500', text: 'text-amber-400', chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  novice: { label: 'Novice', color: 'bg-rose-500', text: 'text-rose-400', chip: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
}

const scoreColor = (score) => (score >= 85 ? 'text-emerald-400' : score >= 65 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400')

const WEAK_THRESHOLD = 65

// ── Hand-rolled SVG line chart (no chart dependency) ────────────────────────
function TrendChart({ points, docAverage = [], threshold = WEAK_THRESHOLD }) {
  if (!points || points.length < 2) {
    const score = points?.[0]?.score
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className={cn('text-3xl font-bold font-mono', scoreColor(score))}>{score?.toFixed(1) ?? '—'}</div>
        <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs">
          Answer more questions on this concept to build its trend line.
        </p>
      </div>
    )
  }

  const W = 640
  const H = 200
  const PAD = { l: 42, r: 16, t: 18, b: 28 }
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const n = points.length
  const x = (i) => (n === 1 ? PAD.l + iw / 2 : PAD.l + (i / (n - 1)) * iw)
  const y = (score) => PAD.t + (1 - score / 100) * ih
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ')
  const area = `${PAD.l},${(PAD.t + ih).toFixed(1)} ${line} ${x(n - 1).toFixed(1)},${(PAD.t + ih).toFixed(1)}`
  const thY = y(threshold)
  const grid = [0, 25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Mastery score over attempts">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gridlines + y labels */}
      {grid.map((g) => (
        <g key={g}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="#1E293B" strokeWidth="1" strokeDasharray="3 4" />
          <text x={PAD.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#64748B">{g}</text>
        </g>
      ))}

      {/* Weak threshold line */}
      <line x1={PAD.l} x2={W - PAD.r} y1={thY} y2={thY} stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={W - PAD.r} y={thY - 5} textAnchor="end" fontSize="8.5" fill="#F59E0B" opacity="0.9">
        weak {threshold}
      </text>

      {/* Area + trend line */}
      <path d={area} fill="url(#trendGrad)" />

      {/* Document-average overlay — matched to this concept's x positions by
          absolute attempt number, so capped series stay aligned */}
      {docAverage.length > 0 && (() => {
        const byAttempt = new Map(docAverage.map((p) => [p.attempt_number, p.score]))
        const avgAt = (i) => byAttempt.get(points[i].attempt_number)
        const avgLine = points
          .map((p, i) => {
            const s = avgAt(i)
            return s != null ? `${x(i).toFixed(1)},${y(s).toFixed(1)}` : null
          })
          .filter(Boolean)
          .join(' ')
        if (!avgLine) return null
        return (
          <g>
            <polyline
              points={avgLine}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.9"
            />
            {points.map((p, i) => {
              const s = avgAt(i)
              if (s == null) return null
              return (
                <circle key={`avg-${i}`} cx={x(i)} cy={y(s)} r={2.5} fill="#0F1420" stroke="#38BDF8" strokeWidth="1.5">
                  <title>{`Document avg · attempt ${p.attempt_number}: ${s}/100`}</title>
                </circle>
              )
            })}
          </g>
        )
      })()}

      <polyline points={line} fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Result dots (correct green / wrong rose) */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.score)}
          r={i === n - 1 ? 5 : 3.5}
          fill={p.is_correct ? '#34D399' : '#FB7185'}
          stroke="#0F1420"
          strokeWidth="1.5"
          className="cursor-pointer transition-[color,background-color,border-color,box-shadow,transform,opacity]"
        >
          <title>{`Attempt ${p.attempt_number}: ${p.score}/100 · ${p.is_correct ? 'correct' : 'wrong'} · ${p.difficulty}`}</title>
        </circle>
      ))}

      {/* X labels — true attempt numbers (series may be capped server-side) */}
      <text x={x(0)} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748B">A{points[0].attempt_number}</text>
      <text x={x(n - 1)} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748B">A{points[n - 1].attempt_number}</text>
    </svg>
  )
}

export default function CapabilityPage() {
  const navigate = useNavigate()
  const { documentId } = useParams()
  const isScoped = Boolean(documentId)
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState(null)
  const [selectedConceptId, setSelectedConceptId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    setProfile(null)   // never render the previous document's data under a new URL
    setHistory(null)
    setSelectedConceptId(null)
    try {
      const profileUrl = isScoped ? `/learning/agent/profile/${documentId}` : '/learning/agent/profile'
      const historyUrl = isScoped
        ? `/learning/agent/mastery-history?document_id=${documentId}`
        : '/learning/agent/mastery-history'
      // Decoupled fetches: a history hiccup must never hide a valid profile
      // (it simply means no trend section), while a profile failure errors out.
      const [profResult, histResult] = await Promise.allSettled([get(profileUrl), get(historyUrl)])
      if (profResult.status === 'fulfilled') {
        setProfile(profResult.value)
      } else {
        setError('Could not load this capability profile.')
        toast.error('Failed to load capability profile')
      }
      if (histResult.status === 'fulfilled') {
        setHistory(histResult.value)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [documentId])

  // Default the trend selector to the weakest concept once history loads.
  useEffect(() => {
    if (history?.concepts?.length) {
      setSelectedConceptId((prev) => prev ?? history.concepts[0].child_chunk_id)
    }
  }, [history])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
        <BrainCircuit className="h-5 w-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
    </div>
  )

  const s = profile?.summary || {}
  const docTitle = profile?.documents?.[0]?.title
  const weaknesses = profile?.weaknesses || []
  const selectedConcept = history?.concepts?.find((c) => c.child_chunk_id === selectedConceptId)
  const strengths = profile?.strengths || []
  const studyPlan = profile?.study_plan || []
  const documents = profile?.documents || []
  const topics = profile?.topics || []
  const isEmpty = (s.total_concepts ?? 0) === 0

  const distribution = [
    { key: 'mastered', value: s.mastered ?? 0 },
    { key: 'proficient', value: s.proficient ?? 0 },
    { key: 'learning', value: s.learning ?? 0 },
    { key: 'novice', value: s.novice ?? 0 },
  ]
  const total = distribution.reduce((a, b) => a + b.value, 0) || 1

  const metrics = [
    { label: 'Mastered', value: s.mastered ?? 0, icon: Award, meta: MASTERY_META.mastered },
    { label: 'Proficient', value: s.proficient ?? 0, icon: TrendingUp, meta: MASTERY_META.proficient },
    { label: 'Learning', value: s.learning ?? 0, icon: BookOpen, meta: MASTERY_META.learning },
    { label: 'Novice', value: s.novice ?? 0, icon: GraduationCap, meta: MASTERY_META.novice },
    { label: 'Weak Concepts', value: s.weak_concepts ?? 0, icon: Target, meta: { chip: 'bg-amber-500/10 text-amber-400 border-amber-500/30' } },
    { label: 'Critical', value: s.critical_concepts ?? 0, icon: AlertTriangle, meta: { chip: 'bg-rose-500/10 text-rose-400 border-rose-500/30' } },
  ]

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          {isScoped && (
            <button
              onClick={() => navigate('/trainee/capability')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors mb-2"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" /> All capabilities
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <BrainCircuit className="h-3.5 w-3.5" /> AI Learning Coach · Capability Profile
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isScoped ? `${docTitle || `Document #${documentId}`}` : 'My Capability Profile'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isScoped
              ? 'Concept mastery within this document — powered by the adaptive learning agents'
              : 'Mastery across every concept, powered by the adaptive learning agents'}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-[#161C2C] text-slate-200 hover:text-white hover:border-emerald-500/40 text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh Profile
        </button>
      </div>

      {error && !profile ? (
        <div className="rounded-3xl border border-slate-800/80 bg-[#131825] p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Couldn't load this profile</h3>
          <p className="text-xs text-slate-400 mt-2">The document may be unavailable or not assigned to you.</p>
          <button
            onClick={() => navigate('/trainee/capability')}
            className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-lg shadow-indigo-600/25 inline-flex items-center gap-2"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back to all capabilities
          </button>
        </div>
      ) : isEmpty ? (
        <div className="rounded-3xl border border-slate-800/80 bg-[#131825] p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No concepts tracked yet</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Answer the adaptive questions inside any SOP learning session and the agents will
            start building your capability profile — mastery levels, weaknesses, and a
            personalized study plan.
          </p>
          <button
            onClick={() => navigate('/trainee/assessments')}
            className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-lg shadow-indigo-600/25 inline-flex items-center gap-2"
          >
            <BookOpen className="h-3.5 w-3.5" /> Start an SOP Session <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F1420] via-indigo-950/60 to-[#0F1420] p-6 md:p-8 text-white border border-slate-800 shadow-xl">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-40 -top-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                <BrainCircuit className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Adaptive mastery engine active</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                  {weaknesses.length > 0
                    ? `${weaknesses.length} concept${weaknesses.length > 1 ? 's' : ''} need${weaknesses.length > 1 ? '' : 's'} attention`
                    : 'All concepts on track — keep it up!'}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  The agents track your score per concept in real time and tune question
                  difficulty as you improve. Follow the study plan below to strengthen weak areas.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-200 via-white to-emerald-300 bg-clip-text text-transparent">
                    {Number(s.avg_score ?? 0).toFixed(1)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Avg Mastery</div>
                </div>
                <div className="w-px h-12 bg-slate-700/60 hidden sm:block" />
                <div>
                  <div className={cn('text-3xl font-bold capitalize', MASTERY_META.novice.text)}>
                    {topics.filter(t => t.is_critical).length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Critical Topics</div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {metrics.map(({ label, value, icon: Icon, meta }) => (
              <div key={label} className="group rounded-2xl border border-slate-800 bg-[#161C2C] p-4 shadow-md hover:border-slate-700 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110', meta.chip)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mastery distribution */}
          <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Mastery Distribution</h3>
                <p className="text-xs text-slate-400">How your {s.total_concepts} tracked concepts are progressing</p>
              </div>
            </div>
            <div className="p-5">
              <div className="h-3.5 rounded-full bg-slate-800 overflow-hidden flex">
                {distribution.map((d) => d.value > 0 && (
                  <div
                    key={d.key}
                    className={cn('h-full transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-700', MASTERY_META[d.key].color)}
                    style={{ width: `${(d.value / total) * 100}%` }}
                    title={`${MASTERY_META[d.key].label}: ${d.value}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                {distribution.map((d) => (
                  <div key={d.key} className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className={cn('w-2.5 h-2.5 rounded-full', MASTERY_META[d.key].color)} />
                    <span className="font-medium">{MASTERY_META[d.key].label}</span>
                    <span className="font-mono text-slate-400">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mastery Trend (score over time per concept) */}
          {history && history.concepts.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Mastery Trend</h3>
                    <p className="text-xs text-slate-400">Score over time per concept — with the document's overall average for comparison</p>
                  </div>
                </div>
              </div>

              {/* Concept selector chips */}
              <div className="px-5 pt-4 flex gap-2 overflow-x-auto pb-1">
                {history.concepts.map((c) => {
                  const active = selectedConceptId === c.child_chunk_id
                  return (
                    <button
                      key={c.child_chunk_id}
                      onClick={() => setSelectedConceptId(c.child_chunk_id)}
                      className={cn(
                        'shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-[color,background-color,border-color,box-shadow,transform,opacity]',
                        active
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/5'
                          : 'bg-[#0F1420] text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200',
                      )}
                    >
                      <span className="max-w-[140px] truncate">{c.section_title}</span>
                      <span className={cn('font-mono font-bold', scoreColor(c.current_score))}>{c.current_score?.toFixed(0)}</span>
                    </button>
                  )
                })}
              </div>

              <div className="p-5">
                {selectedConcept ? (
                  <>
                    <TrendChart
                      points={selectedConcept.points}
                      docAverage={history.document_average?.points || []}
                    />
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Correct answer</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Wrong answer</span>
                      <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-sky-400" /> Document average</span>
                      <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-amber-500" /> Weak threshold ({WEAK_THRESHOLD})</span>
                      <span className="ml-auto font-medium">{selectedConcept.document_title} · page {selectedConcept.page_no ?? '—'} · {selectedConcept.attempts} attempt{selectedConcept.attempts === 1 ? '' : 's'}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">Select a concept above to see its trend.</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Left 2/3: Weakness heatmap + study plan */}
            <div className="xl:col-span-2 space-y-6">
              {/* Weakness heatmap */}
              <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Weakness Heatmap</h3>
                      <p className="text-xs text-slate-400">Concepts below the {WEAK_THRESHOLD}% mastery threshold — with agent insights</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {weaknesses.length} weak
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {weaknesses.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">No weak concepts!</p>
                      <p className="text-[11px] text-slate-400 mt-1">Every tracked concept is above the mastery threshold.</p>
                    </div>
                  ) : (
                    [...weaknesses]
                      .sort((a, b) => a.score - b.score)
                      .map((w, i) => (
                        <div key={`${w.child_chunk_id}-${i}`} className="group rounded-2xl border border-slate-800 bg-[#0F1420] hover:border-slate-700 transition-[color,background-color,border-color,box-shadow,transform,opacity] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                                  w.severity === 'critical'
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                                )}>
                                  {w.severity}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  {w.document_title}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white mt-2 group-hover:text-emerald-300 transition-colors">
                                {w.section_title}
                              </h4>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                {w.page_no != null && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Page {w.page_no}</span>
                                )}
                                <span>{w.attempts} attempt{w.attempts === 1 ? '' : 's'}</span>
                                <span className="flex items-center gap-1">
                                  <Lightbulb className="h-3 w-3 text-emerald-400" />
                                  {w.topic_title || `Topic #${w.topic_id}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn('text-xl font-bold font-mono', scoreColor(w.score))}>{w.score?.toFixed(0)}</span>
                              <span className="text-[10px] text-slate-500"> / 100</span>
                            </div>
                          </div>

                          <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-700', w.score < 40 ? 'bg-rose-500' : 'bg-amber-500')}
                              style={{ width: `${Math.max(4, Math.min(100, w.score))}%` }}
                            />
                          </div>

                          {w.insight && (
                            <div className="mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3.5 py-2.5 flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                              <p className="text-[11px] text-slate-300 leading-relaxed">{w.insight}</p>
                            </div>
                          )}

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => navigate(`/trainee/learn/${w.document_id}`)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 transition-[color,background-color,border-color,box-shadow,transform,opacity]"
                            >
                              Review Concept <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Study plan */}
              <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Personalized Study Plan</h3>
                    <p className="text-xs text-slate-400">Recommended by the Recommender agent — highest impact first</p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {studyPlan.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No recommendations yet — keep learning to generate a plan.</p>
                  )}
                  {studyPlan.map((plan) => (
                    <div key={plan.priority} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-800 bg-[#0F1420] hover:border-purple-500/30 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
                        {plan.priority}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {plan.section_title && (
                            <span className="text-xs font-bold text-white">{plan.section_title}</span>
                          )}
                          {plan.document_title && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {plan.document_title}
                            </span>
                          )}
                          {plan.score != null && (
                            <span className={cn('text-[11px] font-mono font-bold', scoreColor(plan.score))}>{plan.score?.toFixed(0)}</span>
                          )}
                          {plan.severity === 'critical' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/30">critical</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mt-1.5">{plan.action}</p>
                        {plan.insight && (
                          <p className="text-[10px] text-emerald-300/80 italic mt-1.5">“{plan.insight}”</p>
                        )}
                      </div>
                      {(isScoped ? documentId : plan.document_id) && (
                        <button
                          // In the scoped view the LLM plan's document_id can be
                          // unreliable — always review within the scoped document.
                          onClick={() => navigate(`/trainee/learn/${isScoped ? documentId : plan.document_id}`)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold shrink-0 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1/3: Documents, topics, strengths */}
            <div className="space-y-6">
              {/* Documents rollup */}
              <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Documents</h3>
                    <p className="text-xs text-slate-400">Mastery rolled up per SOP</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {documents.map((d) => {
                    const isCurrent = isScoped && Number(documentId) === d.document_id
                    return (
                      <button
                        key={d.document_id}
                        onClick={() => navigate(`/trainee/capability/${d.document_id}`)}
                        className={cn(
                          'w-full text-left rounded-2xl border p-4 transition-[color,background-color,border-color,box-shadow,transform,opacity] group',
                          isCurrent
                            ? 'border-emerald-500/40 bg-[#1A2234] shadow-md shadow-indigo-500/5'
                            : 'border-slate-800 bg-[#0F1420] hover:border-emerald-500/40 hover:bg-[#1A2234]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">{d.title}</h4>
                          <span className={cn('text-sm font-bold font-mono shrink-0', scoreColor(d.avg_score))}>{d.avg_score?.toFixed(0)}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className={cn('h-full rounded-full', d.avg_score >= 85 ? 'bg-emerald-500' : d.avg_score >= 65 ? 'bg-emerald-500' : d.avg_score >= 40 ? 'bg-amber-500' : 'bg-rose-500')}
                            style={{ width: `${Math.max(4, Math.min(100, d.avg_score))}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-400">
                          <span>{d.mastered_concepts} of {d.total_concepts} concepts mastered</span>
                          {d.weakest_section && (
                            <span className="truncate max-w-[45%] text-rose-300/80" title={d.weakest_section}>
                              weak: {d.weakest_section}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Concept-level breakdown</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            {isCurrent ? 'Viewing' : 'View'} <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                  {documents.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No document-level data yet.</p>}
                </div>
              </div>

              {/* Topics rollup */}
              <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Topics</h3>
                    <p className="text-xs text-slate-400">Rolled-up mastery per topic</p>
                  </div>
                </div>
                <div className="p-5 space-y-2.5">
                  {topics.map((t) => (
                    <div key={t.topic_id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#0F1420] px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-400">{t.concepts} concepts · {t.weak_concepts} weak</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.is_critical && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/30">critical</span>
                        )}
                        <span className={cn('text-sm font-bold font-mono', scoreColor(t.avg_score))}>{t.avg_score?.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                  {topics.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No topic-level data yet.</p>}
                </div>
              </div>

              {/* Strengths */}
              <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Strengths</h3>
                    <p className="text-xs text-slate-400">Concepts you've mastered or are proficient in</p>
                  </div>
                </div>
                <div className="p-5">
                  {strengths.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Keep going — strengths will appear as concepts reach 65+ mastery.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {strengths.map((st, i) => (
                        <span key={i} className={cn('px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border', MASTERY_META[st.mastery_level]?.chip || 'bg-slate-800 text-slate-300 border-slate-700')}>
                          {st.section_title} · {st.score?.toFixed(0)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
