import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { ChevronLeft, BookOpen, CheckCircle2, Lock, Map, Trophy, BarChart3, Sparkles } from 'lucide-react'

const STATUS_CONFIG = {
  completed:   { dot: 'bg-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', label: 'Completed' },
  in_progress: { dot: 'bg-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300', label: 'In Progress' },
  locked:      { dot: 'bg-slate-600', border: 'border-slate-800', bg: 'bg-slate-900/60', text: 'text-slate-500', label: 'Locked' },
}

function ScoreRing({ score, size = 42 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#6366f1" strokeWidth="4"
        strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  )
}

export default function MindMapPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [mapData, setMapData] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  useEffect(() => {
    const load = async () => {
      try { setMapData((await apiClient.get(`/learning/session/document/${documentId}/mindmap`)).data) }
      catch (err) {
        const msg = err.response?.data?.detail || 'Failed to load mind map'
        toast.error(msg)
        navigate(-1)
      }
      finally { setLoading(false) }
    }
    load()
  }, [documentId])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
        <Sparkles className="h-4 w-4 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="text-xs font-medium text-slate-400">Building knowledge graph...</p>
    </div>
  )
  if (!mapData) return null

  const overallScore = mapData.total_score ?? 0
  const completedParents = mapData.completed_parents ?? 0
  const totalParents = mapData.total_parents ?? 0
  const progressPct = totalParents > 0 ? Math.round((completedParents / totalParents) * 100) : 0

  function getVersionBadge(versionStatus) {
    if (versionStatus === 'new') {
      return <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full ml-1 shrink-0">NEW</span>
    }
    if (versionStatus === 'modified') {
      return <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full ml-1 shrink-0">UPDATED</span>
    }
    if (versionStatus === 'removed') {
      return <span className="text-[9px] font-bold text-slate-400 bg-slate-500/10 border border-slate-500/30 px-1.5 py-0.5 rounded-full ml-1 shrink-0">REMOVED</span>
    }
    return null
  }

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-800 bg-[#131825] text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-xs"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
              <Map className="h-3.5 w-3.5" /> Interactive Mind Map
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{mapData.document_title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-medium">{completedParents} of {totalParents} sections</p>
            <p className="text-xs font-bold text-indigo-400">{Math.round(overallScore)}% avg score</p>
          </div>
          <button
            onClick={() => navigate(`/trainee/learn/${documentId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs"
          >
            <BookOpen className="h-3.5 w-3.5" /> Continue Session
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#131825] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-300">Overall Concept Mastery</span>
          <span className="text-indigo-400 font-bold">{progressPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex gap-5 pt-1 text-[11px] text-slate-400 font-medium">
          {[{ color: 'bg-emerald-400', label: 'Completed' }, { color: 'bg-amber-400', label: 'In Progress' }, { color: 'bg-slate-600', label: 'Locked' }].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5"><div className={`h-2 w-2 rounded-full ${color}`} /><span>{label}</span></div>
          ))}
        </div>
      </div>

      {/* Diff Legend / Banner */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-800 bg-[#131825]/40 px-5 py-3 text-xs font-medium text-slate-400">
        <span className="text-slate-200 font-bold flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Version Diff Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>New in this upload</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>Modified procedure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          <span className="line-through text-slate-500">Removed / archived section</span>
        </div>
      </div>

      {/* Root Node */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl border border-indigo-500/30 bg-[#161C2C] px-6 py-4 text-center max-w-sm shadow-xl text-white">
            <Map className="h-5 w-5 text-indigo-400 mx-auto mb-1.5" />
            <h3 className="text-sm font-bold truncate text-white">{mapData.document_title}</h3>
            <p className="text-[10px] text-indigo-300 mt-0.5 font-mono">{mapData.total_parents} Document Sections</p>
          </div>
          <div className="w-px h-6 bg-slate-800" />
        </div>
      </div>

      {/* Nodes Map */}
      <div className="flex gap-5 overflow-x-auto pb-4 justify-center flex-wrap">
        {(mapData.nodes ?? []).map((parent, pi) => {
          const cfg = STATUS_CONFIG[parent.status] ?? STATUS_CONFIG.locked
          const isHovered = hoveredNode === `parent_${pi}`
          return (
            <div key={parent.id} className="flex flex-col items-center gap-2 min-w-[240px]">
              <div className="w-px h-4 bg-slate-800" />
              <button
                onClick={() => parent.version_status !== 'removed' && navigate(`/trainee/learn/${documentId}`)}
                onMouseEnter={() => setHoveredNode(`parent_${pi}`)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${cfg.bg} ${cfg.border} ${isHovered && parent.version_status !== 'removed' ? 'scale-[1.02] shadow-md' : 'shadow-xs'} ${parent.version_status === 'removed' ? 'opacity-50 cursor-not-allowed border-dashed border-slate-700 bg-slate-900/30' : ''}`}
                disabled={parent.version_status === 'removed'}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                      Module {pi + 1}
                    </span>
                    {getVersionBadge(parent.version_status)}
                  </div>
                  {parent.version_status === 'removed' ? <span className="text-[10px] text-slate-500 uppercase tracking-widest shrink-0 font-bold font-mono">Removed</span>
                    : parent.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    : parent.status === 'locked' ? <Lock className="h-4 w-4 text-slate-600 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border-2 border-amber-400 shrink-0" />}
                </div>

                <h4 className={`text-xs font-bold leading-snug line-clamp-2 mb-3 ${parent.version_status === 'removed' ? 'line-through text-slate-500' : cfg.text}`}>{parent.title}</h4>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
                  <div className="relative flex-shrink-0">
                    <ScoreRing score={parent.knowledge_score ?? 0} size={40} />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-200">
                      {Math.round(parent.knowledge_score ?? 0)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <p className="font-bold text-slate-200">{parent.children_completed}/{parent.children_total} sub-topics</p>
                    <p className={`font-semibold ${cfg.text}`}>{parent.version_status === 'removed' ? 'Removed' : cfg.label}</p>
                  </div>
                </div>
              </button>

              <div className="w-px h-3 bg-slate-800" />
              <div className="flex flex-col gap-1.5 w-full">
                {(parent.children ?? []).map((child, ci) => {
                  const childCfg = STATUS_CONFIG[child.status] ?? STATUS_CONFIG.locked
                  const isChildHovered = hoveredNode === `child_${pi}_${ci}`
                  return (
                    <button
                      key={child.id}
                      onClick={() => child.version_status !== 'removed' && navigate(`/trainee/learn/${documentId}`)}
                      onMouseEnter={() => setHoveredNode(`child_${pi}_${ci}`)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150 ${childCfg.bg} ${childCfg.border} ${isChildHovered && child.version_status !== 'removed' ? 'scale-[1.02]' : ''} ${child.version_status === 'removed' ? 'opacity-50 cursor-not-allowed border-dashed border-slate-700 bg-slate-900/30' : ''}`}
                      disabled={child.version_status === 'removed'}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${child.version_status === 'removed' ? 'bg-slate-600' : childCfg.dot}`} />
                        <span className={`text-[11px] font-semibold truncate flex-1 ${child.version_status === 'removed' ? 'line-through text-slate-500' : childCfg.text}`}>{child.title ?? `Sub-topic ${child.child_index}`}</span>
                        {getVersionBadge(child.version_status)}
                        {child.knowledge_score > 0 && <span className="text-[10px] font-mono font-bold shrink-0 text-indigo-400">{Math.round(child.knowledge_score)}%</span>}
                        {child.status === 'locked' && <Lock className="h-3 w-3 text-slate-600 shrink-0" />}
                        {child.is_passed && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>


      {/* Summary Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
        {[
          { icon: BookOpen, value: totalParents, label: 'Total Sections' },
          { icon: CheckCircle2, value: completedParents, label: 'Sections Completed' },
          { icon: BarChart3, value: `${Math.round(overallScore)}%`, label: 'Avg Knowledge Score' },
          { icon: Trophy, value: `${progressPct}%`, label: 'Overall Completion' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-2xl border border-slate-800/80 bg-[#131825] p-4 text-center shadow-xs">
            <Icon className="h-4 w-4 mx-auto mb-1.5 text-indigo-400" />
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


