import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { BrainCircuit, Edit2, Trash2, CheckCircle2, AlertCircle, Plus, Sparkles, BookOpen, Trash } from 'lucide-react'

export default function AssessmentsPage() {
  const [documents, setDocuments] = useState([])
  const [selectedDocId, setSelectedDocId] = useState('')
  const [mcqs, setMcqs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [loadingMcqs, setLoadingMcqs] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // Generation Options
  const [generateCount, setGenerateCount] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')

  // Edit Modal State
  const [editingMcq, setEditingMcq] = useState(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editOptionA, setEditOptionA] = useState('')
  const [editOptionB, setEditOptionB] = useState('')
  const [editOptionC, setEditOptionC] = useState('')
  const [editOptionD, setEditOptionD] = useState('')
  const [editCorrectOption, setEditCorrectOption] = useState('A')
  const [editExplanation, setEditExplanation] = useState('')
  const [editDifficulty, setEditDifficulty] = useState('medium')
  const [saving, setSaving] = useState(false)

  const fetchDocuments = async () => {
    setLoadingDocs(true)
    try {
      const response = await apiClient.get('/documents')
      // Only show completed/processed documents that actually have chunks
      const completedDocs = response.data.filter(d => d.status === 'completed' || d.status === 'ready')
      setDocuments(completedDocs)
      if (completedDocs.length > 0) {
        setSelectedDocId(completedDocs[0].id.toString())
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load completed documents')
    } finally {
      setLoadingDocs(false)
    }
  }

  const fetchMcqs = async (docId) => {
    if (!docId) return
    setLoadingMcqs(true)
    try {
      const response = await apiClient.get(`/mcq/document/${docId}`)
      setMcqs(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load MCQs')
    } finally {
      setLoadingMcqs(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    if (selectedDocId) {
      fetchMcqs(selectedDocId)
    } else {
      setMcqs([])
    }
  }, [selectedDocId])

  const handleGenerate = async () => {
    if (!selectedDocId) {
      toast.error('Please select a document first')
      return
    }

    setGenerating(true)
    try {
      toast.info('Triggering AI MCQ generator...')
      const response = await apiClient.post('/mcq/generate', {
        document_id: parseInt(selectedDocId),
        count: generateCount,
        difficulty: difficulty
      })
      toast.success(`Successfully generated ${response.data.length} MCQ questions!`)
      fetchMcqs(selectedDocId)
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.detail || 'Failed to generate MCQs'
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleOpenEdit = (mcq) => {
    setEditingMcq(mcq)
    setEditQuestion(mcq.question)
    setEditOptionA(mcq.options.A || '')
    setEditOptionB(mcq.options.B || '')
    setEditOptionC(mcq.options.C || '')
    setEditOptionD(mcq.options.D || '')
    setEditCorrectOption(mcq.correct_option)
    setEditExplanation(mcq.explanation || '')
    setEditDifficulty(mcq.difficulty)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editQuestion || !editOptionA || !editOptionB || !editOptionC || !editOptionD) {
      toast.error('Question and all 4 options are required')
      return
    }

    setSaving(true)
    try {
      await apiClient.put(`/mcq/${editingMcq.id}`, {
        question: editQuestion,
        options: {
          A: editOptionA,
          B: editOptionB,
          C: editOptionC,
          D: editOptionD
        },
        correct_option: editCorrectOption,
        explanation: editExplanation || null,
        difficulty: editDifficulty
      })
      toast.success('Question updated successfully')
      setEditingMcq(null)
      fetchMcqs(selectedDocId)
    } catch (error) {
      console.error(error)
      toast.error('Failed to update MCQ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    try {
      await apiClient.delete(`/mcq/${id}`)
      toast.success('Question deleted')
      fetchMcqs(selectedDocId)
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete question')
    }
  }

  const selectedDoc = documents.find(d => d.id.toString() === selectedDocId)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        {/* Left Column: Selector & AI Generator */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-emerald-400" />
              AI MCQ Engine
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select an ingested SOP to build AI-guided verification questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Select SOP *</label>
              {loadingDocs ? (
                <div className="h-10 w-full rounded-2xl bg-white/5 animate-pulse" />
              ) : documents.length === 0 ? (
                <div className="text-sm text-amber-300 bg-amber-400/10 p-4 rounded-2xl border border-amber-400/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  No completed SOP documents found. Please ingest one first.
                </div>
              ) : (
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                >
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id} className="bg-slate-900">
                      {doc.code} - {doc.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedDoc && (
              <div className="border border-white/10 bg-white/5 p-4 rounded-2xl space-y-2 text-sm text-slate-300">
                <p className="flex justify-between"><span className="text-slate-400">Topic:</span> <span className="font-semibold text-white">{selectedDoc.topic}</span></p>
                <p className="flex justify-between"><span className="text-slate-400">Version:</span> <span className="font-mono">{selectedDoc.version}</span></p>
                <p className="flex justify-between"><span className="text-slate-400">Scope:</span> <span className="font-mono text-emerald-300">{selectedDoc.qa_scope}</span></p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Generator Options
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Count</label>
                  <Input 
                    type="number"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="easy" className="bg-slate-900">Easy</option>
                    <option value="medium" className="bg-slate-900">Medium</option>
                    <option value="hard" className="bg-slate-900">Hard</option>
                  </select>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={generating || !selectedDocId}
                className="w-full cursor-pointer mt-2"
              >
                {generating ? 'Generating MCQs...' : 'Generate with AI'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Question Queue & Verification */}
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center justify-between">
              <span>MCQ Question Bank</span>
              <Badge variant="cyan">{mcqs.length} Questions</Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Verify, edit, or delete generated MCQs. These questions form the assessment for trainee qualifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
                <p className="text-xs text-slate-400">Generating assessment questions...</p>
              </div>
            ) : loadingMcqs ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
              </div>
            ) : mcqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-20">
                <BookOpen className="h-16 w-16 mb-4 stroke-[1]" />
                <p>No questions generated for this document yet.</p>
                <p className="text-sm text-slate-600 mt-1">Use the generator on the left to create some.</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {mcqs.map((mcq, idx) => (
                  <div key={mcq.id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 px-3 py-1 rounded-full font-semibold">
                        Question {idx + 1}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-slate-400 hover:text-white"
                          onClick={() => handleOpenEdit(mcq)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => handleDelete(mcq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-base text-white font-medium">{mcq.question}</p>

                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(mcq.options).map(([key, val]) => (
                        <div 
                          key={key} 
                          className={`flex items-center gap-3 p-3 rounded-2xl border text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ${
                            mcq.correct_option === key 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                              : 'bg-white/5 border-white/5 text-slate-300'
                          }`}
                        >
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            mcq.correct_option === key 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-white/10 text-slate-300'
                          }`}>
                            {key}
                          </span>
                          <span className="truncate">{val}</span>
                        </div>
                      ))}
                    </div>

                    {mcq.explanation && (
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-300 block mb-1">Explanation:</strong>
                        {mcq.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit MCQ Modal */}
      {editingMcq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300">
                <Edit2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit MCQ Question</h3>
                <p className="text-sm text-slate-400">Fine-tune the question text, options, and correctness.</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">Question Text *</label>
                <textarea 
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  className="w-full h-20 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm outline-none focus:border-cyan-300/40 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Option A *</label>
                  <Input 
                    value={editOptionA}
                    onChange={(e) => setEditOptionA(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Option B *</label>
                  <Input 
                    value={editOptionB}
                    onChange={(e) => setEditOptionB(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Option C *</label>
                  <Input 
                    value={editOptionC}
                    onChange={(e) => setEditOptionC(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Option D *</label>
                  <Input 
                    value={editOptionD}
                    onChange={(e) => setEditOptionD(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Correct Option</label>
                  <select 
                    value={editCorrectOption}
                    onChange={(e) => setEditCorrectOption(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40 font-mono"
                  >
                    <option value="A" className="bg-slate-900">Option A</option>
                    <option value="B" className="bg-slate-900">Option B</option>
                    <option value="C" className="bg-slate-900">Option C</option>
                    <option value="D" className="bg-slate-900">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Difficulty</label>
                  <select 
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="easy" className="bg-slate-900">Easy</option>
                    <option value="medium" className="bg-slate-900">Medium</option>
                    <option value="hard" className="bg-slate-900">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Explanation</label>
                <textarea 
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full h-16 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white text-sm outline-none focus:border-cyan-300/40 resize-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingMcq(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="cursor-pointer"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save MCQ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
