import { useState, useEffect } from 'react'
import { get } from '@/api/client'
import { toast } from 'sonner'
import {
  BarChart3, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  TrendingDown, Users, FileText, Download, ExternalLink
} from 'lucide-react'

export default function HodReportsPage() {
  const [compliance, setCompliance] = useState([])
  const [overdue, setOverdue] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [nqList, setNqList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('compliance')
  const [departmentName, setDepartmentName] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const user = await get('/users/me')
      const dept = user.department || 'Production'
      setDepartmentName(dept)

      const [comp, over, nq] = await Promise.all([
        get(`/reports/department-compliance/${encodeURIComponent(dept)}`),
        get(`/reports/overdue?department=${encodeURIComponent(dept)}`),
        get(`/reports/nq-employees?department=${encodeURIComponent(dept)}`),
      ])

      setCompliance(comp ? [comp] : [])
      setOverdue(over)
      setReadiness({
        readiness_score: comp?.compliance_score ?? 0,
        total_assignments: comp?.total_assignments ?? 0,
        completed: comp?.completed ?? 0,
        overdue: over.length,
      })
      setNqList(nq)
    } catch { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const scoreColor = (s) =>
    s >= 90 ? 'text-emerald-400' : s >= 70 ? 'text-amber-400' : 'text-red-400'
  const scoreBg = (s) =>
    s >= 90 ? 'bg-emerald-400/10' : s >= 70 ? 'bg-amber-400/10' : 'bg-red-400/10'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Reports</h1>
          <p className="text-slate-400 text-sm">
            {departmentName ? `${departmentName} training compliance, overdue assignments, and NQ tracking` : 'Department training compliance, overdue assignments, and NQ tracking'}
          </p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-[color,background-color,border-color,box-shadow,transform,opacity]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Global Summary Cards */}
      {readiness && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Global Readiness', value: `${readiness.readiness_score}%`, icon: BarChart3, color: scoreColor(readiness.readiness_score), bg: scoreBg(readiness.readiness_score) },
            { label: 'Total Assignments', value: readiness.total_assignments, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Completed', value: readiness.completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Overdue', value: readiness.overdue ?? overdue.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center gap-3">
              <div className={`${bg} p-3 rounded-xl`}><Icon className={`h-5 w-5 ${color}`} /></div>
              <div><p className="text-xs text-slate-400">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { key: 'compliance', label: 'Dept Compliance' },
          { key: 'overdue', label: `Overdue (${overdue.length})` },
          { key: 'nq', label: `NQ Employees (${nqList.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
              activeTab === key ? 'text-emerald-400 border-b-2 border-emerald-500 -mb-px' : 'text-slate-400 hover:text-white'
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

      {/* Department Compliance */}
      {!loading && activeTab === 'compliance' && (
        <div className="space-y-3">
          {compliance.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No department data found</div>
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
                <div className={`h-2 rounded-full transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                  dept.compliance_score >= 90 ? 'bg-emerald-400' : dept.compliance_score >= 70 ? 'bg-amber-400' : 'bg-red-400'
                }`} style={{ width: `${dept.compliance_score}%` }} />
              </div>
              {dept.overdue > 0 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-400">
                  <AlertTriangle className="h-3 w-3" /> {dept.overdue} overdue assignments
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overdue Assignments */}
      {!loading && activeTab === 'overdue' && (
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
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400 stroke-[1]" />
                  No overdue assignments!
                </td></tr>
              ) : overdue.map(a => (
                <tr key={a.assignment_id} className={`hover:bg-white/5 transition-colors ${a.days_overdue > 30 ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{a.full_name}</p>
                    <p className="text-xs text-slate-400">{a.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{a.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-violet-400/10 text-violet-300 capitalize">
                      {a.training_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-cyan-300">{a.document_code || '—'}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[160px]">{a.document_title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${a.days_overdue > 30 ? 'text-red-400' : 'text-amber-400'}`}>
                      {a.days_overdue}d
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 capitalize">
                      {a.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NQ Employees */}
      {!loading && activeTab === 'nq' && (
        <div className="space-y-3">
          {nqList.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400 stroke-[1]" />
              <p className="text-emerald-400">No NQ employees detected</p>
            </div>
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
    </div>
  )
}
