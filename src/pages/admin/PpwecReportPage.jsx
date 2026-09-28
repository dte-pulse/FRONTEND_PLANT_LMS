import { useEffect, useState } from 'react'
import ppwecApi from '@/api/ppwec'
import { Award, BarChart3, Download, GraduationCap, Users } from 'lucide-react'

export default function PpwecReportPage() {
  const [org, setOrg] = useState(null)
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([ppwecApi.orgReport(), ppwecApi.deptReport()])
      .then(([o, d]) => { setOrg(o.data); setDepts(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500' />
      </div>
    )
  }
  if (!org) return <p className='p-8 text-center text-sm text-slate-400'>PPWEC reporting is unavailable.</p>

  const cards = [
    { label: 'Total Employees', value: org.total_employees, icon: Users },
    { label: 'Started', value: org.started, icon: BarChart3 },
    { label: 'In Progress', value: org.in_progress, icon: BarChart3 },
    { label: 'Completed', value: org.completed, icon: Award },
    { label: 'Certified', value: org.certified, icon: GraduationCap },
    { label: 'Avg Score', value: org.avg_score != null ? `${org.avg_score}%` : '—', icon: BarChart3 },
  ]

  return (
    <div className='mx-auto max-w-6xl space-y-6 pb-10'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-[10px] font-bold uppercase tracking-widest text-cyan-400'>PPWEC · §24 Reporting Dashboard</p>
          <h1 className='text-xl font-bold text-slate-100'>Programme Progress</h1>
        </div>
        <a href={ppwecApi.exportCsvUrl} target='_blank' rel='noopener noreferrer'
          className='flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800'>
          <Download className='h-4 w-4' /> Export CSV (individual level)
        </a>
      </div>

      <div className='grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6'>
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className='rounded-2xl border border-slate-800 bg-[#111827] p-4'>
            <Icon className='mb-2 h-4 w-4 text-cyan-400' />
            <p className='text-2xl font-black text-slate-100'>{value}</p>
            <p className='text-[10px] font-bold uppercase tracking-wider text-slate-500'>{label}</p>
          </div>
        ))}
      </div>

      <div className='rounded-3xl border border-slate-800 bg-[#0F1420] p-5'>
        <h2 className='mb-4 text-sm font-bold text-slate-100'>Module-Level Progress</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead>
              <tr className='border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500'>
                <th className='p-3'>Module</th>
                <th className='p-3'>Status</th>
                <th className='p-3 text-center'>Not Started</th>
                <th className='p-3 text-center'>In Progress</th>
                <th className='p-3 text-center'>Completed</th>
                <th className='p-3 text-center'>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {(org.modules || []).map(m => (
                <tr key={m.module_number} className='border-b border-slate-800/50 text-slate-300'>
                  <td className='p-3'>
                    <span className='font-bold text-slate-100'>M{String(m.module_number).padStart(2, '0')}</span>
                    <span className='ml-2 text-slate-400'>{m.title}</span>
                  </td>
                  <td className='p-3'>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === 'final' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className='p-3 text-center'>{m.not_started}</td>
                  <td className='p-3 text-center text-cyan-300'>{m.in_progress}</td>
                  <td className='p-3 text-center text-emerald-300'>{m.completed}</td>
                  <td className='p-3 text-center'>{m.avg_score != null ? `${m.avg_score}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className='rounded-3xl border border-slate-800 bg-[#0F1420] p-5'>
        <h2 className='mb-4 text-sm font-bold text-slate-100'>Function-Level Breakdown</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead>
              <tr className='border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500'>
                <th className='p-3'>Department</th>
                <th className='p-3 text-center'>Employees</th>
                <th className='p-3 text-center'>Started</th>
                <th className='p-3 text-center'>Completed</th>
                <th className='p-3 text-center'>Completion</th>
                <th className='p-3 text-center'>Avg Score</th>
                <th className='p-3 text-center'>Certified</th>
              </tr>
            </thead>
            <tbody>
              {depts.map(d => (
                <tr key={d.department} className='border-b border-slate-800/50 text-slate-300'>
                  <td className='p-3 font-bold text-slate-100'>{d.department}</td>
                  <td className='p-3 text-center'>{d.employees}</td>
                  <td className='p-3 text-center'>{d.started}</td>
                  <td className='p-3 text-center text-emerald-300'>{d.completed}</td>
                  <td className='p-3 text-center'>
                    <div className='mx-auto flex w-28 items-center gap-2'>
                      <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800'>
                        <div className='h-full bg-cyan-500' style={{ width: `${d.completion_rate}%` }} />
                      </div>
                      <span>{d.completion_rate}%</span>
                    </div>
                  </td>
                  <td className='p-3 text-center'>{d.avg_score != null ? `${d.avg_score}%` : '—'}</td>
                  <td className='p-3 text-center text-amber-300'>{d.certified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
