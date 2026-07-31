import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '@/api/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [readiness, setReadiness] = useState(null)
  const [overdue, setOverdue] = useState([])
  const [nqList, setNqList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [r, o, nq] = await Promise.all([
          get('/reports/global-readiness'),
          get('/reports/overdue'),
          get('/reports/nq-employees'),
        ])
        setReadiness(r)
        setOverdue(o)
        setNqList(nq)
      } catch { /* show defaults */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const r = readiness || {}

  return (
    <div className='space-y-6'>
      {/* Hero */}
      <div className='rounded-3xl border border-white/10 bg-gradient-to-br from-violet-400/10 to-slate-900/0 p-6'>
        <p className='text-xs uppercase tracking-[0.28em] text-violet-300/70'>Admin performance view</p>
        <h2 className='mt-2 text-2xl font-semibold tracking-tight text-white'>
          Run training operations with tighter visibility and audit-friendly evidence.
        </h2>
        <p className='mt-2 text-sm text-slate-400'>Monitor assignments, qualification gaps, overdue learning, and retraining signals.</p>
        <div className='mt-4 flex gap-3'>
          <button onClick={() => navigate('/admin/reports')}
            className='px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all'>
            Review Overdue Training
          </button>
          <button onClick={() => navigate('/admin/documents')}
            className='px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm text-white transition-all'>
            Open Document Control
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label='Global Readiness' value={loading ? '…' : `${r.readiness_score ?? 0}%`} hint='Completed / total assignments' />
        <MetricCard label='Total Assignments' value={loading ? '…' : String(r.total_assignments ?? 0)} hint='All active training assignments' />
        <MetricCard label='NQ Alerts' value={loading ? '…' : String(nqList.length)} hint='Employees requiring retraining' />
        <MetricCard label='Overdue' value={loading ? '…' : String(overdue.length)} hint='Past due date, not completed' />
      </div>

      <div className='grid gap-6 xl:grid-cols-[1.25fr_0.75fr]'>
        {/* Overdue Assignments */}
        <Card>
          <SectionHeader eyebrow='Live compliance' title='Overdue training assignments' description='High-priority items requiring immediate follow-up.' />
          <CardContent className='mt-6 space-y-3'>
            {loading ? (
              <div className='flex justify-center py-8'><div className='h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent' /></div>
            ) : overdue.length === 0 ? (
              <p className='text-slate-500 text-sm py-4 text-center'>✅ No overdue assignments</p>
            ) : (
              overdue.slice(0, 6).map(a => (
                <div key={a.assignment_id} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <div className='flex items-center justify-between gap-4'>
                    <div>
                      <p className='font-medium text-white text-sm'>{a.full_name}</p>
                      <p className='text-xs text-slate-400'>{a.department} · {a.training_type?.replace(/_/g, ' ').toUpperCase()}</p>
                    </div>
                    <Badge variant={a.days_overdue > 30 ? 'danger' : 'warning'}>{a.days_overdue}d overdue</Badge>
                  </div>
                  <p className='mt-1 text-xs text-slate-500'>{a.document_code} — {a.document_title}</p>
                </div>
              ))
            )}
            {overdue.length > 6 && (
              <button onClick={() => navigate('/admin/reports')} className='text-xs text-violet-400 hover:text-violet-300 block text-center w-full pt-2'>
                View all {overdue.length} overdue →
              </button>
            )}
          </CardContent>
        </Card>

        {/* NQ Employees */}
        <Card>
          <SectionHeader eyebrow='People needing intervention' title='NQ Employee alerts' description='Critical weak profiles.' />
          <CardContent className='mt-6 space-y-3'>
            {loading ? (
              <div className='flex justify-center py-8'><div className='h-8 w-8 animate-spin rounded-full border-4 border-red-400 border-t-transparent' /></div>
            ) : nqList.length === 0 ? (
              <p className='text-slate-500 text-sm py-4 text-center'>✅ No NQ employees</p>
            ) : (
              nqList.slice(0, 5).map((emp, i) => (
                <div key={i} className='rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-white'>{emp.full_name}</p>
                      <p className='text-xs text-slate-400'>{emp.employee_code} · {emp.department}</p>
                    </div>
                    <Badge variant='danger'>{emp.critical_weak_topics} critical</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
