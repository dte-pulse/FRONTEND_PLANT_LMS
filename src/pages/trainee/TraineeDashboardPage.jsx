import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '@/api/client'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/store/authStore'
import {
  Play, BookOpen, CheckCircle2, Route, ChevronRight, Target, Clock, ArrowRight,
  BarChart3, Sparkles, AlertCircle, Award, Zap
} from 'lucide-react'

export default function TraineeDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await get('/learning/progress/dashboard')
        setDashboard(data)
      } catch { /* defaults */ } finally { setLoading(false) }
    }
    load()
  }, [])

  const s = dashboard?.summary || {}
  const inProgress = dashboard?.in_progress || []
  const weakAreas = dashboard?.weak_areas || []
  const paths = dashboard?.paths || []

  const fmtTime = (sec) => {
    if (!sec) return '0m'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
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

  const firstName = user?.full_name?.split(' ')[0] || 'Trainee'

  return (
    <div className="space-y-8 pb-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F1420] via-indigo-950/60 to-[#0F1420] p-6 md:p-8 text-white border border-slate-800 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Plant Learning Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Welcome back, <span className="bg-gradient-to-r from-emerald-200 via-white to-emerald-300 bg-clip-text text-transparent">{firstName}</span> 👋
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {inProgress.length > 0
                ? `You have ${inProgress.length} SOP module${inProgress.length > 1 ? 's' : ''} currently active in your learning queue.`
                : 'All assigned modules are up to date. Ready for your next learning path?'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => navigate('/trainee/assessments')}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen className="h-4 w-4" />
              View SOPs
            </button>
            <button
              onClick={() => navigate('/trainee/qa')}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#161C2C] hover:bg-slate-800 text-white text-xs font-semibold border border-slate-700 backdrop-blur-md transition-[color,background-color,border-color,box-shadow,transform,opacity] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="h-4 w-4 text-amber-400" />
              AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assigned SOPs', value: s.total_assignments ?? 0, icon: BookOpen, bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
          { label: 'Completed', value: s.completed ?? 0, icon: CheckCircle2, bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
          { label: 'Weak Topics', value: s.weak_topics ?? 0, icon: Target, bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
          { label: 'Avg Pass Rate', value: `${s.avg_completion_pct ?? 0}%`, icon: BarChart3, bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
        ].map(({ label, value, icon: Icon, bg }) => (
          <div key={label} className="group relative rounded-2xl border border-slate-800 bg-[#161C2C] p-5 shadow-md hover:border-slate-700 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{label}</span>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Active Training Paths */}
          {paths.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Route className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Active Training Paths</h3>
                    <p className="text-xs text-slate-400">Structured curricula assigned to your role</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/trainee/paths')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-500/10"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {paths.slice(0, 3).map((path) => {
                  const progress = path.total_modules ? Math.round((path.completed_modules || 0) / path.total_modules * 100) : 0
                  return (
                    <div
                      key={path.id}
                      onClick={() => navigate('/trainee/paths')}
                      className="group p-4 rounded-2xl border border-slate-800 bg-[#0F1420] hover:bg-[#1A2234] hover:border-emerald-500/40 hover:shadow-md transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {path.name || path.title}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-slate-800" />
                      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400 font-medium">
                        <span>{path.completed_modules || 0} of {path.total_modules || 0} modules completed</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          Continue <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* In Progress SOP Queue */}
          <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">In-Progress SOP Modules</h3>
                  <p className="text-xs text-slate-400">Resume learning right where you left off</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {inProgress.length === 0 ? (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-300">No pending in-progress modules!</p>
                  <p className="text-[11px]">Select an assigned SOP from the assessments list to begin.</p>
                </div>
              ) : (
                inProgress.map((item) => (
                  <div
                    key={item.document_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-[#0F1420] hover:border-slate-700 transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          {item.document_code}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{item.document_title}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span>Chunk {item.last_chunk_index || 1} of {item.total_chunks}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(item.time_spent_seconds)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/trainee/learn/${item.document_id}`)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-sm shrink-0"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Resume
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Weak Topics / Needs Attention */}
          <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Needs Attention</h3>
                  <p className="text-xs text-slate-400">Topics needing review</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {weakAreas.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                    <Award className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">No weak areas identified!</p>
                  <p className="text-[11px] text-slate-400 mt-1">Great job maintaining high comprehension scores.</p>
                </div>
              ) : (
                weakAreas.slice(0, 3).map((w, i) => (
                  <div key={i} className="p-3.5 rounded-2xl border border-slate-800 bg-[#0F1420] hover:border-amber-500/30 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {w.topic_title || `Topic #${w.topic_id}`}
                      </p>
                      {w.is_critical && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>Score: <strong className="text-white font-mono">{w.score?.toFixed(1)}%</strong> ({w.attempt_count} attempts)</span>
                      <button
                        onClick={() => navigate(`/trainee/learn/${w.document_id}`)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
                      >
                        Revisit <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Quick Workspace</h3>
              <p className="text-xs text-slate-400">Shortcuts to key trainee tools</p>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: 'Training Paths', icon: Route, path: '/trainee/paths', desc: 'Curriculum roadmap' },
                { label: 'Progress & Analytics', icon: Target, path: '/trainee/progress', desc: 'Detailed score logs' },
                { label: 'AI SOP Assistant', icon: Zap, path: '/trainee/qa', desc: 'Ask SOP questions' },
                { label: 'My Assessments', icon: BookOpen, path: '/trainee/assessments', desc: 'Qualifications & tests' },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors">
                      <link.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">{link.label}</p>
                      <p className="text-[10px] text-slate-400">{link.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-[color,background-color,border-color,box-shadow,transform,opacity]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
