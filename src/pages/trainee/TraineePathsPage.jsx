import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '@/api/client'
import { toast } from 'sonner'
import {
  Route, Layers, Clock, ChevronRight,
  CheckCircle2, Play, BarChart3, Sparkles, X
} from 'lucide-react'

export default function TraineePathsPage() {
  const navigate = useNavigate()
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState(null)
  const [modules, setModules] = useState([])
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    const load = async () => {
      try { setPaths(await get('/learning/paths')) }
      catch { toast.error('Failed to load learning paths') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const openPathDetail = async (path) => {
    setSelectedPath(path)
    setShowDetail(true)
    try { setModules(await get(`/learning/paths/${path.id}/modules`)) }
    catch { setModules([]) }
  }

  const overallProgress = (path) => {
    if (!path.completed_modules && !path.total_modules) return 0
    return Math.round((path.completed_modules || 0) / (path.total_modules || 1) * 100)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
        <Sparkles className="h-5 w-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
          <Route className="h-3.5 w-3.5" /> Structured Curriculum
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">My Training Paths</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Follow your role-based learning tracks — complete modules in sequence to achieve qualification certification.
        </p>
      </div>

      {paths.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#161C2C]/50 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Route className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No training paths assigned yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Assignments from your department head or trainer will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {paths.map((path) => {
            const progress = overallProgress(path)
            return (
              <div
                key={path.id}
                onClick={() => openPathDetail(path)}
                className="group relative rounded-3xl border border-slate-800 bg-[#161C2C] p-6 hover:border-indigo-500/40 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Route className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {path.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">{path.documents_count || 0} SOP Documents</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  {path.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {path.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Progress ({path.completed_modules || 0}/{path.total_modules || 0} modules)</span>
                    <span className="font-bold text-indigo-400 font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-slate-500" />{path.total_modules || 0} modules</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-500" />{path.estimated_duration || 'Self-paced'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-over detail drawer */}
      {showDetail && selectedPath && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={() => setShowDetail(false)}>
          <div
            className="w-full max-w-xl h-full overflow-y-auto bg-[#131825] border-l border-slate-800 shadow-2xl flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-800 bg-[#161C2C] text-white relative">
                <button
                  onClick={() => setShowDetail(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Path Breakdown</span>
                <h2 className="text-xl font-bold text-white mt-1 pr-8">{selectedPath.name}</h2>
                {selectedPath.description && (
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">{selectedPath.description}</p>
                )}
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 bg-[#0F1420]">
                {[
                  { label: 'Total Modules', value: selectedPath.total_modules || 0, icon: Layers },
                  { label: 'Completed', value: selectedPath.completed_modules || 0, icon: CheckCircle2 },
                  { label: 'Overall %', value: `${overallProgress(selectedPath)}%`, icon: BarChart3 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="p-4 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                    <p className="text-base font-bold text-white">{value}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Modules timeline list */}
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modules Sequence</h3>
                {modules.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    <Layers className="h-6 w-6 mx-auto mb-2 stroke-[1]" />
                    No module contents available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modules.map((mod, idx) => (
                      <div
                        key={mod.id}
                        className="rounded-2xl border border-slate-800 bg-[#161C2C] p-4 shadow-xs hover:border-indigo-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            mod.completed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {mod.completed ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${mod.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                              {mod.title}
                            </p>
                            <p className="text-[10px] text-slate-400">{mod.documents_count || 0} associated SOPs</p>
                          </div>
                          {mod.completed ? (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              Completed
                            </span>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); if (mod.document_id) navigate(`/trainee/learn/${mod.document_id}`) }}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <Play className="h-3 w-3 fill-current" /> Start
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#161C2C] text-right">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


