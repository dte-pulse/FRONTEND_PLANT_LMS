import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '@/api/client'
import { toast } from 'sonner'
import {
  BookOpen, Clock, AlertTriangle, CheckCircle2, Play, ChevronRight,
  BarChart3, RefreshCw, Target, Award, Sparkles, History
} from 'lucide-react'

export default function ProgressPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dash, rec] = await Promise.all([get('/learning/progress/dashboard'), get('/learning/training-record')])
      setDashboard(dash); setRecord(rec)
    } catch { toast.error('Failed to load progress data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const fmtTime = (s) => {
    if (!s) return '0m'
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
        <Sparkles className="h-5 w-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
    </div>
  )

  const s = dashboard?.summary || {}

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <BarChart3 className="h-3.5 w-3.5" /> Performance & Analytics
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Progress Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track your SOP completion status, quiz scores, and weak topics</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-[#161C2C] text-slate-200 hover:text-white hover:border-emerald-500/40 text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Stats
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assigned', value: s.total_assignments ?? 0, icon: BookOpen, bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
          { label: 'Completed SOPs', value: s.completed ?? 0, icon: CheckCircle2, bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
          { label: 'Avg Pass Rate', value: `${s.avg_completion_pct ?? 0}%`, icon: BarChart3, bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
          { label: 'Weak Topics', value: s.weak_topics ?? 0, icon: AlertTriangle, bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
        ].map(({ label, value, icon: Icon, bg }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-[#161C2C] p-5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{label}</span>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-3">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: 'In Progress Queue', icon: Clock },
          { id: 'history', label: 'Training History Log', icon: History },
          { id: 'weak-areas', label: 'Weak Topics & Diagnostics', icon: Target },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Reading Modules</h3>
          {dashboard?.in_progress?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-[#131825]">
              <Target className="h-10 w-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-200">No active reading in progress</p>
              <p className="text-xs text-slate-400 mt-1">Start studying your assigned SOPs from the assessments tab.</p>
              <button
                onClick={() => navigate('/trainee/assessments')}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs"
              >
                Go to SOP Assignments →
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dashboard?.in_progress?.map((doc) => (
                <div key={doc.document_id} className="rounded-2xl border border-slate-800/80 bg-[#131825] p-5 shadow-sm hover:border-slate-700/80 transition-[color,background-color,border-color,box-shadow,transform,opacity] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {doc.document_code}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {doc.completion_percentage}%
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-2">{doc.document_title}</h4>
                  </div>

                  <div className="mt-4 space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-500" style={{ width: `${doc.completion_percentage}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Time: {fmtTime(doc.time_spent_seconds)}
                      </span>
                      <button
                        onClick={() => navigate(`/trainee/learn/${doc.document_id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 transition-[color,background-color,border-color,box-shadow,transform,opacity]"
                      >
                        <Play className="h-3 w-3 fill-current" /> Resume
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-800/80 bg-[#131825] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#161C2C] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">SOP Code & Title</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Best Score</th>
                  <th className="px-5 py-3.5">Result</th>
                  <th className="px-5 py-3.5">Date Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(record?.training_record || []).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-slate-400">{r.training_type?.toUpperCase()}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-white block">{r.document_code || '—'}</span>
                      <span className="text-slate-400 truncate max-w-[220px] block">{r.document_title || ''}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {r.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-slate-200">
                      {r.best_score != null ? `${r.best_score?.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {r.passed != null ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${r.passed ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
                          {r.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {(record?.training_record?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No training record logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'weak-areas' && (
        <div className="space-y-3">
          {(dashboard?.weak_areas || []).length === 0 ? (
            <div className="rounded-2xl border border-slate-800/80 bg-[#131825] p-12 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">No Weak Topics Detected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">You're performing well across all evaluated SOP topics and exam questions.</p>
            </div>
          ) : (
            dashboard?.weak_areas?.map((w, i) => (
              <div key={i} className="rounded-2xl border border-slate-800/80 bg-[#131825] p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm hover:border-slate-700/80 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{w.topic_title || `Topic #${w.topic_id}`}</h4>
                    {w.is_critical && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/30">
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    SOP: <span className="font-mono font-bold text-slate-200">{w.document_code}</span> {w.document_title && `— ${w.document_title}`}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <span>Attempts: <strong className="text-slate-200">{w.attempt_count}</strong></span>
                    <span>Average Score: <strong className="text-amber-400">{w.score?.toFixed(1)}%</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/trainee/learn/${w.document_id}`)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs"
                >
                  Review Topic <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}


