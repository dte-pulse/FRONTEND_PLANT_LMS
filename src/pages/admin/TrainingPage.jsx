import { useEffect, useState } from 'react'
import apiClient, { get, post } from '@/api/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  UserPlus, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Shield, Layers, Send, Paperclip
} from 'lucide-react'

const TRAINING_TYPES = [
  { value: 'induction', label: 'Induction' },
  { value: 'ojt', label: 'OJT (On-the-Job)' },
  { value: 'sop', label: 'SOP Training' },
  { value: 'cgmp', label: 'cGMP Refresher' },
  { value: 'external', label: 'External Training' },
  { value: 'need_based', label: 'Need-Based' },
  { value: 'contractual', label: 'Contractual/Casual' },
]

const STATUS_COLORS = {
  assigned: 'bg-blue-400/10 text-blue-400',
  completed: 'bg-emerald-400/10 text-emerald-400',
  pending_verification: 'bg-amber-400/10 text-amber-400',
  pending_approval: 'bg-violet-400/10 text-violet-400',
}

const initialForm = {
  user_ids: [],
  document_id: '',
  training_type: 'sop',
  due_date: '',
  trainer_id: '',
  notes: '',
  reason: '',
  certificate_url: '',
  certificate_file: null,
  provider: '',
  venue: '',
  duration_hours: '',
}

export default function TrainingPage() {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [evidenceAssignment, setEvidenceAssignment] = useState(null)
  const [evidenceItems, setEvidenceItems] = useState([])
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [evidenceLabel, setEvidenceLabel] = useState('')
  const [loadingEvidence, setLoadingEvidence] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [a, u, d] = await Promise.all([
        get('/training/assignments'),
        get('/users'),
        get('/documents'),
      ])
      setAssignments(a)
      setUsers(u)
      setDocuments(d)
    } catch {
      toast.error('Failed to load training data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.training_type === filter)
  const trainers = users.filter(u => u.role === 'trainer')
  const trainees = users.filter(u => u.role === 'trainee')

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    pending: assignments.filter(a => a.status === 'assigned').length,
    pending_verification: assignments.filter(a => a.status === 'pending_verification').length,
  }

  const getUserName = (id) => users.find(u => u.id === id)?.full_name || `User #${id}`
  const getDocCode = (id) => documents.find(d => d.id === id)?.code || `Doc #${id}`
  const getDocTitle = (id) => documents.find(d => d.id === id)?.title || ''

  const isExternal = form.training_type === 'external'
  const isNeedBased = form.training_type === 'need_based'
  const isOjt = form.training_type === 'ojt'

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!form.user_ids.length || !form.document_id || !form.training_type) {
      toast.error('Please fill all required fields')
      return
    }
    if ((isExternal || isNeedBased) && form.user_ids.length !== 1) {
      toast.error('Select exactly one employee for this workflow')
      return
    }
    if (isOjt && !form.trainer_id) {
      toast.error('Select a trainer for OJT')
      return
    }
    if (isExternal && !form.certificate_file) {
      toast.error('Certificate file upload is required for external training')
      return
    }
    if (isNeedBased && !form.reason.trim()) {
      toast.error('Reason is required for need-based training')
      return
    }

    setSubmitting(true)
    try {
      if (isExternal) {
        const logRes = await apiClient.post('/training/external/log', {
          user_id: Number(form.user_ids[0]),
          document_id: Number(form.document_id),
          certificate_url: '',
          notes: form.notes || null,
          provider: form.provider || null,
          venue: form.venue || null,
          duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
        })
        
        if (form.certificate_file) {
          const formData = new FormData()
          formData.append('file', form.certificate_file)
          formData.append('label', 'External Training Certificate')
          await apiClient.post(`/training/assignments/${logRes.data.id}/evidence`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      } else if (isNeedBased) {
        await post('/training/need-based/request', {
          user_id: Number(form.user_ids[0]),
          document_id: Number(form.document_id),
          reason: form.reason.trim(),
          notes: form.notes || null,
        })
      } else {
        await post('/training/assign/bulk', {
          user_ids: form.user_ids.map(Number),
          document_id: Number(form.document_id),
          training_type: form.training_type,
          trainer_id: form.trainer_id ? Number(form.trainer_id) : null,
          due_date: form.due_date || null,
          notes: form.notes || null,
        })
      }

      toast.success('Training workflow submitted successfully')
      setShowModal(false)
      setForm(initialForm)
      fetchData()
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Assignment failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleUser = (uid) => {
    setForm(f => ({
      ...f,
      user_ids: f.user_ids.includes(uid) ? f.user_ids.filter(id => id !== uid) : [...f.user_ids, uid],
    }))
  }

  const summaryText = (assignment) =>
    assignment.requested_reason ||
    assignment.notes ||
    assignment.external_provider ||
    assignment.external_venue ||
    ''

  const loadEvidence = async (assignmentId) => {
    setLoadingEvidence(true)
    try {
      const data = await get(`/training/assignments/${assignmentId}/evidence`)
      setEvidenceItems(data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load evidence')
      setEvidenceItems([])
    } finally {
      setLoadingEvidence(false)
    }
  }

  const openEvidenceModal = async (assignment) => {
    setEvidenceAssignment(assignment)
    setEvidenceFile(null)
    setEvidenceLabel('')
    await loadEvidence(assignment.id)
  }

  const uploadEvidence = async (e) => {
    e.preventDefault()
    if (!evidenceAssignment || !evidenceFile) {
      toast.error('Choose a file to upload')
      return
    }

    const formData = new FormData()
    formData.append('file', evidenceFile)
    if (evidenceLabel.trim()) formData.append('label', evidenceLabel.trim())

    setUploadingEvidence(true)
    try {
      await apiClient.post(`/training/assignments/${evidenceAssignment.id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Evidence uploaded')
      setEvidenceFile(null)
      setEvidenceLabel('')
      await loadEvidence(evidenceAssignment.id)
      await fetchData()
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.detail || 'Failed to upload evidence')
    } finally {
      setUploadingEvidence(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Operations</h1>
          <p className="text-slate-400 text-sm">Manage induction, OJT, SOP, cGMP, external, need-based, and contractual workflows.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-[color,background-color,border-color,box-shadow,transform,opacity]">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-xs">
            <UserPlus className="h-4 w-4" /> Start Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assignments', value: stats.total, icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Pending Verification', value: stats.pending_verification, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center gap-3">
            <div className={`${bg} p-3 rounded-xl`}><Icon className={`h-5 w-5 ${color}`} /></div>
            <div><p className="text-xs text-slate-400">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...TRAINING_TYPES.map(t => t.value)].map(type => (
          <button key={type} onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] capitalize ${
              filter === type ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
            }`}>
            {type === 'all' ? 'All Types' : TRAINING_TYPES.find(t => t.value === type)?.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr>
              {['Employee', 'Document', 'Type', 'Status', 'Workflow Notes', 'Due Date', 'Verified', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                <Shield className="h-10 w-10 mx-auto mb-2 stroke-[1]" />
                No training assignments found
              </td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{getUserName(a.user_id)}</p>
                  <p className="text-xs text-slate-400">ID: {a.user_id}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-cyan-300">{getDocCode(a.document_id)}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[180px]">{getDocTitle(a.document_id)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-400/10 text-violet-300 capitalize">
                    {a.training_type?.replace(/_/g, ' ')}
                  </span>
                  {summaryText(a) && (
                    <p className="text-xs text-slate-500 mt-1 max-w-[240px] truncate">{summaryText(a)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[a.status] || 'bg-slate-400/10 text-slate-400'}`}>
                    {a.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-[260px]">
                  {a.approval_notes && <p className="truncate">Review: {a.approval_notes}</p>}
                  {a.certificate_url && (
                    <a
                      href={a.certificate_url.startsWith('/') ? `${apiClient.defaults.baseURL}${a.certificate_url}` : a.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-cyan-300 hover:text-cyan-200 mt-1"
                    >
                      Evidence: certificate
                    </a>
                  )}
                  {!a.approval_notes && !a.certificate_url && <span>—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  {a.verified_by_trainer
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEvidenceModal(a)}>
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" /> Evidence
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-5">Start Training Workflow</h2>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Training Type *</label>
                <select value={form.training_type} onChange={e => setForm(f => ({ ...f, training_type: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40">
                  {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Document *</label>
                <select value={form.document_id} onChange={e => setForm(f => ({ ...f, document_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40">
                  <option value="">Select document…</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">
                  Employees * <span className="text-slate-500">({form.user_ids.length} selected)</span>
                </label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-slate-800 divide-y divide-white/5">
                  {trainees.map(u => (
                    <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer">
                      <input type="checkbox" checked={form.user_ids.includes(u.id)} onChange={() => toggleUser(u.id)}
                        className="accent-cyan-400" />
                      <span className="text-sm text-slate-300">{u.full_name}</span>
                      <span className="text-xs text-slate-500 ml-auto">{u.department || '—'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {isOjt && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Assigned Trainer *</label>
                  <select value={form.trainer_id} onChange={e => setForm(f => ({ ...f, trainer_id: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40">
                    <option value="">Select trainer…</option>
                    {trainers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
              )}

              {isNeedBased && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Need-Based Reason *</label>
                  <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full min-h-24 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                    placeholder="Why is this training needed?" />
                </div>
              )}

              {isExternal && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Upload Certificate *</label>
                    <input 
                      type="file" 
                      onChange={e => setForm(f => ({ ...f, certificate_file: e.target.files?.[0] || null }))}
                      className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-400/10 file:text-cyan-200 hover:file:bg-cyan-400/20 cursor-pointer"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Provider</label>
                      <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                        placeholder="Training agency" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Venue</label>
                      <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                        placeholder="Venue" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Duration (hours)</label>
                    <input type="number" min="1" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                      placeholder="8" />
                  </div>
                </>
              )}

              {!isExternal && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Due Date (optional)</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40 [color-scheme:dark]" />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full min-h-20 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  placeholder="Operational notes, prerequisites, or context" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                  {submitting ? <div className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {evidenceAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEvidenceAssignment(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Assignment Evidence</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {getUserName(evidenceAssignment.user_id)} · {getDocCode(evidenceAssignment.document_id)} — {getDocTitle(evidenceAssignment.document_id)}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setEvidenceAssignment(null)}>Close</Button>
            </div>

            <form onSubmit={uploadEvidence} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Label</label>
                <input
                  value={evidenceLabel}
                  onChange={e => setEvidenceLabel(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  placeholder="Certificate, approval note, supporting file"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">File</label>
                <input
                  type="file"
                  onChange={e => setEvidenceFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-400/10 file:text-cyan-200 hover:file:bg-cyan-400/20 cursor-pointer"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={uploadingEvidence}>
                  {uploadingEvidence ? 'Uploading…' : 'Upload Evidence'}
                </Button>
              </div>
            </form>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {loadingEvidence ? (
                <p className="text-sm text-slate-500">Loading evidence…</p>
              ) : evidenceItems.length === 0 ? (
                <p className="text-sm text-slate-500">No evidence uploaded for this assignment yet.</p>
              ) : (
                evidenceItems.map(item => (
                  <div key={item.id} className="rounded-xl bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
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
        </div>
      )}
    </div>
  )
}
