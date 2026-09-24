import { useState, useEffect } from 'react'
import { get } from '@/api/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity, RefreshCw, Sparkles, BarChart3,
  Award, CheckCircle2, TrendingUp, AlertTriangle, ExternalLink,
} from 'lucide-react'

const FEATURE_LABELS = {
  'rag-qa': 'AI Q&A (RAG)',
  'adaptive-question': 'Adaptive question',
  'adaptive-answer': 'Adaptive answer',
  'ingest-document': 'Document ingestion',
  '(untraced)': 'Untraced',
}

const EVAL_META = {
  'qa-groundedness': { label: 'QA groundedness', hint: 'LLM-judged answer quality', icon: Award },
  'mcq-quality': { label: 'MCQ quality', hint: 'LLM-judged generated questions', icon: CheckCircle2 },
  'answer-correctness': { label: 'Answer correctness', hint: 'Live learning answers', icon: TrendingUp },
}

const fmtCost = (v) => `$${(v ?? 0).toFixed(2)}`
const fmtLatency = (v) => (v != null ? `${Math.round(v)}ms` : '—')
const fmtPct = (v) => `${Math.round((v ?? 0) * 100)}%`
const fmtNum = (v) => Number(v ?? 0).toLocaleString()

const fmtWhen = (iso) => {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const s = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function PanelHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
    </div>
  )
}

// ── Hand-rolled SVG trend chart (no chart dependency) ───────────────────────
function TrendChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-slate-500">
        Not enough daily data yet — traces will appear here as traffic flows.
      </div>
    )
  }
  const W = 720
  const H = 220
  const PAD = { l: 46, r: 18, t: 18, b: 30 }
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const n = data.length
  const maxOps = Math.max(...data.map((d) => d.operations), 1)
  const maxLat = Math.max(...data.map((d) => d.p95_latency_ms || 0), 1)
  const x = (i) => PAD.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw)
  const yOps = (v) => PAD.t + ih - (v / maxOps) * ih
  const yLat = (v) => PAD.t + ih - (v / maxLat) * ih
  const barW = Math.min(26, (iw / n) * 0.5)
  const line = data.map((d, i) => `${x(i).toFixed(1)},${yLat(d.p95_latency_ms || 0).toFixed(1)}`).join(' ')
  const grid = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily operations and p95 latency">
      <defs>
        <linearGradient id="obsBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line x1={PAD.l} x2={W - PAD.r} y1={yOps(maxOps * g)} y2={yOps(maxOps * g)} stroke="#1E293B" strokeWidth="1" strokeDasharray="3 4" />
          <text x={PAD.l - 6} y={yOps(maxOps * g) + 3} textAnchor="end" fontSize="9" fill="#64748B">
            {Math.round(maxOps * g)}
          </text>
        </g>
      ))}
      {/* Operations bars */}
      {data.map((d, i) => (
        <rect
          key={i}
          x={x(i) - barW / 2}
          y={yOps(d.operations)}
          width={barW}
          height={Math.max(1, PAD.t + ih - yOps(d.operations))}
          rx={3}
          fill="url(#obsBarGrad)"
          opacity={0.9}
        >
          <title>{`${d.date}: ${fmtNum(d.operations)} operations · $${(d.cost_usd ?? 0).toFixed(2)}`}</title>
        </rect>
      ))}
      {/* p95 latency line */}
      <polyline points={line} fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={`lat-${i}`} cx={x(i)} cy={yLat(d.p95_latency_ms || 0)} r={3} fill="#0F1420" stroke="#38BDF8" strokeWidth="1.5">
          <title>{`${d.date}: p95 ${Math.round(d.p95_latency_ms || 0)}ms`}</title>
        </circle>
      ))}
      {/* X labels */}
      {data.map((d, i) => (
        <text key={`xl-${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="#64748B">
          {d.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}

export default function ObservabilityPage() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (d) => {
    setLoading(true)
    setError(null)
    try {
      const res = await get(`/observability/dashboard?days=${d}`)
      setData(res)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load observability data')
      toast.error('Failed to load observability dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(days) }, [days])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-violet-500 animate-spin" />
        <Activity className="h-5 w-5 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
    </div>
  )

  // Langfuse not configured — setup CTA
  if (data?.configured === false) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-[#131825] p-10 md:p-14 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/25 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">AI Observability is ready — just needs keys</h2>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-lg mx-auto">
            The entire LLM pipeline (RAG Q&A, adaptive learning agents, ingestion) is instrumented
            with Langfuse. Add your project keys to <code className="text-violet-300 bg-slate-800 px-1.5 py-0.5 rounded">Backend/.env</code>
            {' '}and restart to start seeing cost, latency, trace volume and eval scores here.
          </p>
          <ol className="mt-6 space-y-2 text-left max-w-md mx-auto text-[11px] text-slate-300">
            <li className="flex gap-2"><span className="text-violet-400 font-bold">1.</span> Create a free project at langfuse.com (Settings → API Keys)</li>
            <li className="flex gap-2"><span className="text-violet-400 font-bold">2.</span> Set <code className="bg-slate-800 px-1 rounded">LANGFUSE_PUBLIC_KEY</code>, <code className="bg-slate-800 px-1 rounded">LANGFUSE_SECRET_KEY</code>, <code className="bg-slate-800 px-1 rounded">LANGFUSE_BASE_URL</code></li>
            <li className="flex gap-2"><span className="text-violet-400 font-bold">3.</span> Restart the API and refresh this page</li>
          </ol>
          <a
            href="https://cloud.langfuse.com"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-lg shadow-violet-600/25"
          >
            Open Langfuse <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    )
  }

  const s = data?.summary || {}
  const byFeature = data?.by_feature || []
  const trend = data?.trend || []
  const evals = data?.evals || []
  const recentTraces = data?.recent_traces || []
  const langfuseUrl = data?.langfuse_url || 'https://cloud.langfuse.com'
  const totalCost = byFeature.reduce((a, b) => a + (b.cost_usd || 0), 0)
  const maxFeatureCost = Math.max(...byFeature.map((f) => f.cost_usd || 0), 0.001)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-400 mb-1">
            <Activity className="h-3.5 w-3.5" /> Langfuse · AI Observability
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Observability Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Cost, latency, trace volume and LLM-as-judge evals across every AI feature</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold border transition-[color,background-color,border-color,box-shadow,transform,opacity]',
                days === d
                  ? 'bg-violet-600 text-white border-violet-500 shadow-md'
                  : 'bg-[#161C2C] text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white',
              )}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => load(days)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-[#161C2C] text-slate-200 hover:text-white hover:border-violet-500/40 text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {data?.error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 flex items-center gap-2.5 text-xs text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Langfuse API error: {data.error} — showing cached/empty aggregates.
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label='Total AI cost' value={fmtCost(totalCost || s.cost_usd)} hint={`${days}d spend across all features`} />
        <MetricCard label='Avg latency' value={fmtLatency(s.avg_latency_ms)} hint='Mean generation + retrieval time' />
        <MetricCard label='P95 latency' value={fmtLatency(s.p95_latency_ms)} hint='Worst-case response time' />
        <MetricCard label='Traces' value={fmtNum(s.traces)} hint={`${fmtNum(s.operations)} LLM/agent operations`} />
      </div>

      {/* Eval scores */}
      <div>
        <PanelHeader eyebrow='LLM-as-a-Judge evals' title='Output quality scores' description='Sampled automated evaluations attached to live traffic.' />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {evals.length === 0 && (
            <div className="md:col-span-3 rounded-2xl border border-slate-800 bg-[#161C2C] p-6 text-center text-xs text-slate-500">
              No eval scores in the last {days} days — scores appear once traffic flows (evals run on a {`${'5'}%`} sample).
            </div>
          )}
          {evals.map((e) => {
            const meta = EVAL_META[e.name] || { label: e.name, hint: 'Score', icon: Award }
            const Icon = meta.icon
            const good = e.type === 'boolean' ? (e.avg ?? 0) >= 0.7 : (e.avg ?? 0) >= 0.75
            return (
              <div key={e.name} className="rounded-2xl border border-slate-800 bg-[#161C2C] p-5 shadow-md hover:border-slate-700 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                <div className="flex items-center justify-between">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', good ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{e.count} scored</span>
                </div>
                <div className="mt-3 text-2xl font-bold font-mono text-white">
                  {e.type === 'boolean' ? fmtPct(e.avg) : `${((e.avg ?? 0) * 100).toFixed(0)}%`}
                </div>
                <p className="text-xs font-semibold text-slate-200 mt-1">{meta.label}</p>
                <p className="text-[10px] text-slate-500">{meta.hint}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Daily trend */}
        <Card>
          <PanelHeader
            eyebrow='Last days'
            title='Daily volume & P95 latency'
            description='Operations per day (bars) with worst-case latency (line).'
          />
          <CardContent className="mt-4">
            <TrendChart data={trend} />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-500" /> Operations</span>
              <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-sky-400" /> P95 latency</span>
            </div>
          </CardContent>
        </Card>

        {/* Per-feature breakdown */}
        <Card>
          <PanelHeader eyebrow='By feature' title='Cost & latency breakdown' description='Every traced flow, ranked by cost.' />
          <CardContent className="mt-4 space-y-3">
            {byFeature.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">No traced activity in the last {days} days.</p>
            )}
            {byFeature.slice(0, 10).map((f) => (
              <div key={f.feature} className="rounded-xl border border-slate-800 bg-[#0F1420] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-white truncate">{FEATURE_LABELS[f.feature] || f.feature}</p>
                  <span className="text-xs font-bold font-mono text-violet-300">{fmtCost(f.cost_usd)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" style={{ width: `${Math.max(3, (f.cost_usd / maxFeatureCost) * 100)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                  <span>{fmtNum(f.operations)} operations</span>
                  <span>avg {fmtLatency(f.avg_latency_ms)} · p95 {fmtLatency(f.p95_latency_ms)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent traces */}
      <Card>
        <PanelHeader
          eyebrow='Drill down'
          title='Recent traces'
          description='Latest requests with duration and cost — click any row to open it in Langfuse.'
        />
        <CardContent className="mt-4">
          {recentTraces.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">No traces in the last {days} days.</p>
          )}
          {recentTraces.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <th className="py-2 pr-4 font-bold">Trace</th>
                    <th className="py-2 pr-4 font-bold">When</th>
                    <th className="py-2 pr-4 font-bold">Duration</th>
                    <th className="py-2 pr-4 font-bold">Cost</th>
                    <th className="py-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTraces.map((t) => {
                    const traceLink = t.html_path ? `${langfuseUrl}${t.html_path}` : null
                    const isError = t.level === 'ERROR'
                    return (
                      <tr
                        key={t.id}
                        onClick={() => traceLink && window.open(traceLink, '_blank', 'noopener')}
                        onKeyDown={(e) => {
                          if (traceLink && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            window.open(traceLink, '_blank', 'noopener')
                          }
                        }}
                        role={traceLink ? 'link' : undefined}
                        tabIndex={traceLink ? 0 : undefined}
                        aria-label={traceLink ? `Open ${t.name} trace in Langfuse` : undefined}
                        className={cn(
                          'group border-b border-slate-800/60 last:border-0 transition-colors',
                          traceLink ? 'cursor-pointer hover:bg-slate-800/30' : '',
                        )}
                      >
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                              background: isError ? '#F43F5E' : '#34D399',
                              boxShadow: isError ? '0 0 8px rgba(244,63,94,.5)' : '0 0 8px rgba(52,211,153,.35)',
                            }} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 truncate max-w-[260px]">
                                {FEATURE_LABELS[t.name] || t.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono truncate max-w-[260px]">{t.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{fmtWhen(t.timestamp)}</td>
                        <td className="py-2.5 pr-4 text-slate-300 font-mono whitespace-nowrap">{fmtLatency(t.latency_ms)}</td>
                        <td className="py-2.5 pr-4 font-mono whitespace-nowrap">
                          <span className={cn(t.cost_usd > 0 ? 'text-violet-300 font-bold' : 'text-slate-500')}>
                            {fmtCost(t.cost_usd)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          {traceLink ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-white border border-slate-700 rounded-lg px-2.5 py-1 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                              Open in Langfuse <ExternalLink className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insight strip */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 flex items-start gap-3">
        <BarChart3 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-300 leading-relaxed">
          <span className="text-white font-semibold">What to watch:</span> cost is attributed per feature — the largest driver is usually
          adaptive answer generation during learning sessions, followed by RAG Q&A. If p95 latency trends up while avg stays flat,
          inspect the slowest trace in Langfuse (Traces → sort by duration). Eval scores trend answer quality; a dropping
          <span className="text-violet-300 font-medium"> qa-groundedness </span> signals retrieval drift worth investigating.
        </p>
      </div>
    </div>
  )
}
