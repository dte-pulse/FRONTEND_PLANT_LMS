import { useEffect, useMemo, useState } from 'react'
import { get, post } from '@/api/client'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart3, AlertTriangle, CheckCircle2, RefreshCw,
  FileText, Download, Layers, Cpu, Eye, Plus
} from 'lucide-react'

const ANNEXURE_TYPES = [
  { slug: 'i', label: 'Annexure-I', title: 'Induction Training Schedule', desc: 'New employee induction planning and scheduling' },
  { slug: 'ii', label: 'Annexure-II', title: 'Induction Training Evaluation', desc: 'Trainer and HOD evaluation for induction completion' },
  { slug: 'iii', label: 'Annexure-III', title: 'Annual Training Calendar', desc: 'Department-wise planned vs actual training execution' },
  { slug: 'iv', label: 'Annexure-IV', title: 'Training Attendance Sheet', desc: 'Session attendance, threshold, and material tracking' },
  { slug: 'v', label: 'Annexure-V', title: 'Individual Training Record', desc: 'Employee-level training history and qualification status' },
  { slug: 'vi', label: 'Annexure-VI', title: 'Trainer Qualification Record', desc: 'Trainer approval, validity, and qualification tracking' },
  { slug: 'vii', label: 'Annexure-VII', title: 'Need-Based Training Request', desc: 'Departmental need-based training request and approval record' },
  { slug: 'viii', label: 'Annexure-VIII', title: 'External Training Record', desc: 'External agency, venue, duration, and certificate log' },
  { slug: 'ix', label: 'Annexure-IX', title: 'OJT Record', desc: 'On-the-job training execution, observation, and qualification' },
  { slug: 'x', label: 'Annexure-X', title: 'SOP Training Record', desc: 'SOP-triggered training, version, trigger reason, and result' },
  { slug: 'xi', label: 'Annexure-XI', title: 'cGMP Refresher Training Record', desc: 'Annual cGMP refresher and skill-gap follow-up record' },
]

const ANNEXURE_FIELDS = {
  i: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'department', label: 'Department', type: 'text', required: true },
    { name: 'joining_date', label: 'Joining Date', type: 'date' },
    { name: 'scheduled_start', label: 'Scheduled Start', type: 'date' },
    { name: 'scheduled_end', label: 'Scheduled End', type: 'date' },
    { name: 'trainer_id', label: 'Trainer ID', type: 'number' },
    { name: 'topics_covered', label: 'Topics Covered', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  ii: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'trainer_id', label: 'Trainer ID', type: 'number' },
    { name: 'evaluation_date', label: 'Evaluation Date', type: 'date' },
    { name: 'theory_score', label: 'Theory Score', type: 'number' },
    { name: 'practical_score', label: 'Practical Score', type: 'number' },
    { name: 'overall_score', label: 'Overall Score', type: 'number' },
    { name: 'result', label: 'Result', type: 'text' },
    { name: 'trainer_remarks', label: 'Trainer Remarks', type: 'textarea' },
    { name: 'hod_remarks', label: 'HOD Remarks', type: 'textarea' },
  ],
  iii: [
    { name: 'year', label: 'Year', type: 'number', required: true },
    { name: 'department', label: 'Department', type: 'text', required: true },
    { name: 'training_type', label: 'Training Type', type: 'text', required: true },
    { name: 'topic_title', label: 'Topic Title', type: 'text', required: true },
    { name: 'planned_month', label: 'Planned Month', type: 'number', required: true },
    { name: 'planned_date', label: 'Planned Date', type: 'date' },
    { name: 'actual_date', label: 'Actual Date', type: 'date' },
    { name: 'trainer_name', label: 'Trainer Name', type: 'text' },
    { name: 'duration_hours', label: 'Duration Hours', type: 'number' },
    { name: 'status', label: 'Status', type: 'text' },
    { name: 'carry_forward_reason', label: 'Carry Forward Reason', type: 'textarea' },
  ],
  iv: [
    { name: 'training_date', label: 'Training Date', type: 'date', required: true },
    { name: 'topic_title', label: 'Topic Title', type: 'text', required: true },
    { name: 'venue', label: 'Venue', type: 'text' },
    { name: 'trainer_name', label: 'Trainer Name', type: 'text' },
    { name: 'total_invitees', label: 'Total Invitees', type: 'number' },
    { name: 'total_present', label: 'Total Present', type: 'number' },
    { name: 'attendance_pct', label: 'Attendance %', type: 'number' },
    { name: 'material_ref', label: 'Material Reference', type: 'text' },
  ],
  v: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'training_date', label: 'Training Date', type: 'date' },
    { name: 'topic_title', label: 'Topic Title', type: 'text', required: true },
    { name: 'training_type', label: 'Training Type', type: 'text', required: true },
    { name: 'document_ref', label: 'Document Reference', type: 'text' },
    { name: 'trainer_name', label: 'Trainer Name', type: 'text' },
    { name: 'score', label: 'Score', type: 'number' },
    { name: 'result', label: 'Result', type: 'text' },
    { name: 'certificate_url', label: 'Certificate URL', type: 'text' },
  ],
  vi: [
    { name: 'trainer_id', label: 'Trainer ID', type: 'number', required: true },
    { name: 'subject_area', label: 'Subject Area', type: 'text', required: true },
    { name: 'qualification_date', label: 'Qualification Date', type: 'date' },
    { name: 'approved_by', label: 'Approved By', type: 'number' },
    { name: 'validity_years', label: 'Validity Years', type: 'number' },
    { name: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'text' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
  vii: [
    { name: 'requester_id', label: 'Requester ID', type: 'number', required: true },
    { name: 'department', label: 'Department', type: 'text', required: true },
    { name: 'training_need', label: 'Training Need', type: 'textarea', required: true },
    { name: 'reason', label: 'Reason', type: 'textarea', required: true },
    { name: 'target_employees', label: 'Target Employees', type: 'textarea' },
    { name: 'requested_date', label: 'Requested Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'text' },
    { name: 'approval_remarks', label: 'Approval Remarks', type: 'textarea' },
  ],
  viii: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'training_title', label: 'Training Title', type: 'text', required: true },
    { name: 'agency_name', label: 'Agency Name', type: 'text', required: true },
    { name: 'venue', label: 'Venue', type: 'text' },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
    { name: 'duration_days', label: 'Duration Days', type: 'number' },
    { name: 'cost', label: 'Cost', type: 'number' },
    { name: 'certificate_url', label: 'Certificate URL', type: 'text' },
    { name: 'learning_summary', label: 'Learning Summary', type: 'textarea' },
  ],
  ix: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'trainer_id', label: 'Trainer ID', type: 'number' },
    { name: 'topic_id', label: 'Topic ID', type: 'number' },
    { name: 'topic_title', label: 'Topic Title', type: 'text', required: true },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
    { name: 'tasks_performed', label: 'Tasks Performed', type: 'textarea' },
    { name: 'trainer_observation', label: 'Trainer Observation', type: 'textarea' },
    { name: 'practical_score', label: 'Practical Score', type: 'number' },
    { name: 'written_test_score', label: 'Written Test Score', type: 'number' },
    { name: 'result', label: 'Result', type: 'text' },
  ],
  x: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'document_id', label: 'Document ID', type: 'number' },
    { name: 'sop_code', label: 'SOP Code', type: 'text', required: true },
    { name: 'sop_title', label: 'SOP Title', type: 'text', required: true },
    { name: 'sop_version', label: 'SOP Version', type: 'number' },
    { name: 'training_date', label: 'Training Date', type: 'date' },
    { name: 'trigger_reason', label: 'Trigger Reason', type: 'text' },
    { name: 'score', label: 'Score', type: 'number' },
    { name: 'result', label: 'Result', type: 'text' },
    { name: 'trainer_id', label: 'Trainer ID', type: 'number' },
  ],
  xi: [
    { name: 'user_id', label: 'User ID', type: 'number', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    { name: 'training_date', label: 'Training Date', type: 'date' },
    { name: 'topics_covered', label: 'Topics Covered', type: 'textarea' },
    { name: 'skill_gap_notes', label: 'Skill Gap Notes', type: 'textarea' },
    { name: 'score', label: 'Score', type: 'number' },
    { name: 'result', label: 'Result', type: 'text' },
    { name: 'trainer_id', label: 'Trainer ID', type: 'number' },
  ],
}

function formatValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function getPrintableAnnexureUrl(slug, record) {
  if (!record?.id && slug !== 'iii' && slug !== 'xi') return null
  switch (slug) {
    case 'i':
      return record.user_id ? `/annexure/i/induction-schedule/${record.user_id}` : null
    case 'ii':
      return record.user_id ? `/annexure/ii/induction-evaluation/${record.user_id}` : null
    case 'iii': {
      const year = record.year || new Date().getFullYear()
      const department = encodeURIComponent(record.department || '')
      return `/annexure/iii/training-calendar?year=${year}&department=${department}`
    }
    case 'iv':
      return record.calendar_id ? `/annexure/iv/attendance-sheet/${record.calendar_id}` : null
    case 'v':
      return record.user_id ? `/annexure/user/${record.user_id}/training-record` : null
    case 'vi':
      return `/annexure/vi/trainer-qualification/${record.id}`
    case 'vii':
      return `/annexure/vii/need-based-training/${record.id}`
    case 'viii':
      return `/annexure/viii/external-training/${record.id}`
    case 'ix':
      return `/annexure/ix/ojt-record/${record.id}`
    case 'x':
      return `/annexure/x/sop-training/${record.id}`
    case 'xi': {
      const year = record.year || new Date().getFullYear()
      const department = encodeURIComponent(record.department || '')
      return `/annexure/xi/cgmp-refresher?year=${year}&department=${department}`
    }
    default:
      return null
  }
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('compliance')
  const [compliance, setCompliance] = useState([])
  const [overdue, setOverdue] = useState([])
  const [nqList, setNqList] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [tokenUsage, setTokenUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportingId, setExportingId] = useState(null)
  const [selectedAnnexure, setSelectedAnnexure] = useState(ANNEXURE_TYPES[0])
  const [annexureRecords, setAnnexureRecords] = useState([])
  const [loadingAnnexureRecords, setLoadingAnnexureRecords] = useState(false)
  const [showAnnexureModal, setShowAnnexureModal] = useState(false)
  const [submittingAnnexure, setSubmittingAnnexure] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showRecordDetailsModal, setShowRecordDetailsModal] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [comp, over, nq, ready, tokens] = await Promise.all([
        get('/reports/compliance'),
        get('/reports/overdue'),
        get('/reports/nq-employees'),
        get('/reports/global-readiness'),
        get('/reports/token-usage').catch(() => null),
      ])
      setCompliance(comp)
      setOverdue(over)
      setNqList(nq)
      setReadiness(ready)
      setTokenUsage(tokens)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnexureRecords = async (annexure) => {
    setLoadingAnnexureRecords(true)
    try {
      const data = await get(`/reports/annexures/${annexure.slug}`)
      setAnnexureRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      toast.error(`Failed to load ${annexure.label} records`)
      setAnnexureRecords([])
    } finally {
      setLoadingAnnexureRecords(false)
    }
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => {
    if (activeTab === 'annexures' && selectedAnnexure) {
      fetchAnnexureRecords(selectedAnnexure)
    }
  }, [activeTab, selectedAnnexure?.slug])

  const handleExport = async (endpoint, filename) => {
    setExportingId(endpoint)
    try {
      const response = await apiClient.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${filename} exported successfully`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingId(null)
    }
  }

  const handleAnnexureExport = async (annexureType) => {
    setExportingId(`annexure-${annexureType.slug}`)
    try {
      const response = await apiClient.get(`/reports/annexures/${annexureType.slug}/export`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${annexureType.label.toLowerCase()}_export.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${annexureType.label} exported`)
    } catch {
      toast.error(`Export failed for ${annexureType.label}`)
    } finally {
      setExportingId(null)
    }
  }

  const openPrintableAnnexure = (record) => {
    const url = getPrintableAnnexureUrl(selectedAnnexure.slug, record)
    if (!url) {
      toast.error(`Printable view is not available for ${selectedAnnexure.label} on this record`)
      return
    }
    window.open(`${apiClient.defaults.baseURL}${url}`, '_blank', 'noopener,noreferrer')
  }

  const openAnnexureModal = (annexure) => {
    setSelectedAnnexure(annexure)
    setAnnexureForm({})
    setShowAnnexureModal(true)
  }

  const handleSubmitAnnexure = async (e) => {
    e.preventDefault()
    const fields = ANNEXURE_FIELDS[selectedAnnexure.slug] || []
    const missingField = fields.find(field => field.required && !String(annexureForm[field.name] ?? '').trim())
    if (missingField) {
      toast.error(`${missingField.label} is required`)
      return
    }

    const payload = {}
    for (const field of fields) {
      const raw = annexureForm[field.name]
      if (raw === undefined || raw === '') continue
      if (field.type === 'number') payload[field.name] = Number(raw)
      else payload[field.name] = raw
    }

    setSubmittingAnnexure(true)
    try {
      await post(`/annexure/${selectedAnnexure.slug}`, payload)
      toast.success(`${selectedAnnexure.label} record created`)
      setShowAnnexureModal(false)
      setAnnexureForm({})
      fetchAnnexureRecords(selectedAnnexure)
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.detail || `Failed to create ${selectedAnnexure.label} record`)
    } finally {
      setSubmittingAnnexure(false)
    }
  }

  const annexureColumns = useMemo(() => {
    if (annexureRecords.length === 0) return []
    return Object.keys(annexureRecords[0]).filter(key => key !== 'created_at').slice(0, 6)
  }, [annexureRecords])

  const scoreColor = (s) => s >= 90 ? 'text-emerald-400' : s >= 70 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = (s) => s >= 90 ? 'bg-emerald-400/10' : s >= 70 ? 'bg-amber-400/10' : 'bg-red-400/10'

  const tabs = [
    { key: 'compliance', label: 'Dept Compliance' },
    { key: 'overdue', label: `Overdue (${overdue.length})` },
    { key: 'nq', label: `NQ Employees (${nqList.length})` },
    { key: 'token', label: 'Token Usage' },
    { key: 'annexures', label: 'Annexures' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Reports</h1>
          <p className="text-slate-400 text-sm">Live compliance, overdue tracking, NQ alerts, AI reporting, and annexure workflows.</p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {readiness && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Global Readiness', value: `${readiness.readiness_score}%`, icon: BarChart3, color: scoreColor(readiness.readiness_score), bg: scoreBg(readiness.readiness_score) },
            { label: 'Total Assignments', value: readiness.total_assignments, icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Completed', value: readiness.completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Overdue', value: overdue.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center gap-3">
              <div className={`${bg} p-3 rounded-xl`}><Icon className={`h-5 w-5 ${color}`} /></div>
              <div><p className="text-xs text-slate-400">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl whitespace-nowrap transition-all ${
              activeTab === key ? 'text-indigo-400 border-b-2 border-indigo-500 -mb-px' : 'text-slate-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
        </div>
      )}

      {!loading && activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => handleExport('/reports/compliance/export', 'compliance_report.csv')}
              disabled={exportingId === '/reports/compliance/export'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold border border-indigo-500/30 disabled:opacity-50 transition-all shadow-xs"
            >
              <Download className="h-4 w-4" />
              {exportingId === '/reports/compliance/export' ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
          {compliance.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No department compliance data found</div>
          ) : compliance.map((dept, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{dept.department}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{dept.total_employees} employees · {dept.total_assignments} assignments</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-extrabold ${scoreColor(dept.compliance_score)}`}>{dept.compliance_score}%</p>
                  <p className="text-xs text-slate-400">{dept.completed}/{dept.total_assignments} completed</p>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${
                  dept.compliance_score >= 90 ? 'bg-emerald-400' : dept.compliance_score >= 70 ? 'bg-amber-400' : 'bg-red-400'
                }`} style={{ width: `${dept.compliance_score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === 'overdue' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => handleExport('/reports/overdue/export', 'overdue_report.csv')}
              disabled={exportingId === '/reports/overdue/export'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold disabled:opacity-50 transition-all"
            >
              <Download className="h-4 w-4" />
              {exportingId === '/reports/overdue/export' ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr>
                  {['Employee', 'Department', 'Training Type', 'Document', 'Days Overdue', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {overdue.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No overdue assignments.</td></tr>
                ) : overdue.map(a => (
                  <tr key={a.assignment_id} className={`hover:bg-white/5 transition-colors ${a.days_overdue > 30 ? 'bg-red-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.employee_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{a.department || '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-violet-400/10 text-violet-300 capitalize">{a.training_type?.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3"><p className="font-mono text-xs text-cyan-300">{a.document_code || '—'}</p><p className="text-xs text-slate-400 truncate max-w-[160px]">{a.document_title}</p></td>
                    <td className="px-4 py-3"><span className={`font-bold text-sm ${a.days_overdue > 30 ? 'text-red-400' : 'text-amber-400'}`}>{a.days_overdue}d</span></td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 capitalize">{a.status?.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'nq' && (
        <div className="space-y-3">
          {nqList.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No NQ employees detected.</div>
          ) : nqList.map((emp, i) => (
            <div key={i} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">{emp.full_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{emp.employee_code} · {emp.department || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-red-400 font-bold">{emp.critical_weak_topics} critical topics</p>
                <p className="text-xs text-slate-400">Avg score: {emp.avg_score}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === 'token' && (
        <div className="space-y-4">
          {!tokenUsage ? (
            <div className="text-center py-12 text-slate-500">Token usage data unavailable</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Requests', value: tokenUsage.total_requests ?? '0', icon: Cpu, color: 'text-violet-400', bg: 'bg-violet-400/10' },
                  { label: 'Total Tokens', value: tokenUsage.total_tokens?.toLocaleString() ?? '0', icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                  { label: 'Cache Hits', value: tokenUsage.cache_hits?.toLocaleString() ?? '0', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  { label: 'Cache Hit Rate', value: `${tokenUsage.cache_hit_rate ?? 0}%`, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center gap-3">
                    <div className={`${bg} p-3 rounded-xl`}><Icon className={`h-5 w-5 ${color}`} /></div>
                    <div><p className="text-xs text-slate-400">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
                <p className="text-sm font-semibold text-white">By Operation</p>
                {Object.entries(tokenUsage.by_operation || {}).length === 0 ? (
                  <p className="text-sm text-slate-500">No token logs found for the selected period.</p>
                ) : (
                  Object.entries(tokenUsage.by_operation || {}).map(([operation, meta]) => (
                    <div key={operation} className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
                      <div>
                        <p className="text-sm text-white font-medium">{operation}</p>
                        <p className="text-xs text-slate-400">{meta.count} requests</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-cyan-300 font-semibold">{meta.tokens} tokens</p>
                        <p className="text-xs text-slate-500">${meta.cost_usd?.toFixed?.(4) ?? meta.cost_usd}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && activeTab === 'annexures' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Create, review, and export digitized SOP annexure records directly from the LMS.</p>
          <div className="grid gap-3">
            {ANNEXURE_TYPES.map((annex) => (
              <div key={annex.slug} className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${
                selectedAnnexure.slug === annex.slug ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/10 bg-slate-900/60'
              }`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="bg-cyan-400/10 p-2.5 rounded-xl flex-shrink-0">
                    <FileText className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm">{annex.label}: {annex.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{annex.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedAnnexure(annex); fetchAnnexureRecords(annex) }}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openAnnexureModal(annex)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create
                  </Button>
                  <Button size="sm" onClick={() => handleAnnexureExport(annex)} disabled={exportingId === `annexure-${annex.slug}`}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {exportingId === `annexure-${annex.slug}` ? 'Exporting…' : 'Export'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-white">{selectedAnnexure.label}: {selectedAnnexure.title}</p>
                <p className="text-sm text-slate-400">{selectedAnnexure.desc}</p>
              </div>
              <Button onClick={() => openAnnexureModal(selectedAnnexure)}>
                <Plus className="h-4 w-4 mr-2" /> Add Record
              </Button>
            </div>

            {loadingAnnexureRecords ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
              </div>
            ) : annexureRecords.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No records found for this annexure yet.</div>
            ) : (
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/60">
                    <tr>
                      {annexureColumns.map(column => (
                        <th key={column} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{column.replace(/_/g, ' ')}</th>
                      ))}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {annexureRecords.slice(0, 8).map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-white/5 transition-colors">
                        {annexureColumns.map(column => {
                          const val = record[column];
                          const isUrl = typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'));
                          return (
                            <td key={column} className="px-4 py-3 text-slate-300 text-xs max-w-[220px] truncate">
                              {isUrl ? (
                                <a 
                                  href={val.startsWith('/') ? `${apiClient.defaults.baseURL}${val}` : val} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-cyan-300 hover:text-cyan-200 underline font-medium"
                                >
                                  View File
                                </a>
                              ) : (
                                formatValue(val)
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowRecordDetailsModal(true)
                            }}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openPrintableAnnexure(record)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showAnnexureModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowAnnexureModal(false)}>
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedAnnexure.label}: Create Record</h3>
                <p className="text-sm text-slate-400 mt-1">{selectedAnnexure.title}</p>
              </div>
              <Button variant="ghost" onClick={() => setShowAnnexureModal(false)}>Close</Button>
            </div>

            <form onSubmit={handleSubmitAnnexure} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(ANNEXURE_FIELDS[selectedAnnexure.slug] || []).map((field) => (
                  <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={annexureForm[field.name] || ''}
                        onChange={(e) => setAnnexureForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-full min-h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40"
                      />
                    ) : (
                      <Input
                        type={field.type}
                        value={annexureForm[field.name] || ''}
                        onChange={(e) => setAnnexureForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAnnexureModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submittingAnnexure}>
                  {submittingAnnexure ? 'Saving…' : 'Save Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRecordDetailsModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRecordDetailsModal(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedAnnexure.label} Record Details</h3>
                <p className="text-sm text-slate-400 mt-1">{selectedAnnexure.title}</p>
              </div>
              <Button variant="ghost" onClick={() => setShowRecordDetailsModal(false)}>Close</Button>
            </div>

            <div className="space-y-4">
              {Object.entries(selectedRecord)
                .filter(([key]) => key !== 'id' && key !== 'created_at')
                .map(([key, val]) => {
                  const fieldDef = (ANNEXURE_FIELDS[selectedAnnexure.slug] || []).find(f => f.name === key);
                  const label = fieldDef ? fieldDef.label : key.replace(/_/g, ' ').toUpperCase();
                  const isUrl = typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'));
                  return (
                    <div key={key} className="border-b border-white/5 pb-3">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        {label}
                      </span>
                      {isUrl ? (
                        <a 
                          href={val.startsWith('/') ? `${apiClient.defaults.baseURL}${val}` : val} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-cyan-300 hover:text-cyan-200 underline font-medium break-all"
                        >
                          View File / Link
                        </a>
                      ) : (
                        <div className="text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                          {formatValue(val)}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
              <Button type="button" variant="secondary" onClick={() => setShowRecordDetailsModal(false)}>Close</Button>
              <Button type="button" onClick={() => {
                openPrintableAnnexure(selectedRecord);
                setShowRecordDetailsModal(false);
              }}>
                <Eye className="h-3.5 w-3.5 mr-1.5" /> Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
