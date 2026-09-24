import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import {
  BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Play,
  Sparkles, Award, Clock, ArrowRight, RefreshCw, Map, X, Lock
} from 'lucide-react'

const STATUS_CONFIG = {
  completed:   { dot: 'bg-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
  in_progress: { dot: 'bg-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'In Progress' },
  locked:      { dot: 'bg-slate-700', border: 'border-slate-800', bg: 'bg-slate-900/60', text: 'text-slate-500', label: 'Locked' },
}

function getChildTitle(content, fallback) {
  if (!content) return fallback
  let cleanContent = content.trim()
  if (cleanContent.startsWith('[Preceding Section:')) {
    const closeBracketIdx = cleanContent.indexOf(']')
    if (closeBracketIdx !== -1) {
      cleanContent = cleanContent.slice(closeBracketIdx + 1).trim()
      if (cleanContent.startsWith('...')) {
        const firstNewlineIdx = cleanContent.indexOf('\n')
        if (firstNewlineIdx !== -1) {
          cleanContent = cleanContent.slice(firstNewlineIdx + 1).trim()
        }
      }
    }
  }
  const lines = cleanContent.split('\n')
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

import MindMapModal from '@/components/shared/MindMapModal'

export default function TraineeAssessmentsPage() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list')
  const [activeAssignment, setActiveAssignment] = useState(null)
  const [chunks, setChunks] = useState([])
  const [activeChunkIdx, setActiveChunkIdx] = useState(0)
  const [loadingChunks, setLoadingChunks] = useState(false)
  const [mcqs, setMcqs] = useState([])
  const [answers, setAnswers] = useState({})
  const [loadingMcqs, setLoadingMcqs] = useState(false)
  const [examStartTime, setExamStartTime] = useState(null)
  const [score, setScore] = useState(0)
  const [passed, setPassed] = useState(false)
  const [feedback, setFeedback] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // Mind Map States
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [mindMapData, setMindMapData] = useState(null)
  const [mindMapLoading, setMindMapLoading] = useState(false)

  const fetchMindMap = async (docId) => {
    setMindMapLoading(true)
    setMindMapData(null)
    setMindMapOpen(true)
    try {
      const res = await apiClient.get(`/learning/session/document/${docId}/mindmap`)
      setMindMapData(res.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load mind map')
      setMindMapOpen(false)
    } finally {
      setMindMapLoading(false)
    }
  }

  const handleMindMapNodeClick = (nodeTitle) => {
    if (view !== 'study' || !chunks?.length || !nodeTitle) return
    const cleanSearch = nodeTitle.toLowerCase().trim()
    
    // Attempt exact or substring matching in chunks content to jump the user
    const foundIdx = chunks.findIndex(c => {
      const content = (c.content || '').toLowerCase()
      return content.includes(cleanSearch)
    })
    
    if (foundIdx !== -1) {
      setActiveChunkIdx(foundIdx)
      setMindMapOpen(false)
      toast.success(`Jumped to: ${nodeTitle}`)
    } else {
      // If we can't find direct match, check if we can match any section numbers like "1.1"
      const numberMatch = cleanSearch.match(/^(\d+\.\d+)/)
      if (numberMatch) {
        const numClean = numberMatch[1]
        const fallbackIdx = chunks.findIndex(c => (c.content || '').toLowerCase().includes(numClean))
        if (fallbackIdx !== -1) {
          setActiveChunkIdx(fallbackIdx)
          setMindMapOpen(false)
          toast.success(`Jumped to section: ${numClean}`)
          return
        }
      }
      toast.info(`Viewing section: ${nodeTitle}`)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [assnRes, docsRes] = await Promise.all([apiClient.get('/learning/assigned'), apiClient.get('/documents')])
      setAssignments(assnRes.data); setDocuments(docsRes.data)
    } catch { toast.error('Failed to load training assignments') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const getDocDetails = (docId) => documents.find(d => d.id === docId) || { code: 'SOP', title: 'Loading...' }

  const startStudying = async (assn) => {
    setActiveAssignment(assn); setView('study'); setActiveChunkIdx(0); setLoadingChunks(true)
    try { setChunks((await apiClient.get(`/documents/${assn.document_id}/chunks`)).data) }
    catch { toast.error('Failed to load contents') }
    finally { setLoadingChunks(false) }
  }

  const startExam = async () => {
    setView('exam'); setAnswers({}); setExamStartTime(Date.now()); setLoadingMcqs(true)
    try { setMcqs((await apiClient.get(`/mcq/document/${activeAssignment.document_id}`)).data) }
    catch { toast.error('Failed to load questions') }
    finally { setLoadingMcqs(false) }
  }

  const handleSelectOption = (mcqId, option) => setAnswers(prev => ({ ...prev, [mcqId]: option }))

  const handleSubmitExam = async () => {
    if (Object.keys(answers).length < mcqs.length) { toast.error('Please answer all questions before submitting'); return }
    setSubmitting(true)
    try {
      const payload = {
        document_id: activeAssignment.document_id,
        submissions: Object.entries(answers).map(([mcqId, so]) => ({ mcq_id: Number(mcqId), selected_option: so })),
        duration_seconds: examStartTime ? Math.round((Date.now() - examStartTime) / 1000) : 60,
      }
      const result = (await apiClient.post(`/mcq/document/${activeAssignment.document_id}/effectiveness-exam/submit`, payload)).data
      setScore(Math.round(result.score)); setPassed(result.passed); setFeedback(result.feedback || []); setView('result')
      if (result.passed) toast.success('Congratulations! Qualification exam passed.'); else toast.error('Exam score below passing target (80%).')
      fetchData()
    } catch (error) { toast.error(error?.response?.data?.detail || 'Failed to submit exam') }
    finally { setSubmitting(false) }
  }

  const spinner = () => (
    <div className="flex items-center justify-center py-20">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
        <Sparkles className="h-4 w-4 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {view === 'list' && (
        <div className="border-b border-slate-800/80 pb-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <Award className="h-3.5 w-3.5" /> SOP Qualifications
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Assessments & Exams</h1>
          <p className="mt-1 text-xs text-slate-400">
            Study assigned Standard Operating Procedures and complete effectiveness evaluations to maintain compliance.
          </p>
        </div>
      )}

      {view === 'list' && (
        <div>
          {loading && assignments.length === 0 ? spinner() : assignments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-[#161C2C]/50 p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">No active assigned SOPs</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Your training queue is clear. New assignments will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assn, idx) => {
                const doc = getDocDetails(assn.document_id)
                const isCompleted = assn.document_status === 'completed' || assn.status === 'completed'
                return (
                  <div key={`assn-${assn.id || idx}-${assn.document_id || idx}`} className="rounded-3xl border border-slate-800 bg-[#161C2C] p-5 shadow-md flex flex-col justify-between hover:border-emerald-500/40 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          {doc.code || assn.document_code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isCompleted ? 'Qualified' : 'Pending'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-2 mb-2">{doc.title || assn.document_title}</h3>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-3 gap-2">
                      <button
                        onClick={() => navigate(`/trainee/learn/${assn.document_id}`)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-md"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Start Adaptive Learning
                      </button>
                      <button
                        onClick={() => fetchMindMap(assn.document_id)}
                        className="px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs"
                        title="View Document Mind Map"
                      >
                        <Map className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {view === 'study' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <button
                onClick={() => setView('list')}
                className="text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back to SOP list
              </button>
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Study Mode: {getDocDetails(activeAssignment.document_id).code}</h2>
                  <p className="text-xs text-slate-400">{getDocDetails(activeAssignment.document_id).title}</p>
                </div>
                <button
                  onClick={() => fetchMindMap(activeAssignment.document_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-300 hover:text-white transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs"
                >
                  <Map className="h-3.5 w-3.5" /> Mind Map
                </button>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
              Chunk {activeChunkIdx + 1} of {chunks.length}
            </span>
          </div>

          {loadingChunks ? spinner() : chunks.length === 0 ? (
            <div className="text-center text-slate-500 py-12 text-sm">No content available for this document.</div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-[#161C2C] border border-slate-800 shadow-md leading-relaxed text-xs text-slate-200">
                {chunks[activeChunkIdx].content}
              </div>

              {chunks[activeChunkIdx].learning_card && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="h-4 w-4" /> Key Learning Takeaway
                  </div>
                  <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                    {chunks[activeChunkIdx].learning_card}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  disabled={activeChunkIdx === 0}
                  onClick={() => setActiveChunkIdx(prev => prev - 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition-[color,background-color,border-color,box-shadow,transform,opacity]"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous Section
                </button>

                {activeChunkIdx < chunks.length - 1 ? (
                  <button
                    onClick={() => setActiveChunkIdx(prev => prev + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-sm"
                  >
                    Next Section <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={startExam}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-lg shadow-indigo-600/20"
                  >
                    Take Qualification Exam <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'exam' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <button
              onClick={() => setView('study')}
              className="text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Study Mode
            </button>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Effectiveness Exam</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Passing Score: 80%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Answer all evaluation questions based on the SOP rules.</p>
          </div>

          {loadingMcqs ? spinner() : mcqs.length === 0 ? (
            <div className="text-center text-slate-500 py-12 text-sm">No exam questions available for this document.</div>
          ) : (
            <div className="space-y-6">
              {mcqs.map((q, idx) => (
                <div key={q.id} className="p-5 rounded-3xl border border-slate-800 bg-[#161C2C] shadow-md space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5">{q.question}</span>
                  </h3>
                  <div className="grid gap-2 pt-1">
                    {Object.entries(q.options).map(([key, val]) => {
                      const isSelected = answers[q.id] === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectOption(q.id, key)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-xs text-left transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                            isSelected
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-white font-semibold shadow-xs'
                              : 'border-slate-800 bg-[#0F1420] text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {key}
                          </span>
                          <span className="flex-1">{val}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Evaluating Answers...' : 'Submit Assessment'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'result' && (
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="rounded-3xl border border-slate-800 bg-[#161C2C] p-8 text-center shadow-md space-y-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto border-4 ${
              passed ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-rose-500 bg-rose-500/10 text-rose-400'
            }`}>
              {score}%
            </div>
            <div>
              <h2 className={`text-xl font-bold ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {passed ? 'Qualification Cleared!' : 'Score Target Not Met'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {passed
                  ? 'Great job! You passed the SOP qualification standard of 80%.'
                  : 'You scored below the mandatory 80% requirement. Please review key takeaways and try again.'}
              </p>
            </div>
          </div>

          {feedback.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">Question Diagnostics</h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {feedback.map((item, idx) => {
                  const q = mcqs.find(mcq => mcq.id === item.mcq_id)
                  if (!q) return null
                  return (
                    <div key={item.mcq_id} className={`rounded-2xl border p-4 space-y-2 bg-[#161C2C] shadow-xs ${item.is_correct ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-semibold text-white">{idx + 1}. {q.question}</p>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${item.is_correct ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {item.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 text-slate-400">
                        <p>Selected: <strong className="font-mono text-white">{answers[q.id]}</strong></p>
                        {!item.is_correct && <p>Correct Answer: <strong className="font-mono text-emerald-400">{item.correct_option}</strong></p>}
                      </div>
                      {item.explanation && (
                        <div className="text-[11px] text-slate-300 bg-[#0F1420] p-3 rounded-xl border border-slate-800 mt-2">
                          <span className="font-semibold text-emerald-300">Explanation: </span>{item.explanation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t border-slate-800">
            {passed ? (
              <button
                onClick={() => setView('list')}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-md"
              >
                Back to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => setView('list')}
                  className="px-5 py-2.5 rounded-2xl border border-slate-700 bg-[#161C2C] text-slate-200 hover:text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity]"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView('study')}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-md"
                >
                  Restudy Material
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mind Map Modal */}
      <MindMapModal
        open={mindMapOpen && !mindMapLoading && !!mindMapData?.nodes?.length}
        onClose={() => setMindMapOpen(false)}
        docCode={activeAssignment ? getDocDetails(activeAssignment.document_id).code : ''}
        docTitle={mindMapOpen && mindMapData ? mindMapData.document_title : ''}
        nodes={mindMapOpen && mindMapData ? mindMapData.nodes : []}
        onNodeClick={handleMindMapNodeClick}
        hintText="to jump to that content"
      />

      {/* Loading Modal Overlay */}
      {mindMapOpen && mindMapLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg">
          <div className="flex flex-col items-center gap-4 bg-[#0B0F17] border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full" />
            <p className="text-sm text-slate-300 font-medium">Building document mind map tree...</p>
          </div>
        </div>
      )}
    </div>
  )
}
