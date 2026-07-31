import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Brain, BookOpen,
  MessageSquare, Send, Loader2, Trophy, Lock, Map,
  RefreshCcw, ChevronDown, ChevronUp, Target, BarChart3, ArrowRight, Sparkles, X, User
} from 'lucide-react'

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  medium: { label: 'Medium', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  hard:   { label: 'Hard',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
}

function normalizeContent(text) {
  if (!text) return ''
  let normalized = text.replace(/\n{3,}/g, '\n\n')
  normalized = normalized.replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
  return normalized
}

function KnowledgeBar({ score, className = '' }) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-800 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-emerald-400`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
  )
}

// ─── Derive a human-readable title from raw chunk content ───────────────────
function getChildTitle(content, fallback) {
  if (!content) return fallback
  const lines = content.split('\n')
  for (const line of lines) {
    const clean = line
      .replace(/<[^>]+>/g, '')
      .replace(/\|\d+\|?/g, '')
      .replace(/^#{1,6}\s+/, '')
      .replace(/[*_`~]/g, '')
      .replace(/[\{\}\/\*#`\[\]]/g, '')
      .replace(/^\s*[-•>|]/g, '')
      .trim()
    if (clean.length > 3 && !/^[{}();,\\]/.test(clean)) return clean.length > 50 ? clean.slice(0, 47) + '…' : clean
  }
  return fallback
}

// ─── SVG-based interactive mind map tree (NotebookLM-style) ─────────────────
const NODE_W = 180
const NODE_H = 36
const CHILD_W = 180
const CHILD_H = 32
const COL_GAP = 110   // horizontal gap between columns
const ROW_GAP = 14    // vertical gap between sibling nodes

function MindMapModal({ open, onClose, docCode, docTitle, parents, currentParentIdx, onJump }) {
  const [expanded, setExpanded] = useState(() => {
    const m = {}
    parents?.forEach((_, i) => { m[i] = true })
    return m
  })
  const [tooltip, setTooltip] = useState(null) // { text, x, y }
  const containerRef = useRef(null)

  useEffect(() => {
    if (open && parents) {
      const m = {}
      parents.forEach((_, i) => { m[i] = true })
      setExpanded(m)
    }
  }, [open, parents])

  if (!open) return null

  // ── Layout calculation ──────────────────────────────────────────────────
  const PADDING = 40
  const ROOT_X = PADDING
  const ROOT_Y_CENTER = 0 // will offset later

  // For each parent, compute its subtree height
  const parentLayouts = (parents || []).map((p, pi) => {
    const isExp = expanded[pi]
    const childCount = isExp ? (p.children?.length ?? 0) : 0
    const childrenH = childCount > 0 ? childCount * (CHILD_H + ROW_GAP) - ROW_GAP : 0
    const height = Math.max(NODE_H, childrenH)
    return { height, childCount, isExp }
  })

  // Total height of parent column
  const totalParentH = parentLayouts.reduce((s, l) => s + l.height + ROW_GAP, -ROW_GAP)
  const SVG_H = Math.max(totalParentH + PADDING * 2, 300)
  const SVG_W = PADDING + NODE_W + COL_GAP + CHILD_W + COL_GAP + CHILD_W + PADDING

  // Root node centered
  const rootX = ROOT_X
  const rootY = SVG_H / 2 - NODE_H / 2

  // Parent column X
  const parentX = rootX + NODE_W + COL_GAP

  // Lay out parents top-to-bottom
  let cursor = (SVG_H - totalParentH) / 2
  const layouts = parentLayouts.map((l, pi) => {
    const parentY = cursor + l.height / 2 - NODE_H / 2
    const childStartY = cursor + l.height / 2 - (l.childCount * (CHILD_H + ROW_GAP) - ROW_GAP) / 2

    const children = (parents[pi].children || []).map((c, ci) => ({
      x: parentX + NODE_W + COL_GAP,
      y: childStartY + ci * (CHILD_H + ROW_GAP),
      title: getChildTitle(c.content, `Sub-topic ${ci + 1}`),
      id: c.id,
      ci,
    }))

    cursor += l.height + ROW_GAP
    return { parentY, children, pi }
  })

  const rootCx = rootX + NODE_W
  const rootCy = rootY + NODE_H / 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg p-4">
      <div
        ref={containerRef}
        className="relative w-full max-w-6xl h-[88vh] rounded-3xl border border-slate-800 bg-[#0B0F17] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-300 text-base">🗺</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{docCode} — Document Mind Map</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click <span className="text-indigo-300 font-semibold">›</span> to expand sections · Click <span className="text-emerald-300 font-semibold">sub-topic nodes</span> to jump to content
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 overflow-auto bg-[#080D18] relative">
          <svg
            width={SVG_W}
            height={SVG_H}
            className="block min-w-full"
            style={{ minHeight: SVG_H }}
          >
            <defs>
              <filter id="glow-indigo">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-emerald">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* ── ROOT → PARENT connector lines ── */}
            {layouts.map(({ parentY, pi }) => {
              const px = parentX
              const py = parentY + NODE_H / 2
              const cx1 = rootCx + (px - rootCx) * 0.5
              return (
                <path
                  key={`root-p-${pi}`}
                  d={`M ${rootCx} ${rootCy} C ${cx1} ${rootCy}, ${cx1} ${py}, ${px} ${py}`}
                  fill="none"
                  stroke={pi === currentParentIdx ? '#6366f1' : '#334155'}
                  strokeWidth={pi === currentParentIdx ? 2 : 1.5}
                  strokeDasharray={pi === currentParentIdx ? '' : '5 4'}
                  opacity={0.7}
                />
              )
            })}

            {/* ── PARENT → CHILD connector lines ── */}
            {layouts.map(({ parentY, children, pi }) => {
              if (!expanded[pi] || children.length === 0) return null
              const pRx = parentX + NODE_W  // right edge of parent node
              const pCy = parentY + NODE_H / 2
              return children.map(({ x, y, ci }) => {
                const cy = y + CHILD_H / 2
                const cx1 = pRx + (x - pRx) * 0.5
                return (
                  <path
                    key={`p-c-${pi}-${ci}`}
                    d={`M ${pRx} ${pCy} C ${cx1} ${pCy}, ${cx1} ${cy}, ${x} ${cy}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    opacity={0.35}
                  />
                )
              })
            })}

            {/* ── ROOT NODE ── */}
            <g>
              <rect
                x={rootX} y={rootY}
                width={NODE_W} height={NODE_H}
                rx={18} ry={18}
                fill="url(#rootGrad)"
                filter="url(#glow-indigo)"
              />
              <defs>
                <linearGradient id="rootGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <text
                x={rootX + NODE_W / 2}
                y={rootY + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={11}
                fontWeight="bold"
                fontFamily="Inter, sans-serif"
              >
                {docTitle.length > 22 ? docTitle.slice(0, 20) + '…' : docTitle}
              </text>
            </g>

            {/* ── PARENT SECTION NODES ── */}
            {layouts.map(({ parentY, children, pi }) => {
              const parent = parents[pi]
              const isActive = pi === currentParentIdx
              const isExp = expanded[pi]
              const hasChildren = children.length > 0

              return (
                <g key={`parent-${pi}`}>
                  {/* Parent node rect */}
                  <rect
                    x={parentX} y={parentY}
                    width={NODE_W} height={NODE_H}
                    rx={10} ry={10}
                    fill={isActive ? '#1e1b4b' : '#1e293b'}
                    stroke={isActive ? '#6366f1' : '#475569'}
                    strokeWidth={isActive ? 2 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={() => { onClose(); onJump(pi, 0) }}
                  />
                  {/* Parent label */}
                  <text
                    x={parentX + 10}
                    y={parentY + NODE_H / 2}
                    dominantBaseline="middle"
                    fill={isActive ? '#a5b4fc' : '#cbd5e1'}
                    fontSize={10.5}
                    fontWeight={isActive ? 'bold' : '500'}
                    fontFamily="Inter, sans-serif"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => { onClose(); onJump(pi, 0) }}
                  >
                    {parent.title.length > 20 ? parent.title.slice(0, 18) + '…' : parent.title}
                  </text>

                  {/* Expand/Collapse button (like NotebookLM › / ‹) */}
                  {hasChildren && (
                    <g
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(prev => ({ ...prev, [pi]: !prev[pi] }))}
                    >
                      <circle
                        cx={parentX + NODE_W + 18}
                        cy={parentY + NODE_H / 2}
                        r={10}
                        fill="#1e293b"
                        stroke={isExp ? '#6366f1' : '#475569'}
                        strokeWidth={1.5}
                      />
                      <text
                        x={parentX + NODE_W + 18}
                        y={parentY + NODE_H / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isExp ? '#818cf8' : '#94a3b8'}
                        fontSize={12}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {isExp ? '‹' : '›'}
                      </text>
                    </g>
                  )}

                  {/* ── CHILD SUB-TOPIC NODES ── */}
                  {isExp && children.map(({ x, y, title, ci }) => (
                    <g key={`child-${pi}-${ci}`}>
                      <rect
                        x={x} y={y}
                        width={CHILD_W} height={CHILD_H}
                        rx={8} ry={8}
                        fill="#0d2a1e"
                        stroke="#10b981"
                        strokeWidth={1}
                        opacity={0.85}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { onClose(); onJump(pi, ci) }}
                        onMouseEnter={(e) => {
                          const rect = e.target.closest('svg').getBoundingClientRect()
                          setTooltip({ text: title, svgX: x, svgY: y - 14 })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      {/* Dot */}
                      <circle cx={x + 10} cy={y + CHILD_H / 2} r={3} fill="#34d399" />
                      {/* Child label */}
                      <text
                        x={x + 20}
                        y={y + CHILD_H / 2}
                        dominantBaseline="middle"
                        fill="#6ee7b7"
                        fontSize={10}
                        fontFamily="Inter, sans-serif"
                        fontWeight="500"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => { onClose(); onJump(pi, ci) }}
                      >
                        {title}
                      </text>
                    </g>
                  ))}
                </g>
              )
            })}

            {/* Tooltip overlay */}
            {tooltip && (
              <g>
                <rect
                  x={tooltip.svgX} y={tooltip.svgY - 16}
                  width={Math.min(tooltip.text.length * 6.5 + 16, 280)} height={22}
                  rx={6} fill="#1e293b" stroke="#475569" strokeWidth={1}
                />
                <text
                  x={tooltip.svgX + 8} y={tooltip.svgY - 5}
                  fill="#f1f5f9" fontSize={10} fontFamily="Inter, sans-serif"
                >{tooltip.text}</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}



export default function LearnSessionPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [needsReingest, setNeedsReingest] = useState(false)
  const [docTitle, setDocTitle] = useState('Document')
  const [docCode, setDocCode] = useState('SOP')
  const [structure, setStructure] = useState(null)
  const [currentParentIdx, setCurrentParentIdx] = useState(0)
  const [currentChildIdx, setCurrentChildIdx] = useState(0)
  const [expandedParents, setExpandedParents] = useState({})
  const [view, setView] = useState('reading')
  const [questionLoading, setQuestionLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [result, setResult] = useState(null)
  const [childScores, setChildScores] = useState({})
  const [qaOpen, setQaOpen] = useState(false)
  const [qaHistory, setQaHistory] = useState([])
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)

  // Mind Map modal states
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [mindMapData, setMindMapData] = useState(null)
  const [mindMapLoading, setMindMapLoading] = useState(false)
  const timerRef = useRef(0)
  const timerInterval = useRef(null)

  const startTimer = () => { timerRef.current = 0; if (timerInterval.current) clearInterval(timerInterval.current); timerInterval.current = setInterval(() => { timerRef.current += 1 }, 1000) }
  const stopTimer = () => { if (timerInterval.current) clearInterval(timerInterval.current); return timerRef.current }
  useEffect(() => () => { if (timerInterval.current) clearInterval(timerInterval.current) }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const docRes = await apiClient.get(`/documents/${documentId}`)
        setDocCode(docRes.data.code)
        setDocTitle(docRes.data.title)
        const res = await apiClient.get(`/learning/session/document/${documentId}/structure`)
        const data = res.data
        if (!data.has_parent_child || !data.parents?.length) { setNeedsReingest(true); return }
        setStructure(data)
        setExpandedParents({ 0: true })
        const scoresMap = {}
        for (const parent of data.parents) for (const child of parent.children) {
          scoresMap[child.id] = { score: child.knowledge_score, attempt_count: child.attempt_count, is_passed: child.is_passed }
        }
        setChildScores(scoresMap)
        let foundParent = 0, foundChild = 0
        outer: for (let pi = 0; pi < data.parents.length; pi++) {
          for (let ci = 0; ci < data.parents[pi].children.length; ci++) {
            if (!scoresMap[data.parents[pi].children[ci].id]?.is_passed) { foundParent = pi; foundChild = ci; break outer }
          }
        }
        setCurrentParentIdx(foundParent); setCurrentChildIdx(foundChild); setExpandedParents({ [foundParent]: true })
      } catch (err) {
        console.error('Failed to init learning session:', err)
        toast.error(err.response?.data?.detail || err.message || 'Failed to load learning session')
        navigate(-1)
      }
      finally { setLoading(false) }
    }
    init()
  }, [documentId])

  const currentParent = structure?.parents?.[currentParentIdx]
  const currentChild = currentParent?.children?.[currentChildIdx]
  const totalChildren = structure?.total_children ?? 0
  const passedChildren = Object.values(childScores).filter(s => s.is_passed).length
  const progressPct = totalChildren > 0 ? Math.round((passedChildren / totalChildren) * 100) : 0

  const isChildUnlocked = (pi, ci) => {
    if (pi === 0 && ci === 0) return true
    if (ci > 0) return childScores[structure.parents[pi].children[ci - 1]?.id]?.is_passed ?? false
    if (pi > 0) return structure.parents[pi - 1]?.children?.every(c => childScores[c.id]?.is_passed) ?? false
    return false
  }

  const loadQuestion = async (chunkId) => {
    setQuestionLoading(true); setSelectedOption(null); setResult(null)
    try {
      const res = await apiClient.get(`/learning/session/child/${chunkId}/question`)
      setCurrentQuestion(res.data)
      setChildScores(prev => ({ ...prev, [chunkId]: { score: res.data.knowledge_score, attempt_count: res.data.attempt_count, is_passed: res.data.is_passed } }))
      setView('question'); startTimer()
    } catch { toast.error('Failed to load question'); setView('reading') }
    finally { setQuestionLoading(false) }
  }

  const handleSubmit = async () => {
    if (!selectedOption || !currentQuestion || !currentChild) return
    setSubmitting(true); const timeSpent = stopTimer()
    try {
      const payload = {
        mcq_id: currentQuestion.mcq_id || currentQuestion.id || null,
        question_data: currentQuestion,
        selected_option: selectedOption,
        time_spent_seconds: timeSpent
      }
      const res = await apiClient.post(`/learning/session/child/${currentChild.id}/answer`, payload)
      setResult(res.data)
      setChildScores(prev => ({ ...prev, [currentChild.id]: { score: res.data.knowledge_score, attempt_count: (prev[currentChild.id]?.attempt_count ?? 0) + 1, is_passed: res.data.child_passed } }))
      setView('result')
    } catch { toast.error('Failed to submit answer') }
    finally { setSubmitting(false) }
  }

  const goToNextChild = () => {
    if (!currentParent) return
    if (currentChildIdx + 1 < currentParent.children.length) {
      setCurrentChildIdx(prev => prev + 1); setView('reading'); setResult(null); setCurrentQuestion(null); setSelectedOption(null)
    } else if (currentParentIdx + 1 < (structure?.parents?.length ?? 0)) {
      const nextPi = currentParentIdx + 1
      setCurrentParentIdx(nextPi); setCurrentChildIdx(0); setExpandedParents(prev => ({ ...prev, [nextPi]: true }))
      setView('reading'); setResult(null); setCurrentQuestion(null); setSelectedOption(null)
    } else { setView('doc_complete') }
  }

  const jumpToChild = (pi, ci) => {
    if (!isChildUnlocked(pi, ci)) { toast.warning('Complete the previous section first'); return }
    setCurrentParentIdx(pi); setCurrentChildIdx(ci); setView('reading'); setResult(null); setCurrentQuestion(null); setSelectedOption(null)
  }

  const handleAskQuestion = async () => {
    if (!qaQuestion.trim()) return
    const q = qaQuestion.trim(); setQaQuestion(''); setQaLoading(true); setQaHistory(prev => [...prev, { role: 'user', text: q }])
    try { const res = await apiClient.post('/learning/session/qa', { document_id: parseInt(documentId), question: q }); setQaHistory(prev => [...prev, { role: 'ai', text: res.data.answer }]) }
    catch { setQaHistory(prev => [...prev, { role: 'ai', text: 'Failed to get answer.' }]) }
    finally { setQaLoading(false) }
  }

  if (needsReingest) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-md mx-auto text-slate-200">
      <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
        <RefreshCcw className="h-8 w-8 text-slate-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Needs Re-processing</h2>
        <p className="text-slate-400 text-sm"><span className="text-white font-medium">{docTitle}</span> was uploaded before the new learning system.</p>
      </div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-4 py-2 rounded-xl border border-slate-700 bg-[#161C2C] transition-all">
        <ChevronLeft className="h-4 w-4" /> Go Back
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      <p className="text-sm text-slate-400 font-medium">Preparing your adaptive learning workspace...</p>
    </div>
  )

  if (view === 'doc_complete') {
    const avgScore = Object.values(childScores).length > 0 ? Math.round(Object.values(childScores).reduce((a, b) => a + b.score, 0) / Object.values(childScores).length) : 0
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-lg mx-auto">
        <div className="h-24 w-24 rounded-3xl bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Trophy className="h-12 w-12 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Document Mastery Complete!</h1>
          <p className="text-xs text-slate-400">You've mastered all sections of <span className="text-indigo-300 font-semibold">{docCode}</span></p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { label: 'Sections', value: structure.parents.length },
            { label: 'Passed Chunks', value: passedChildren },
            { label: 'Avg Score', value: `${avgScore}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-[#161C2C] p-4 text-center shadow-md">
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap justify-center pt-2">
          <button onClick={() => navigate(-1)} className="text-xs text-slate-300 hover:text-white px-4 py-2.5 rounded-xl border border-slate-700 bg-[#161C2C] transition-all">Back</button>
          <button onClick={() => navigate('/trainee/assessments')} className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl transition-all shadow-md">Take Qualification Exam</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8">
      {/* Header Workspace Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#161C2C] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {docCode}
              </span>
              <span className="text-xs font-bold text-white truncate">{docTitle}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Section {currentParentIdx + 1} of {structure?.parents?.length} • Sub-topic {currentChildIdx + 1} of {currentParent?.children?.length}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={async () => {
              setMindMapLoading(true)
              setMindMapOpen(true)
              try {
                const res = await apiClient.get(`/learning/session/document/${documentId}/mindmap`)
                setMindMapData(res.data)
              } catch (err) {
                const msg = err.response?.data?.detail || 'Failed to load mind map'
                toast.error(msg)
              } finally {
                setMindMapLoading(false)
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#0F1420] text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-all shadow-xs"
          >
            <Map className="h-3.5 w-3.5 text-indigo-400" /> Mind Map
          </button>

          <button
            onClick={() => setQaOpen(o => !o)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all border ${
              qaOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-[#0F1420] text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Ask AI
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Curriculum Drawer Navigation (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#161C2C] p-4 shadow-md space-y-3 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between text-xs font-semibold text-white mb-2">
              <span>Curriculum Progress</span>
              <span className="font-mono text-indigo-400">{progressPct}%</span>
            </div>
            <KnowledgeBar score={progressPct} />
            <p className="text-[10px] text-slate-400 mt-1">{passedChildren} of {totalChildren} sub-topics completed</p>
          </div>

          <div className="space-y-1">
            {structure?.parents?.map((parent, pi) => {
              const isExpanded = expandedParents[pi]
              const parentPassed = parent.children.every(c => childScores[c.id]?.is_passed)
              const parentInProgress = parent.children.some(c => (childScores[c.id]?.attempt_count ?? 0) > 0)
              const isCurrentParent = pi === currentParentIdx

              return (
                <div key={parent.id} className="rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedParents(prev => ({ ...prev, [pi]: !prev[pi] }))}
                    className={`w-full text-left p-2.5 text-xs transition-all flex items-center gap-2 rounded-xl ${
                      isCurrentParent ? 'bg-indigo-600/10 border border-indigo-500/30 text-white font-bold' : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    {parentPassed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      : parentInProgress ? <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-400 shrink-0" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0" />}
                    <span className="flex-1 truncate">{pi + 1}. {parent.title}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3 text-slate-400 shrink-0" /> : <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="ml-3 my-1 space-y-1 border-l border-slate-800 pl-2">
                      {parent.children.map((child, ci) => {
                        const score = childScores[child.id]
                        const isPassed = score?.is_passed ?? false
                        const inProgress = !isPassed && (score?.attempt_count ?? 0) > 0
                        const isLocked = !isChildUnlocked(pi, ci)
                        const isCurrent = pi === currentParentIdx && ci === currentChildIdx
                        
                        // Extract clean display title for child node
                        const cleanText = child.content.strip ? child.content.strip() : child.content
                        const childTitle = cleanText.split('\n')[0].replace(/[*#`{}]/g, '').trim()

                        return (
                          <button
                            key={child.id}
                            onClick={() => jumpToChild(pi, ci)}
                            disabled={isLocked}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center gap-2 transition-all ${
                              isCurrent
                                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                : isPassed ? 'text-emerald-400 hover:bg-emerald-500/10'
                                : inProgress ? 'text-amber-300 hover:bg-amber-500/10'
                                : isLocked ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                            }`}
                          >
                            {isLocked ? <Lock className="h-3 w-3 shrink-0 text-slate-600" />
                              : isPassed ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                              : inProgress ? <div className="h-2.5 w-2.5 rounded-full border border-amber-400 shrink-0" />
                              : <div className="h-2.5 w-2.5 rounded-full border border-slate-700 shrink-0" />}
                            <span className="truncate flex-1">{childTitle || `Sub-topic ${ci + 1}`}</span>
                            {score?.score > 0 && <span className="font-mono text-[10px] opacity-80">{Math.round(score.score)}%</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Center Main Column: Reading Material & Evaluation Workspace (Adaptive 6 to 9 cols) */}
        <div className={`space-y-4 transition-all duration-300 ${qaOpen ? 'lg:col-span-6' : 'lg:col-span-9'}`}>
          {view === 'reading' && currentChild && (
            <div className="rounded-3xl border border-slate-800 bg-[#161C2C] p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Sub-topic {currentChildIdx + 1} of {currentParent?.children?.length}</h3>
                    <p className="text-xs text-slate-400">{currentParent?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {childScores[currentChild.id]?.attempt_count > 0 && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      childScores[currentChild.id]?.is_passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {Math.round(childScores[currentChild.id]?.score ?? 0)}% score
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                    {currentChild.token_count} words
                  </span>
                </div>
              </div>

              {/* Sub-topic Main Content */}
              <div className="text-xs text-slate-200 leading-relaxed font-sans prose prose-invert prose-xs max-w-none prose-headings:font-bold prose-headings:text-white prose-h3:text-sm prose-p:my-2.5 prose-ul:my-2 prose-ul:pl-4 prose-code:text-indigo-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0F1420] prose-pre:border prose-pre:border-slate-800 prose-pre:p-4 prose-pre:rounded-2xl">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {normalizeContent(currentChild.content)}
                </ReactMarkdown>
              </div>

              {/* Key Takeaway Learning Card */}
              {currentChild.learning_card && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" /> Key Learning Takeaway
                  </div>
                  <div className="text-xs text-indigo-200 leading-relaxed font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentChild.learning_card}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Bottom Test Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => loadQuestion(currentChild.id)}
                  disabled={questionLoading}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {questionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  <span>Test Knowledge on this Sub-topic</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Question State */}
          {view === 'question' && currentQuestion && (
            <div className="rounded-3xl border border-slate-800 bg-[#161C2C] p-6 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Brain className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Diagnostic Evaluation</h3>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${DIFFICULTY_CONFIG[currentQuestion.difficulty]?.badge}`}>
                  {DIFFICULTY_CONFIG[currentQuestion.difficulty]?.label ?? currentQuestion.difficulty}
                </span>
              </div>

              <div className="text-sm font-semibold text-white leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentQuestion.question}</ReactMarkdown>
              </div>

              <div className="grid gap-2.5 pt-2">
                {Object.entries(currentQuestion.options ?? {}).map(([key, val]) => {
                  const isSelected = selectedOption === key
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedOption(key)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-xs text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-white font-semibold shadow-xs'
                          : 'border-slate-800 bg-[#0F1420] text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {key}
                      </span>
                      <span className="flex-1">{val}</span>
                    </button>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOption || submitting}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Evaluating Answer...' : 'Submit Diagnostic Answer'}
                </button>
              </div>
            </div>
          )}

          {/* Result State */}
          {view === 'result' && result && (
            <div className="rounded-3xl border border-slate-800 bg-[#161C2C] p-6 shadow-md space-y-5">
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                result.is_correct ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}>
                {result.is_correct ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="text-xs font-bold">{result.is_correct ? 'Correct Evaluation!' : 'Needs Review'}</h4>
                  {result.explanation && <p className="text-xs mt-1 leading-relaxed text-slate-300">{result.explanation}</p>}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                {result.child_passed ? (
                  <button onClick={goToNextChild} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5">
                    Continue to Next Sub-topic <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => setView('reading')} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold">
                    Re-read Section Material
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Assistant Integrated Sidebar Panel (3 cols) */}
        {qaOpen && (
          <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#161C2C] shadow-md flex flex-col h-[calc(100vh-6rem)] sticky top-4 overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0F1420]">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>AI Document Assistant</span>
              </div>
              <button onClick={() => setQaOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {qaHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <MessageSquare className="h-8 w-8 mx-auto text-indigo-400 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-300">Ask about this SOP</p>
                  <p className="text-[11px] text-slate-400">Get grounded answers from this document.</p>
                </div>
              ) : (
                qaHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-xs font-medium'
                        : 'bg-[#0F1420] border border-slate-800 text-slate-200 rounded-tl-xs prose prose-invert prose-xs'
                    }`}>
                      {msg.role === 'user' ? msg.text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>}
                    </div>
                  </div>
                ))
              )}
              {qaLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#0F1420] border border-slate-800 rounded-2xl px-3 py-2 text-indigo-400 text-xs flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synthesizing answer...
                  </div>
                </div>
              )}
            </div>

            {/* Input Prompt Box */}
            <div className="p-3 border-t border-slate-800 bg-[#0F1420]">
              <div className="flex items-center gap-2">
                <input
                  value={qaQuestion}
                  onChange={e => setQaQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="Ask about this document..."
                  className="flex-1 rounded-xl border border-slate-800 bg-[#161C2C] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={qaLoading || !qaQuestion.trim()}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive SVG Mind Map — NotebookLM Style */}
      <MindMapModal
        open={mindMapOpen}
        onClose={() => setMindMapOpen(false)}
        docCode={docCode}
        docTitle={docTitle}
        parents={structure?.parents ?? []}
        currentParentIdx={currentParentIdx}
        onJump={jumpToChild}
      />
    </div>
  )
}


