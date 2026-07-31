import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { get, post } from '@/api/client'
import { toast } from 'sonner'
import { Send, BookOpen, Search, ChevronDown, Sparkles, Bot, User, CornerDownRight, Network, X, CheckCircle2, Lock, FileText, Loader2, Clock, CheckCheck, FileSearch } from 'lucide-react'

const STATUS_CONFIG = {
  completed:   { dot: 'bg-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
  in_progress: { dot: 'bg-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'In Progress' },
  locked:      { dot: 'bg-slate-700', border: 'border-slate-800', bg: 'bg-slate-900/60', text: 'text-slate-500', label: 'Locked' },
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
const COL_GAP = 110
const ROW_GAP = 14

function MindMapModal({ open, onClose, docCode, docTitle, nodes, onNodeClick }) {
  const [expanded, setExpanded] = useState({})
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (open && nodes?.length) {
      const m = {}
      nodes.forEach((_, i) => { m[i] = true })
      setExpanded(m)
    }
  }, [open, nodes])

  if (!open) return null

  const PADDING = 40
  const parents = nodes || []

  const parentLayouts = parents.map((p, pi) => {
    const isExp = expanded[pi]
    const childCount = isExp ? (p.children?.length ?? 0) : 0
    const childrenH = childCount > 0 ? childCount * (CHILD_H + ROW_GAP) - ROW_GAP : 0
    const height = Math.max(NODE_H, childrenH)
    return { height, childCount, isExp }
  })

  const totalParentH = parentLayouts.reduce((s, l) => s + l.height + ROW_GAP, -ROW_GAP)
  const SVG_H = Math.max(totalParentH + PADDING * 2, 300)
  const SVG_W = PADDING + NODE_W + COL_GAP + NODE_W + 18 + COL_GAP + CHILD_W + PADDING

  const rootX = PADDING
  const rootY = SVG_H / 2 - NODE_H / 2
  const parentX = rootX + NODE_W + COL_GAP
  const rootCx = rootX + NODE_W
  const rootCy = rootY + NODE_H / 2

  let cursor = (SVG_H - totalParentH) / 2
  const layouts = parentLayouts.map((l, pi) => {
    const parentY = cursor + l.height / 2 - NODE_H / 2
    const childStartY = cursor + l.height / 2 - (l.childCount * (CHILD_H + ROW_GAP) - ROW_GAP) / 2
    const children = (parents[pi].children || []).map((c, ci) => ({
      x: parentX + NODE_W + 18 + COL_GAP,
      y: childStartY + ci * (CHILD_H + ROW_GAP),
      title: getChildTitle(c.title || c.content, `Sub-topic ${ci + 1}`),
      raw: c.title || getChildTitle(c.content, `Sub-topic ${ci + 1}`),
      id: c.id,
      ci,
    }))
    cursor += l.height + ROW_GAP
    return { parentY, children, pi }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg p-4">
      <div className="relative w-full max-w-6xl h-[88vh] rounded-3xl border border-slate-800 bg-[#0B0F17] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-300 text-base">🗺</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{docCode} — Document Mind Map</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click <span className="text-indigo-300 font-semibold">›</span> to expand · Click any <span className="text-emerald-300 font-semibold">node</span> to summarize it in Q&A
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 overflow-auto bg-[#080D18] relative">
          <svg width={SVG_W} height={SVG_H} className="block" style={{ minHeight: SVG_H, minWidth: SVG_W }}>
            <defs>
              <filter id="qa-glow-indigo">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="qa-rootGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>

            {/* Root → Parent lines */}
            {layouts.map(({ parentY, pi }) => {
              const px = parentX
              const py = parentY + NODE_H / 2
              const cx1 = rootCx + (px - rootCx) * 0.5
              return (
                <path key={`rp-${pi}`}
                  d={`M ${rootCx} ${rootCy} C ${cx1} ${rootCy}, ${cx1} ${py}, ${px} ${py}`}
                  fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7}
                />
              )
            })}

            {/* Parent → Child lines */}
            {layouts.map(({ parentY, children, pi }) => {
              if (!expanded[pi] || !children.length) return null
              const pRx = parentX + NODE_W + 18
              const pCy = parentY + NODE_H / 2
              return children.map(({ x, y, ci }) => {
                const cy = y + CHILD_H / 2
                const cx1 = pRx + (x - pRx) * 0.5
                return (
                  <path key={`pc-${pi}-${ci}`}
                    d={`M ${pRx} ${pCy} C ${cx1} ${pCy}, ${cx1} ${cy}, ${x} ${cy}`}
                    fill="none" stroke="#10b981" strokeWidth={1.5} opacity={0.35}
                  />
                )
              })
            })}

            {/* Root Node */}
            <g style={{ cursor: 'pointer' }} onClick={() => onNodeClick(docTitle)}>
              <rect x={rootX} y={rootY} width={NODE_W} height={NODE_H} rx={18}
                fill="url(#qa-rootGrad)" filter="url(#qa-glow-indigo)" />
              <text x={rootX + NODE_W / 2} y={rootY + NODE_H / 2}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={11} fontWeight="bold" fontFamily="Inter, sans-serif">
                {docTitle.length > 22 ? docTitle.slice(0, 20) + '…' : docTitle}
              </text>
            </g>

            {/* Parent Section Nodes */}
            {layouts.map(({ parentY, children, pi }) => {
              const parent = parents[pi]
              const isExp = expanded[pi]
              const hasChildren = children.length > 0
              const cfg = STATUS_CONFIG[parent.status] ?? STATUS_CONFIG.locked

              return (
                <g key={`par-${pi}`}>
                  <rect x={parentX} y={parentY} width={NODE_W} height={NODE_H} rx={10}
                    fill="#1e293b" stroke={parent.status === 'completed' ? '#10b981' : parent.status === 'in_progress' ? '#f59e0b' : '#475569'}
                    strokeWidth={1.5} style={{ cursor: 'pointer' }}
                    onClick={() => onNodeClick(parent.title)}
                  />
                  <text x={parentX + 10} y={parentY + NODE_H / 2}
                    dominantBaseline="middle" fill="#cbd5e1"
                    fontSize={10.5} fontWeight="500" fontFamily="Inter, sans-serif"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => onNodeClick(parent.title)}
                  >
                    {parent.title?.length > 20 ? parent.title.slice(0, 18) + '…' : parent.title}
                  </text>

                  {/* ✨ Click to summarize hint */}
                  <text x={parentX + 10} y={parentY + NODE_H + 10}
                    fill="#6366f1" fontSize={8.5} fontFamily="Inter, sans-serif"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                    opacity={0.7}
                  >
                    ✨ click to summarize
                  </text>

                  {/* Expand/Collapse button */}
                  {hasChildren && (
                    <g style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(prev => ({ ...prev, [pi]: !prev[pi] }))}>
                      <circle cx={parentX + NODE_W + 18} cy={parentY + NODE_H / 2} r={10}
                        fill="#1e293b" stroke={isExp ? '#6366f1' : '#475569'} strokeWidth={1.5} />
                      <text x={parentX + NODE_W + 18} y={parentY + NODE_H / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={isExp ? '#818cf8' : '#94a3b8'}
                        fontSize={12} fontFamily="monospace" fontWeight="bold">
                        {isExp ? '‹' : '›'}
                      </text>
                    </g>
                  )}

                  {/* Child Sub-topic Nodes */}
                  {isExp && children.map(({ x, y, title, raw, ci }) => (
                    <g key={`ch-${pi}-${ci}`}>
                      <rect x={x} y={y} width={CHILD_W} height={CHILD_H} rx={8}
                        fill="#0d2a1e" stroke="#10b981" strokeWidth={1} opacity={0.85}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNodeClick(raw)}
                        onMouseEnter={() => setTooltip({ text: raw, svgX: x, svgY: y - 14 })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      <circle cx={x + 10} cy={y + CHILD_H / 2} r={3} fill="#34d399" />
                      <text x={x + 20} y={y + CHILD_H / 2}
                        dominantBaseline="middle" fill="#6ee7b7"
                        fontSize={10} fontFamily="Inter, sans-serif" fontWeight="500"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => onNodeClick(raw)}
                      >
                        {title}
                      </text>
                    </g>
                  ))}
                </g>
              )
            })}

            {/* Tooltip */}
            {tooltip && (
              <g>
                <rect x={tooltip.svgX} y={tooltip.svgY - 16}
                  width={Math.min(tooltip.text.length * 6.5 + 16, 280)} height={22}
                  rx={6} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                <text x={tooltip.svgX + 8} y={tooltip.svgY - 5}
                  fill="#f1f5f9" fontSize={10} fontFamily="Inter, sans-serif">{tooltip.text}</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}



export default function QaPage() {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [sessions, setSessions] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Mind Map modal states
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [mindMapData, setMindMapData] = useState(null)
  const [mindMapLoading, setMindMapLoading] = useState(false)

  const bottomRef = useRef(null)

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await get('/learning/assigned')
        const assigned = data.map(item => ({
          id: item.document_id, code: item.document_code, title: item.document_title, status: item.document_status,
        }))
        setDocuments(assigned)
        if (assigned.length > 0) setSelectedDoc(assigned[0])
      } catch { toast.error('Failed to load documents') }
    }
    fetchDocs()
  }, [])

  useEffect(() => { if (selectedDoc) fetchHistory() }, [selectedDoc])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [sessions])

  const fetchHistory = async () => {
    if (!selectedDoc) return
    setLoading(true)
    try { setSessions(Array.isArray(await get(`/qa?document_id=${selectedDoc.id}`)) ? await get(`/qa?document_id=${selectedDoc.id}`) : []) }
    catch { setSessions([]) }
    finally { setLoading(false) }
  }

  const fetchMindMap = async () => {
    if (!selectedDoc) return
    setMindMapLoading(true)
    setMindMapData(null)
    setMindMapOpen(true)
    try {
      const data = await get(`/learning/session/document/${selectedDoc.id}/mindmap`)
      setMindMapData(data)
    } catch (err) {
      console.error('Failed to load mind map:', err)
      const msg = err.response?.data?.detail || err.message || 'Failed to load mind map for this document'
      toast.error(msg)
    } finally {
      setMindMapLoading(false)
    }
  }

  const handleAsk = async (e, customQuery = null) => {
    if (e) e.preventDefault()
    const q = (customQuery || question).trim()
    if (!q || !selectedDoc) return
    setAsking(true)
    setQuestion('')
    const tempId = Date.now()
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setSessions(prev => [...prev, { id: tempId, question: q, answer: '…', time: timeStr, is_resolved: false, _loading: true }])
    try {
      const res = await post('/qa', { document_id: selectedDoc.id, question: q })
      setSessions(prev => prev.map(s => s.id === tempId ? { ...res, time: timeStr, _loading: false } : s))
    } catch {
      setSessions(prev => prev.filter(s => s.id !== tempId))
      toast.error('Failed to get answer.'); setQuestion(q)
    } finally { setAsking(false) }
  }

  const handleSummarizeTopic = (topicTitle) => {
    setMindMapOpen(false)
    const prompt = `Please summarize the topic "${topicTitle}" covered in this document.`
    handleAsk(null, prompt)
  }

  const samplePrompts = [
    'What are the core safety protocols in this SOP?',
    'Summarize step-by-step procedures',
    'What are the mandatory compliance checks?',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4 pb-2 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 border-b border-slate-800/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> AI Knowledge Assistant
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SOP Q&A Workspace</h1>
          <p className="text-xs text-slate-400">Ask questions directly grounded in your assigned plant SOP documents</p>
        </div>

        <div className="flex items-center gap-3">
          {selectedDoc && (
            <button
              onClick={fetchMindMap}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-300 hover:text-white transition-all shadow-xs"
            >
              <Network className="h-4 w-4 text-indigo-400" />
              <span>Mind Map</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-700 bg-[#161C2C] text-xs font-medium text-slate-200 hover:border-indigo-500/50 transition-all shadow-xs"
            >
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span className="max-w-[180px] truncate font-semibold">{selectedDoc?.code || 'Select Document'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-[#161C2C] border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target SOP Document</p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                  {documents.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => { setSelectedDoc(doc); setDropdownOpen(false); setSessions([]) }}
                      className={`w-full text-left px-4 py-3 hover:bg-indigo-500/10 transition-colors ${selectedDoc?.id === doc.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300'}`}
                    >
                      <p className="font-mono text-[10px] font-bold text-indigo-400">{doc.code}</p>
                      <p className="truncate text-xs font-medium mt-0.5">{doc.title}</p>
                    </button>
                  ))}
                  {documents.length === 0 && <p className="px-4 py-3 text-xs text-slate-500">No active assigned SOPs found</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 overflow-y-auto rounded-3xl border border-slate-800/80 bg-[#0F1420]/80 p-4 sm:p-6 space-y-6 shadow-inner">
        {!selectedDoc && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Search className="h-10 w-10 mb-3 stroke-[1.5] text-slate-600" />
            <p className="text-sm font-medium">Select an assigned SOP above to start asking questions</p>
          </div>
        )}

        {selectedDoc && loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
          </div>
        )}

        {selectedDoc && !loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Bot className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Ask anything about {selectedDoc.code}</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">All answers are cross-referenced directly with document chunks and page numbers.</p>

            <div className="mt-6 space-y-2.5 w-full max-w-md">
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Suggested Questions</p>
              <div className="flex flex-col gap-2">
                {samplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={(e) => handleAsk(e, prompt)}
                    className="text-left text-xs text-slate-300 bg-[#161C2C] hover:bg-indigo-500/10 border border-slate-700/80 hover:border-indigo-500/40 rounded-xl px-4 py-3 transition-all flex items-center justify-between group shadow-xs"
                  >
                    <span>{prompt}</span>
                    <CornerDownRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {sessions.map(s => (
          <div key={s.id} className="space-y-4 max-w-4xl mx-auto">
            {/* User Question Bubble */}
            <div className="flex justify-end items-start gap-3">
              <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-md">
                <p className="text-xs leading-relaxed font-normal">{s.question}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-indigo-200/70 font-medium">
                  <Clock className="h-3 w-3" />
                  <span>{s.time || 'Just now'}</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            </div>

            {/* AI Assistant Bubble */}
            <div className="flex justify-start items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className={`max-w-[84%] rounded-2xl rounded-tl-xs px-5 py-4 space-y-3 shadow-md border ${
                s._loading ? 'border-slate-800 bg-[#161C2C]' : 'border-slate-800/90 bg-[#161C2C]'
              }`}>
                {s._loading ? (
                  <div className="space-y-2 py-1">
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium animate-pulse">
                      <FileSearch className="h-4 w-4 animate-spin" />
                      <span>Searching SOP document chunks & synthesizing response...</span>
                    </div>
                    <div className="h-2 w-3/4 bg-slate-800 rounded-full animate-pulse" />
                    <div className="h-2 w-1/2 bg-slate-800 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-slate-200 leading-relaxed font-sans prose prose-invert prose-xs max-w-none prose-headings:font-bold prose-headings:text-white prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5 prose-h4:text-xs prose-h4:mt-2.5 prose-h4:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-ul:pl-4 prose-li:my-0.5 prose-code:text-indigo-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:p-3 prose-pre:rounded-xl">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {s.answer}
                      </ReactMarkdown>
                    </div>

                    {/* Source Citation Badges */}
                    {(s.page_ref || (s.source_chunks && s.source_chunks.length > 0)) && (
                      <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-400 flex items-center gap-1">
                          <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> Grounded Evidence:
                        </span>
                        {s.page_ref && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                            Page {s.page_ref}
                          </span>
                        )}
                        {s.source_chunks?.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
                            Chunk #{c.chunk_index ?? i + 1}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Box & Action Footer */}
      <div className="flex-shrink-0 space-y-1 max-w-4xl mx-auto w-full">
        <form onSubmit={handleAsk} className="flex gap-3 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={!selectedDoc || asking}
              placeholder={selectedDoc ? `Ask a question about ${selectedDoc.code}…` : 'Select an SOP document first'}
              className="w-full bg-[#161C2C] border border-slate-700/90 rounded-2xl px-5 py-3.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm pr-16"
            />
            {question.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                {question.length} chars
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!question.trim() || !selectedDoc || asking}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-40 transition-all shadow-lg shadow-indigo-600/20 shrink-0"
          >
            {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {asking ? 'Searching...' : 'Ask AI'}
          </button>
        </form>
      </div>

      {/* SVG Interactive Mind Map — NotebookLM Style */}
      <MindMapModal
        open={mindMapOpen && !mindMapLoading && !!mindMapData?.nodes?.length}
        onClose={() => setMindMapOpen(false)}
        docCode={selectedDoc?.code ?? ''}
        docTitle={mindMapData?.document_title ?? selectedDoc?.title ?? ''}
        nodes={mindMapData?.nodes ?? []}
        onNodeClick={handleSummarizeTopic}
      />

      {/* Mind Map Loading overlay */}
      {mindMapOpen && mindMapLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4 bg-[#0B0F17] border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium">Building document mind map tree...</p>
          </div>
        </div>
      )}

      {/* Mind Map empty state */}
      {mindMapOpen && !mindMapLoading && (!mindMapData?.nodes?.length) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4 bg-[#0B0F17] border border-slate-800 rounded-3xl p-10 shadow-2xl max-w-sm text-center">
            <FileText className="h-10 w-10 text-slate-500 stroke-[1]" />
            <p className="text-sm text-slate-300 font-medium">No mind map available for this document.</p>
            <button onClick={() => setMindMapOpen(false)} className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}


