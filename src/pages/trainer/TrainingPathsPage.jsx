import { useState, useEffect } from 'react'
import { get, post, put, del } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Layers,
  Users,
  Clock,
  GripVertical,
  BookOpenText,
  ChevronLeft,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  X,
  Save,
  FileText,
  PlayCircle,
  BarChart3,
  Target,
  Filter,
  Grid3X3,
  List,
} from 'lucide-react'

const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const PATH_STATUSES = ['draft', 'active', 'archived']

const statusVariant = {
  draft: 'default',
  active: 'success',
  archived: 'danger',
}

const levelColor = {
  Beginner: 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20',
  Intermediate: 'bg-cyan-400/10 text-cyan-200 ring-cyan-300/20',
  Advanced: 'bg-purple-400/10 text-purple-300 ring-purple-300/20',
}

export default function TrainingPathsPage() {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedPath, setSelectedPath] = useState(null)

  // Form state
  const [form, setForm] = useState({ name: '', description: '', level: 'Beginner', duration_days: 30, status: 'draft' })
  const [saving, setSaving] = useState(false)

  // Modules
  const [modules, setModules] = useState([])
  const [showAddModule, setShowAddModule] = useState(false)
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', order_index: 0 })
  const [availableDocs, setAvailableDocs] = useState([])
  const [savingModule, setSavingModule] = useState(false)

  const loadPaths = async () => {
    try {
      const data = await get('/training/paths')
      setPaths(data)
    } catch (err) {
      console.error('Failed to load training paths:', err)
      toast.error('Failed to load training paths')
    } finally {
      setLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const data = await get('/documents')
      setAvailableDocs(data)
    } catch {
      // Silently fail — docs are optional context
    }
  }

  useEffect(() => { loadPaths(); loadDocuments() }, [])

  const filtered = paths.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // ── CRUD ────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Path name is required'); return }
    setSaving(true)
    try {
      const created = await post('/training/paths', form)
      setPaths(prev => [...prev, created])
      setShowCreateModal(false)
      setForm({ name: '', description: '', level: 'Beginner', duration_days: 30, status: 'draft' })
      toast.success('Training path created!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create path')
    } finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!form.name.trim()) { toast.error('Path name is required'); return }
    setSaving(true)
    try {
      const updated = await put(`/training/paths/${selectedPath.id}`, form)
      setPaths(prev => prev.map(p => p.id === updated.id ? updated : p))
      setSelectedPath(updated)
      setShowEditModal(false)
      toast.success('Path updated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update path')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this training path? This cannot be undone.')) return
    try {
      await del(`/training/paths/${id}`)
      setPaths(prev => prev.filter(p => p.id !== id))
      if (selectedPath?.id === id) { setShowDetailPanel(false); setSelectedPath(null) }
      toast.success('Path deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete path')
    }
  }

  const openDetail = async (path) => {
    setSelectedPath(path)
    setShowDetailPanel(true)
    try {
      const m = await get(`/training/paths/${path.id}/modules`)
      setModules(m)
    } catch {
      setModules([])
    }
  }

  // ── Module management ───────────────────
  const handleAddModule = async () => {
    if (!moduleForm.title.trim()) { toast.error('Module title is required'); return }
    setSavingModule(true)
    try {
      const created = await post(`/training/paths/${selectedPath.id}/modules`, {
        ...moduleForm,
        order_index: modules.length,
      })
      setModules(prev => [...prev, created])
      setShowAddModule(false)
      setModuleForm({ title: '', description: '', order_index: 0 })
      toast.success('Module added!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add module')
    } finally { setSavingModule(false) }
  }

  const reorderModule = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= modules.length) return
    const reordered = [...modules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setModules(reordered.map((m, i) => ({ ...m, order_index: i })))
    try {
      await put(`/training/paths/${selectedPath.id}/modules/reorder`, {
        module_ids: reordered.map(m => m.id),
      })
    } catch { /* optimistic update */ }
  }

  const deleteModule = async (moduleId) => {
    try {
      await del(`/training/paths/${selectedPath.id}/modules/${moduleId}`)
      setModules(prev => prev.filter(m => m.id !== moduleId))
      toast.success('Module removed')
    } catch (err) {
      toast.error('Failed to remove module')
    }
  }

  const assignDocument = async (moduleId, documentId) => {
    try {
      await post(`/training/paths/${selectedPath.id}/modules/${moduleId}/documents`, { document_id: documentId })
      setModules(prev => prev.map(m =>
        m.id === moduleId
          ? { ...m, documents: [...(m.documents || []), { id: documentId, title: availableDocs.find(d => d.id === documentId)?.title || 'Untitled' }] }
          : m
      ))
      toast.success('Document assigned to module')
    } catch (err) {
      toast.error('Failed to assign document')
    }
  }

  const removeDocument = async (moduleId, documentId) => {
    try {
      await del(`/training/paths/${selectedPath.id}/modules/${moduleId}/documents/${documentId}`)
      setModules(prev => prev.map(m =>
        m.id === moduleId
          ? { ...m, documents: (m.documents || []).filter(d => d.id !== documentId) }
          : m
      ))
    } catch { /* optimistic */ }
  }

  const openEdit = (path) => {
    setSelectedPath(path)
    setForm({ name: path.name, description: path.description || '', level: path.level || 'Beginner', duration_days: path.duration_days || 30, status: path.status || 'draft' })
    setShowEditModal(true)
  }

  // ── Render ──────────────────────────────
  return (
    <div className='space-y-6'>
      {/* Hero */}
      <div className='rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/10 to-slate-900/0 p-6'>
        <p className='text-xs uppercase tracking-[0.2em] text-indigo-500'>Curriculum management</p>
        <h2 className='mt-2 text-2xl font-semibold tracking-tight text-white'>
          Training Paths
        </h2>
        <p className='mt-2 text-sm text-slate-400'>
          Design learning paths, assign modules and materials, and track trainee progression across curriculums.
        </p>
      </div>

      {/* Toolbar */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='relative flex-1 max-w-md'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search paths...'
            className='w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500'
          />
        </div>
        <div className='flex items-center gap-3'>
          {/* Status filter */}
          <div className='flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#131825] p-1'>
            {['all', ...PATH_STATUSES].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          {/* View toggle */}
          <div className='flex rounded-xl border border-slate-800 bg-[#131825] p-1'>
            <button onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            ><Grid3X3 className='h-4 w-4' /></button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            ><List className='h-4 w-4' /></button>
          </div>
          <button onClick={() => { setForm({ name: '', description: '', level: 'Beginner', duration_days: 30, status: 'draft' }); setShowCreateModal(true) }}
            className='flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 text-sm transition-all cursor-pointer'
          ><Plus className='h-4 w-4' /> New Path</button>
        </div>
      </div>

      {/* Paths content */}
      {loading ? (
        <div className='flex justify-center py-20'>
          <div className='h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500' />
        </div>
      ) : filtered.length === 0 ? (
        <div className='flex flex-col items-center py-20 text-slate-500 gap-3'>
          <Target className='h-14 w-14 stroke-[1]' />
          <p className='text-lg font-medium text-slate-400'>No training paths found</p>
          <p className='text-sm'>{search ? 'Try a different search' : 'Create your first training path to get started'}</p>
          {!search && <button onClick={() => setShowCreateModal(true)}
            className='mt-2 flex items-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-5 py-2.5 text-sm font-medium hover:bg-indigo-100 transition-all cursor-pointer'
          ><Plus className='h-4 w-4' /> Create Path</button>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
          {filtered.map(path => (
            <Card key={path.id} className='group relative overflow-hidden transition-all duration-300 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-950/10 cursor-pointer'
              onClick={() => openDetail(path)}
            >
              <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-400/5 to-transparent rounded-bl-full' />
              <CardContent className='space-y-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-white truncate'>{path.name}</h3>
                    {path.description && <p className='mt-1.5 text-xs text-slate-400 line-clamp-2'>{path.description}</p>}
                  </div>
                  <Badge variant={statusVariant[path.status] || 'default'}>{path.status}</Badge>
                </div>

                <div className='flex items-center gap-4 text-xs text-slate-400'>
                  <span className='flex items-center gap-1.5'>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${levelColor[path.level] || levelColor['Beginner']}`}>
                      {path.level || 'Beginner'}
                    </span>
                  </span>
                  <span className='flex items-center gap-1.5'><Clock className='h-3.5 w-3.5' />{path.duration_days || '-'} days</span>
                </div>

                <div className='flex items-center gap-4 pt-2 border-t border-white/5 text-xs text-slate-400'>
                  <span className='flex items-center gap-1.5'><Layers className='h-3.5 w-3.5' />{path.module_count || 0} modules</span>
                  <span className='flex items-center gap-1.5'><Users className='h-3.5 w-3.5' />{path.trainee_count || 0} trainees</span>
                </div>

                {/* Hover actions */}
                <div className='absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1'>
                  <button onClick={e => { e.stopPropagation(); openEdit(path) }}
                    className='p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-cyan-200 hover:bg-slate-700/80 transition-all cursor-pointer'
                  ><Edit3 className='h-3.5 w-3.5' /></button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(path.id) }}
                    className='p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-rose-300 hover:bg-slate-700/80 transition-all cursor-pointer'
                  ><Trash2 className='h-3.5 w-3.5' /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List view */
        <Card>
          <CardContent className='p-0'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider'>
                  <th className='text-left p-4 font-medium'>Name</th>
                  <th className='text-left p-4 font-medium'>Level</th>
                  <th className='text-left p-4 font-medium'>Status</th>
                  <th className='text-center p-4 font-medium'>Modules</th>
                  <th className='text-center p-4 font-medium'>Trainees</th>
                  <th className='text-center p-4 font-medium'>Duration</th>
                  <th className='text-right p-4 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(path => (
                  <tr key={path.id} className='border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer' onClick={() => openDetail(path)}>
                    <td className='p-4'>
                      <p className='font-medium text-white'>{path.name}</p>
                      {path.description && <p className='text-xs text-slate-400 truncate max-w-xs'>{path.description}</p>}
                    </td>
                    <td className='p-4'>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${levelColor[path.level] || levelColor['Beginner']}`}>
                        {path.level || 'Beginner'}
                      </span>
                    </td>
                    <td className='p-4'><Badge variant={statusVariant[path.status] || 'default'}>{path.status}</Badge></td>
                    <td className='p-4 text-center text-slate-300'>{path.module_count || 0}</td>
                    <td className='p-4 text-center text-slate-300'>{path.trainee_count || 0}</td>
                    <td className='p-4 text-center text-slate-300'>{path.duration_days || '-'}d</td>
                    <td className='p-4 text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <button onClick={e => { e.stopPropagation(); openEdit(path) }}
                          className='p-2 rounded-lg text-slate-400 hover:text-cyan-200 hover:bg-white/5 transition-all cursor-pointer'
                        ><Edit3 className='h-4 w-4' /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(path.id) }}
                          className='p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-white/5 transition-all cursor-pointer'
                        ><Trash2 className='h-4 w-4' /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Create Modal ─────────────────── */}
      {showCreateModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm' onClick={() => setShowCreateModal(false)}>
          <div className='w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-semibold text-white'>Create Training Path</h3>
              <button onClick={() => setShowCreateModal(false)} className='p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer'><X className='h-5 w-5' /></button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Path Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30'
                  placeholder='e.g. Advanced JavaScript Mastery' />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none'
                  placeholder='Describe what this path covers...' />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-1.5'>Level</label>
                  <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                    className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30'>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-1.5'>Duration (days)</label>
                  <input type='number' value={form.duration_days} onChange={e => setForm({ ...form, duration_days: parseInt(e.target.value) || 0 })}
                    className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30' />
                </div>
              </div>
              <div className='flex gap-3 pt-2'>
                <button onClick={() => setShowCreateModal(false)}
                  className='flex-1 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all cursor-pointer'>Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.name.trim()}
                  className='flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 text-sm transition-all disabled:opacity-50 cursor-pointer'>
                  {saving ? 'Creating...' : 'Create Path'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────── */}
      {showEditModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm' onClick={() => setShowEditModal(false)}>
          <div className='w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-semibold text-white'>Edit Path</h3>
              <button onClick={() => setShowEditModal(false)} className='p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer'><X className='h-5 w-5' /></button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Path Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30' />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none' />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-1.5'>Level</label>
                  <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                    className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30'>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-300 mb-1.5'>Duration (days)</label>
                  <input type='number' value={form.duration_days} onChange={e => setForm({ ...form, duration_days: parseInt(e.target.value) || 0 })}
                    className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30' />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/30'>
                  {PATH_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className='flex gap-3 pt-2'>
                <button onClick={() => setShowEditModal(false)}
                  className='flex-1 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all cursor-pointer'>Cancel</button>
                <button onClick={handleUpdate} disabled={saving || !form.name.trim()}
                  className='flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 text-sm transition-all disabled:opacity-50 cursor-pointer'>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Side Panel ────────────── */}
      {showDetailPanel && selectedPath && (
        <div className='fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm' onClick={() => setShowDetailPanel(false)}>
          <div className='w-full max-w-2xl h-full overflow-y-auto border-l border-white/10 bg-slate-950/95 backdrop-blur-xl' onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className='sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl p-6'>
              <div className='flex items-center justify-between mb-2'>
                <button onClick={() => setShowDetailPanel(false)}
                  className='flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-all cursor-pointer'>
                  <ChevronLeft className='h-4 w-4' /> Back to paths
                </button>
                <div className='flex gap-2'>
                  <button onClick={() => openEdit(selectedPath)}
                    className='flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 transition-all cursor-pointer'>
                    <Edit3 className='h-3.5 w-3.5' /> Edit
                  </button>
                  <button onClick={() => handleDelete(selectedPath.id)}
                    className='flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer'>
                    <Trash2 className='h-3.5 w-3.5' /> Delete
                  </button>
                </div>
              </div>
              <h2 className='text-2xl font-semibold text-white'>{selectedPath.name}</h2>
              <div className='flex items-center gap-3 mt-2'>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${levelColor[selectedPath.level] || levelColor['Beginner']}`}>
                  {selectedPath.level || 'Beginner'}
                </span>
                <Badge variant={statusVariant[selectedPath.status] || 'default'}>{selectedPath.status}</Badge>
                <span className='text-xs text-slate-400 flex items-center gap-1.5'><Clock className='h-3.5 w-3.5' />{selectedPath.duration_days || '-'} days</span>
              </div>
              {selectedPath.description && <p className='mt-3 text-sm text-slate-400'>{selectedPath.description}</p>}
            </div>

            <div className='p-6 space-y-6'>
              {/* Stats */}
              <div className='grid grid-cols-3 gap-4'>
                <div className='rounded-2xl border border-white/10 bg-slate-900/30 p-4 text-center'>
                  <Layers className='h-5 w-5 text-indigo-400 mx-auto mb-1.5' />
                  <p className='text-2xl font-semibold text-white'>{modules.length}</p>
                  <p className='text-xs text-slate-400'>Modules</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-slate-900/30 p-4 text-center'>
                  <Users className='h-5 w-5 text-emerald-400 mx-auto mb-1.5' />
                  <p className='text-2xl font-semibold text-white'>{selectedPath.trainee_count || 0}</p>
                  <p className='text-xs text-slate-400'>Enrolled</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-slate-900/30 p-4 text-center'>
                  <CheckCircle2 className='h-5 w-5 text-amber-400 mx-auto mb-1.5' />
                  <p className='text-2xl font-semibold text-white'>{selectedPath.completion_rate || 0}%</p>
                  <p className='text-xs text-slate-400'>Completion</p>
                </div>
              </div>

              {/* Modules section */}
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <SectionHeader eyebrow='Curriculum' title='Modules' description='Learning modules in this path, in order.' />
                  <button onClick={() => { setShowAddModule(true); setModuleForm({ title: '', description: '', order_index: 0 }) }}
                    className='flex items-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-4 py-2 text-xs font-medium hover:bg-indigo-100 transition-all cursor-pointer'>
                    <Plus className='h-3.5 w-3.5' /> Add Module
                  </button>
                </div>

                {modules.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500'>
                    <Layers className='h-8 w-8 mx-auto mb-2 stroke-[1]' />
                    <p className='text-sm'>No modules yet. Add your first learning module.</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {modules.map((mod, idx) => (
                      <div key={mod.id} className='rounded-2xl border border-white/10 bg-slate-900/30 p-4 hover:border-cyan-400/20 transition-all'>
                        <div className='flex items-start gap-3'>
                          <div className='flex flex-col items-center gap-0.5 pt-1'>
                            <button onClick={() => reorderModule(idx, -1)} disabled={idx === 0}
                              className='p-0.5 rounded text-slate-500 hover:text-cyan-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer'>
                              <ArrowUp className='h-3 w-3' />
                            </button>
                            <span className='text-[10px] font-mono text-slate-500 w-4 text-center'>{idx + 1}</span>
                            <button onClick={() => reorderModule(idx, 1)} disabled={idx === modules.length - 1}
                              className='p-0.5 rounded text-slate-500 hover:text-cyan-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer'>
                              <ArrowDown className='h-3 w-3' />
                            </button>
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between gap-3'>
                              <h4 className='font-medium text-white text-sm'>{mod.title}</h4>
                              <button onClick={() => deleteModule(mod.id)}
                                className='p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer'>
                                <X className='h-3.5 w-3.5' />
                              </button>
                            </div>
                            {mod.description && <p className='text-xs text-slate-400 mt-1'>{mod.description}</p>}

                            {/* Assigned documents */}
                            <div className='mt-3 space-y-1.5'>
                              {(mod.documents || []).map(doc => (
                                <div key={doc.id} className='flex items-center justify-between rounded-xl bg-white/5 px-3 py-2'>
                                  <span className='flex items-center gap-2 text-xs text-slate-300'>
                                    <FileText className='h-3.5 w-3.5 text-slate-400' />
                                    {doc.title}
                                  </span>
                                  <button onClick={() => removeDocument(mod.id, doc.id)}
                                    className='text-slate-500 hover:text-rose-300 transition-all cursor-pointer'>
                                    <X className='h-3 w-3' />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add document dropdown */}
                            {availableDocs.length > 0 && (
                              <div className='mt-2'>
                                <select
                                  onChange={e => { if (e.target.value) assignDocument(mod.id, e.target.value); e.target.value = '' }}
                                  className='w-full rounded-xl border border-white/5 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/30'
                                  defaultValue=''
                                >
                                  <option value='' disabled>Assign a document...</option>
                                  {availableDocs
                                    .filter(d => !(mod.documents || []).some(doc => doc.id === d.id))
                                    .map(d => <option key={d.id} value={d.id}>{d.title}</option>)
                                  }
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress section */}
              <div>
                <SectionHeader eyebrow='Analytics' title='Trainee Progress' description='Who is on this path and how they are progressing.' />
                <div className='mt-4 rounded-2xl border border-white/10 bg-slate-900/30 p-6 text-center text-slate-500'>
                  <BarChart3 className='h-10 w-10 mx-auto mb-2 stroke-[1]' />
                  <p className='text-sm'>Progress analytics will appear as trainees are enrolled.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Module Modal ─────────────── */}
      {showAddModule && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm' onClick={() => setShowAddModule(false)}>
          <div className='w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-lg font-semibold text-white'>Add Module</h3>
              <button onClick={() => setShowAddModule(false)} className='p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer'><X className='h-5 w-5' /></button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Module Title *</label>
                <input value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30'
                  placeholder='e.g. Introduction to React Hooks' />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-300 mb-1.5'>Description</label>
                <textarea value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
                  rows={3} className='w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none' />
              </div>
              <div className='flex gap-3 pt-2'>
                <button onClick={() => setShowAddModule(false)}
                  className='flex-1 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all cursor-pointer'>Cancel</button>
                <button onClick={handleAddModule} disabled={savingModule || !moduleForm.title.trim()}
                  className='flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 text-sm transition-all disabled:opacity-50 cursor-pointer'>
                  {savingModule ? 'Adding...' : 'Add Module'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
