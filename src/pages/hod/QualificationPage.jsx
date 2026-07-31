import { useEffect, useState } from 'react'
import apiClient, { get, post } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle, PlusCircle, Paperclip } from 'lucide-react'
import { toast } from 'sonner'

const initialRequestForm = {
  user_id: '',
  document_id: '',
  reason: '',
  notes: '',
}

export default function QualificationPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState(initialRequestForm)
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [reviewingAssignment, setReviewingAssignment] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewEvidence, setReviewEvidence] = useState([])
  const [reviewEvidenceFile, setReviewEvidenceFile] = useState(null)
  const [reviewEvidenceLabel, setReviewEvidenceLabel] = useState('')
  const [loadingEvidence, setLoadingEvidence] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  const loadData = async () => {
    try {
      const user = await get('/users/me')
      setCurrentUser(user)
      const deptName = user.department || 'Production'
      const [assList, userList, docList] = await Promise.all([
        get(`/training/assignments?department=${encodeURIComponent(deptName)}`),
        get(`/users?department=${encodeURIComponent(deptName)}&role=trainee`),
        get('/documents'),
      ])
      setAssignments(assList)
      setUsers(userList)
      setDocuments(docList)
    } catch (err) {
      console.error('Failed to load qualification assignments:', err)
      toast.error('Failed to load qualification approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleReview = async (assignmentId, approved) => {
    setSubmittingId(assignmentId)
    try {
      await post(`/training/assignments/${assignmentId}/review`, {
        approved,
        notes: reviewNotes.trim() || null,
      })
      toast.success(approved ? 'Training request successfully approved and assigned' : 'Training request rejected')
      setReviewingAssignment(null)
      setReviewNotes('')
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.detail || 'Failed to review assignment')
    } finally {
      setSubmittingId(null)
    }
  }

  const loadEvidence = async (assignmentId) => {
    setLoadingEvidence(true)
    try {
      const data = await get(`/training/assignments/${assignmentId}/evidence`)
      setReviewEvidence(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load evidence')
      setReviewEvidence([])
    } finally {
      setLoadingEvidence(false)
    }
  }

  const openReviewModal = async (assignment) => {
    setReviewingAssignment(assignment)
    setReviewNotes(assignment.approval_notes || '')
    setReviewEvidence([])
    setReviewEvidenceFile(null)
    setReviewEvidenceLabel('')
    await loadEvidence(assignment.id)
  }

  const uploadEvidence = async (e) => {
    e.preventDefault()
    if (!reviewingAssignment || !reviewEvidenceFile) {
      toast.error('Choose a file to upload')
      return
    }

    const formData = new FormData()
    formData.append('file', reviewEvidenceFile)
    if (reviewEvidenceLabel.trim()) formData.append('label', reviewEvidenceLabel.trim())

    setUploadingEvidence(true)
    try {
      await apiClient.post(`/training/assignments/${reviewingAssignment.id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Evidence uploaded')
      setReviewEvidenceFile(null)
      setReviewEvidenceLabel('')
      await loadEvidence(reviewingAssignment.id)
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.detail || 'Failed to upload evidence')
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleCreateRequest = async (e) => {
    e.preventDefault()
    if (!requestForm.user_id || !requestForm.document_id || !requestForm.reason.trim()) {
      toast.error('Employee, document, and reason are required')
      return
    }
    setCreatingRequest(true)
    try {
      await post('/training/need-based/request', {
        user_id: Number(requestForm.user_id),
        document_id: Number(requestForm.document_id),
        reason: requestForm.reason.trim(),
        notes: requestForm.notes || null,
      })
      toast.success('Need-based training request created')
      setShowRequestModal(false)
      setRequestForm(initialRequestForm)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.detail || 'Failed to create need-based request')
    } finally {
      setCreatingRequest(false)
    }
  }

  const getUserName = (userId) => {
    const u = users.find(x => x.id === userId)
    return u ? u.full_name : `User #${userId}`
  }

  const getDocCodeTitle = (docId) => {
    const d = documents.find(x => x.id === docId)
    return d ? `${d.code}: ${d.title}` : `Document #${docId}`
  }

  const deptTrainees = users.filter(u => u.role === 'trainee' && u.department === currentUser?.department)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-white">Qualification &amp; Training Approvals</CardTitle>
            <CardDescription className="text-slate-400">
              Review and approve need-based training requests, and monitor qualification progress for {currentUser?.department || 'your department'}.
            </CardDescription>
          </div>
          <Button onClick={() => setShowRequestModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Raise Need-Based
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <AlertCircle className="h-10 w-10 stroke-[1]" />
              <p>No active training assignments or requests found for your department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableRoot>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="text-slate-300">Trainee</TableHeader>
                      <TableHeader className="text-slate-300">Document / SOP</TableHeader>
                      <TableHeader className="text-slate-300">Training Type</TableHeader>
                      <TableHeader className="text-slate-300">Status</TableHeader>
                      <TableHeader className="text-slate-300">Context</TableHeader>
                      <TableHeader className="text-slate-300 text-right">Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id} className="hover:bg-white/5 transition-colors">
                        <TableCell className="font-semibold text-white">{getUserName(a.user_id)}</TableCell>
                        <TableCell className="text-slate-200">{getDocCodeTitle(a.document_id)}</TableCell>
                        <TableCell className="text-slate-400 uppercase text-xs tracking-wider">
                          {a.training_type?.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {a.status === 'pending_approval' ? (
                            <Badge variant="warning"><Clock className="mr-1 h-3 w-3 inline" /> Pending Approval</Badge>
                          ) : a.status === 'rejected' ? (
                            <Badge variant="danger"><AlertCircle className="mr-1 h-3 w-3 inline" /> Rejected</Badge>
                          ) : a.status === 'completed' ? (
                            <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3 inline" /> Qualified</Badge>
                          ) : a.status === 'pending_verification' ? (
                            <Badge variant="warning"><Clock className="mr-1 h-3 w-3 inline" /> Pending Trainer sign-off</Badge>
                          ) : (
                            <Badge variant="default">{a.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 max-w-[240px]">
                          <p className="truncate">{a.requested_reason || a.notes || a.external_provider || '—'}</p>
                          {a.approval_notes && (
                            <p className="truncate mt-1 text-slate-500">Review: {a.approval_notes}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {a.status === 'pending_approval' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                openReviewModal(a)
                              }}
                              disabled={submittingId === a.id}
                              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold cursor-pointer"
                            >
                              Review Request
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRequestModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-5">Raise Need-Based Training</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Employee *</label>
                <select value={requestForm.user_id} onChange={e => setRequestForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40">
                  <option value="">Select employee…</option>
                  {deptTrainees.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Document *</label>
                <select value={requestForm.document_id} onChange={e => setRequestForm(f => ({ ...f, document_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40">
                  <option value="">Select document…</option>
                  {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.code} — {doc.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Reason *</label>
                <textarea value={requestForm.reason} onChange={e => setRequestForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full min-h-24 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  placeholder="Why is this training required?" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Notes</label>
                <textarea value={requestForm.notes} onChange={e => setRequestForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full min-h-20 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  placeholder="Optional operational notes" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={creatingRequest}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all disabled:opacity-50 shadow-xs">
                  {creatingRequest ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setReviewingAssignment(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">Review Training Request</h2>
            <p className="text-sm text-slate-400 mb-5">
              {getUserName(reviewingAssignment.user_id)} · {getDocCodeTitle(reviewingAssignment.document_id)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Request Reason</label>
                <div className="rounded-xl border border-white/10 bg-slate-800 px-3 py-3 text-sm text-slate-200">
                  {reviewingAssignment.requested_reason || '—'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full min-h-24 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  placeholder="Add approval or rejection notes"
                />
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#161C2C] p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-indigo-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Evidence</p>
                </div>

                <form onSubmit={uploadEvidence} className="space-y-3">
                  <input
                    value={reviewEvidenceLabel}
                    onChange={e => setReviewEvidenceLabel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Certificate, approval attachment, supporting file"
                  />
                  <input
                    type="file"
                    onChange={e => setReviewEvidenceFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-500/10 file:text-indigo-300 hover:file:bg-indigo-500/20 cursor-pointer"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={uploadingEvidence}>
                      {uploadingEvidence ? 'Uploading…' : 'Upload Evidence'}
                    </Button>
                  </div>
                </form>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {loadingEvidence ? (
                    <p className="text-sm text-slate-500">Loading evidence…</p>
                  ) : reviewEvidence.length === 0 ? (
                    <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
                  ) : (
                    reviewEvidence.map(item => (
                      <div key={item.id} className="rounded-xl bg-slate-800 px-3 py-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white font-medium">{item.label || item.file_name}</p>
                          <p className="text-xs text-slate-400">{item.file_name}</p>
                        </div>
                        <a
                          href={`${apiClient.defaults.baseURL}${item.download_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-cyan-300 hover:text-cyan-200"
                        >
                          Open
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingAssignment(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(reviewingAssignment.id, false)}
                  disabled={submittingId === reviewingAssignment.id}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                >
                  {submittingId === reviewingAssignment.id ? 'Saving…' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(reviewingAssignment.id, true)}
                  disabled={submittingId === reviewingAssignment.id}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all disabled:opacity-50"
                >
                  {submittingId === reviewingAssignment.id ? 'Saving…' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
