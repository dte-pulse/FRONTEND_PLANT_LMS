import { useEffect, useState, useMemo } from 'react'
import { get, post } from '@/api/client'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Building2, BookOpen, Tag, Plus, Pencil, Trash2,
  RefreshCw, Search, ChevronDown, AlertCircle, X, Check
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────── */
/* Small inline modal component                                */
/* ─────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const INPUT_CLS = "w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 placeholder:text-slate-500"
const LABEL_CLS = "block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider"

/* ─────────────────────────────────────────────────────────── */
/*  Departments tab                                            */
/* ─────────────────────────────────────────────────────────── */
function DepartmentsTab() {
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', head_name: '' })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const fetchDepts = async () => {
    setLoading(true)
    try { setDepts(await get('/departments')) } catch { toast.error('Failed to load departments') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchDepts() }, [])

  const filtered = useMemo(() =>
    depts.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.code || '').toLowerCase().includes(search.toLowerCase()))
  , [depts, search])

  const openCreate = () => { setForm({ name: '', code: '', description: '', head_name: '' }); setEditing(null); setModal('create') }
  const openEdit = (d) => { setForm({ name: d.name, code: d.code || '', description: d.description || '', head_name: d.head_name || '' }); setEditing(d); setModal('edit') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Department name is required'); return }

    // Duplicate check
    const dup = depts.find(d =>
      d.name.toLowerCase() === form.name.trim().toLowerCase() && d.id !== editing?.id
    )
    if (dup) { toast.error(`A department named "${form.name}" already exists`); return }

    setSubmitting(true)
    try {
      if (editing) {
        await apiClient.patch(`/departments/${editing.id}`, form)
        toast.success('Department updated')
      } else {
        await apiClient.post('/departments', form)
        toast.success('Department created')
      }
      setModal(null)
      fetchDepts()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (d) => {
    if (!confirm(`Delete department "${d.name}"? This cannot be undone.`)) return
    try {
      await apiClient.delete(`/departments/${d.id}`)
      toast.success('Department deleted')
      fetchDepts()
    } catch (err) { toast.error(err?.response?.data?.detail || 'Delete failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Department</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>{['Name', 'Code', 'Head', 'Description', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No departments found</td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{d.code || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{d.head_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{d.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Department' : 'New Department'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className={LABEL_CLS}>Name *</label><input className={INPUT_CLS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Quality Assurance" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LABEL_CLS}>Code</label><input className={INPUT_CLS} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="QA" /></div>
              <div><label className={LABEL_CLS}>Head</label><input className={INPUT_CLS} value={form.head_name} onChange={e => setForm(f => ({ ...f, head_name: e.target.value }))} placeholder="Name of HOD" /></div>
            </div>
            <div><label className={LABEL_CLS}>Description</label><textarea className={INPUT_CLS + ' min-h-[72px] resize-none'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description…" /></div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  Subjects tab                                               */
/* ─────────────────────────────────────────────────────────── */
function SubjectsTab() {
  const [subjects, setSubjects] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', department: '' })
  const [submitting, setSubmitting] = useState(false)
  const [filterDept, setFilterDept] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [subs, deps] = await Promise.all([get('/subjects'), get('/departments')])
      setSubjects(subs)
      setDepts(deps)
    } catch { toast.error('Failed to load subjects') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [])

  const filtered = useMemo(() =>
    subjects.filter(s => !filterDept || s.department === filterDept)
  , [subjects, filterDept])

  const openCreate = () => { setForm({ name: '', department: '' }); setEditing(null); setModal('create') }
  const openEdit = (s) => { setForm({ name: s.name, department: s.department || '' }); setEditing(s); setModal('edit') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Subject name is required'); return }
    const dup = subjects.find(s => s.name.toLowerCase() === form.name.trim().toLowerCase() && s.id !== editing?.id)
    if (dup) { toast.error(`Subject "${form.name}" already exists`); return }

    setSubmitting(true)
    try {
      if (editing) {
        await apiClient.put(`/subjects/${editing.id}`, form)
        toast.success('Subject updated')
      } else {
        await apiClient.post('/subjects', form)
        toast.success('Subject created')
      }
      setModal(null)
      fetchAll()
    } catch (err) { toast.error(err?.response?.data?.detail || 'Save failed') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (s) => {
    if (!confirm(`Delete subject "${s.name}"?`)) return
    try { await apiClient.delete(`/subjects/${s.id}`); toast.success('Deleted'); fetchAll() }
    catch (err) { toast.error(err?.response?.data?.detail || 'Delete failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none min-w-[160px]">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Subject</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>{['Subject Name', 'Department', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-500">No subjects found</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {s.department ? (
                      <span className="px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-300">{s.department}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Subject' : 'New Subject'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className={LABEL_CLS}>Subject Name *</label><input className={INPUT_CLS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. GMP Fundamentals" /></div>
            <div>
              <label className={LABEL_CLS}>Department</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className={INPUT_CLS + ' appearance-none pr-8'}>
                  <option value="">— Not assigned —</option>
                  {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  Topics tab                                                 */
/* ─────────────────────────────────────────────────────────── */
function TopicsTab() {
  const [topics, setTopics] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', subject_id: '', sequence_order: 1 })
  const [submitting, setSubmitting] = useState(false)
  const [filterSubject, setFilterSubject] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [tops, subs] = await Promise.all([get('/topics'), get('/subjects')])
      setTopics(tops)
      setSubjects(subs)
    } catch { toast.error('Failed to load topics') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [])

  const filtered = useMemo(() =>
    topics
      .filter(t => !filterSubject || t.subject_id === Number(filterSubject))
      .sort((a, b) => a.sequence_order - b.sequence_order)
  , [topics, filterSubject])

  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || '—'

  const openCreate = () => { setForm({ title: '', subject_id: subjects[0]?.id || '', sequence_order: 1 }); setEditing(null); setModal('create') }
  const openEdit = (t) => { setForm({ title: t.title, subject_id: t.subject_id, sequence_order: t.sequence_order }); setEditing(t); setModal('edit') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Topic title is required'); return }
    if (!form.subject_id) { toast.error('Subject is required'); return }
    const dup = topics.find(t =>
      t.title.toLowerCase() === form.title.trim().toLowerCase() &&
      t.subject_id === Number(form.subject_id) &&
      t.id !== editing?.id
    )
    if (dup) { toast.error(`Topic "${form.title}" already exists in this subject`); return }

    setSubmitting(true)
    try {
      const payload = { title: form.title.trim(), subject_id: Number(form.subject_id), sequence_order: Number(form.sequence_order) || 1 }
      if (editing) {
        await apiClient.put(`/topics/${editing.id}`, payload)
        toast.success('Topic updated')
      } else {
        await apiClient.post('/topics', payload)
        toast.success('Topic created')
      }
      setModal(null)
      fetchAll()
    } catch (err) { toast.error(err?.response?.data?.detail || 'Save failed') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (t) => {
    if (!confirm(`Delete topic "${t.title}"? Documents linked to this topic may be affected.`)) return
    try { await apiClient.delete(`/topics/${t.id}`); toast.success('Deleted'); fetchAll() }
    catch (err) { toast.error(err?.response?.data?.detail || 'Delete failed') }
  }

  const handleReorder = async (topic, direction) => {
    const newOrder = topic.sequence_order + direction
    if (newOrder < 1) return
    try {
      await apiClient.put(`/topics/${topic.id}`, { subject_id: topic.subject_id, title: topic.title, sequence_order: newOrder })
      fetchAll()
    } catch { toast.error('Reorder failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none min-w-[200px]">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Topic</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>{['#', 'Topic Title', 'Subject', 'Order', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No topics found</td></tr>
              ) : filtered.map((t, idx) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">{t.title}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300">{getSubjectName(t.subject_id)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono w-5 text-center">{t.sequence_order}</span>
                      <button onClick={() => handleReorder(t, -1)} className="text-slate-500 hover:text-slate-200 transition-colors text-xs px-1">▲</button>
                      <button onClick={() => handleReorder(t, 1)} className="text-slate-500 hover:text-slate-200 transition-colors text-xs px-1">▼</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Topic' : 'New Topic'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className={LABEL_CLS}>Title *</label><input className={INPUT_CLS} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. GMP Principles" /></div>
            <div>
              <label className={LABEL_CLS}>Subject *</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                  className={INPUT_CLS + ' appearance-none pr-8'}>
                  <option value="">— Select subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className={LABEL_CLS}>Sequence Order</label><input type="number" min="1" className={INPUT_CLS} value={form.sequence_order} onChange={e => setForm(f => ({ ...f, sequence_order: e.target.value }))} /></div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  Main page                                                  */
/* ─────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'subjects',    label: 'Subjects',    icon: BookOpen },
  { key: 'topics',      label: 'Topics',      icon: Tag },
]

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('departments')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Master Data</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage departments, subjects, and topics — the foundational taxonomy used across training, documents, and reporting.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
              activeTab === key
                ? 'text-cyan-400 border-b-2 border-cyan-400 -mb-px'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-5">
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'subjects'    && <SubjectsTab />}
        {activeTab === 'topics'      && <TopicsTab />}
      </div>
    </div>
  )
}
