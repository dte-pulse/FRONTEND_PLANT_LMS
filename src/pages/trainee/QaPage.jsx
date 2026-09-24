import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { get, post } from '@/api/client'
import { toast } from 'sonner'
import { Send, BookOpen, Search, ChevronDown, Sparkles, Bot, User, CornerDownRight, Network, X, CheckCircle2, Lock, FileText, Loader2, Clock, CheckCheck, FileSearch } from 'lucide-react'
import MindMapModal from '@/components/shared/MindMapModal'

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
    } catch (err) {
      console.error('Failed to get answer:', err)
      const msg = err.response?.data?.detail || err.message || 'Failed to get an answer'
      setSessions(prev => prev.map(s => s.id === tempId ? { ...s, answer: msg, _loading: false } : s))
      toast.error(msg)
    } finally {
      setAsking(false)
    }
  }

  // Mind-map node click → summarize that topic in the Q&A thread
  const handleSummarizeTopic = (topic) => {
    if (!topic || !selectedDoc) return
    setMindMapOpen(false)
    handleAsk(null, `Summarize "${topic}" and list the key points I need to remember.`)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
            <Sparkles className="h-3.5 w-3.5" /> AI Assistant
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Document Q&amp;A</h1>
          <p className="text-xs text-slate-400 mt-1">Ask anything about your assigned documents — answers are grounded in the source content.</p>
        </div>
        <button
          onClick={fetchMindMap}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-[#131825] text-slate-200 hover:text-white hover:border-slate-600 text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs shrink-0"
        >
          <Network className="h-3.5 w-3.5 text-emerald-400" />
          <span>Mind Map</span>
        </button>
      </div>

      {/* Document selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-800 bg-[#131825] text-left shadow-xs hover:border-slate-700 transition-[color,background-color,border-color,box-shadow,transform,opacity]"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              {selectedDoc ? `${selectedDoc.code} — ${selectedDoc.title}` : 'Select a document'}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {dropdownOpen && (
          <div
            role="listbox"
            className="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-slate-800 bg-[#131825] shadow-2xl p-1.5"
          >
            {documents.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-slate-400">No assigned documents yet.</p>
            )}
            {documents.map(d => (
              <button
                key={d.id}
                role="option"
                aria-selected={selectedDoc?.id === d.id}
                onClick={() => { setSelectedDoc(d); setDropdownOpen(false) }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors ${selectedDoc?.id === d.id ? 'bg-emerald-500/10 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800/60'}`}
              >
                <span className="font-bold">{d.code}</span> — {d.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Q&A thread */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#131825] p-5 shadow-sm min-h-[320px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <p className="text-xs font-medium">Loading conversation...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileSearch className="h-5 w-5 text-emerald-300" />
            </div>
            <p className="text-sm font-semibold text-slate-200">No questions yet</p>
            <p className="text-xs text-slate-400 max-w-xs">Ask your first question about <span className="text-emerald-300 font-semibold">{selectedDoc?.code}</span> — or open the Mind Map and click any topic to summarize it.</p>
          </div>
        ) : (
          <div className="space-y-5 overflow-y-auto max-h-[52vh] pr-1">
            {sessions.map(s => (
              <div key={s.id} className="space-y-3">
                {/* User question */}
                <div className="flex items-start justify-end gap-3">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600/15 border border-emerald-500/25 px-4 py-2.5">
                    <p className="text-sm text-emerald-100 font-medium whitespace-pre-wrap">{s.question}</p>
                    <p className="text-[10px] text-emerald-300/70 mt-1 text-right flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" /> {s.time}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
                {/* Bot answer */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-900/60 border border-slate-800 px-4 py-3">
                    {s._loading ? (
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" /> Searching the document...
                      </p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none text-slate-200 [&_code]:font-mono [&_code]:text-[11px]">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{s.answer || ''}</ReactMarkdown>
                      </div>
                    )}
                    {!s._loading && (
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
                        {s.is_resolved ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Clock className="h-3 w-3" />}
                        {s.time}{s.is_resolved ? ' · Resolved' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Ask form */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#131825] p-4 shadow-sm">
        <form onSubmit={handleAsk} className="flex items-center gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={selectedDoc ? `Ask about ${selectedDoc.code}...` : 'Select a document first...'}
            disabled={!selectedDoc || asking}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={asking || !question.trim() || !selectedDoc}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs"
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
        hintText="to summarize it in Q&A"
      />

      {/* Mind Map Loading overlay */}
      {mindMapOpen && mindMapLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4 bg-[#0B0F17] border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium">Building document mind map tree...</p>
          </div>
        </div>
      )}

      {/* Mind Map empty state */}
      {mindMapOpen && !mindMapLoading && (!mindMapData?.nodes?.length) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4 bg-[#0B0F17] border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <Network className="h-10 w-10 text-slate-500" />
            <p className="text-sm text-slate-300 font-medium">No mind map available for this document.</p>
            <button onClick={() => setMindMapOpen(false)} className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
