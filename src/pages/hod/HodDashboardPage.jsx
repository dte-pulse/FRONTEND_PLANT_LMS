import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '@/api/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { RoleHero } from '@/components/dashboard/RoleHero'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

export default function HodDashboardPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [deptCompliance, setDeptCompliance] = useState(null)
  const [nqList, setNqList] = useState([])
  const [overdue, setOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const user = await get('/users/me')
        setCurrentUser(user)

        const deptName = user.department || 'Production'
        const [complianceData, nqData, overdueData] = await Promise.all([
          get(`/reports/department-compliance/${deptName}`),
          get(`/reports/nq-employees?department=${encodeURIComponent(deptName)}`),
          get(`/reports/overdue?department=${encodeURIComponent(deptName)}`),
        ])

        setDeptCompliance(complianceData)
        setNqList(nqData)
        setOverdue(overdueData)
      } catch (err) {
        console.error('Failed to load HOD dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const deptName = currentUser?.department || 'Department'
  const compScore = deptCompliance?.compliance_score ?? 0
  const completedCount = deptCompliance?.completed ?? 0
  const totalCount = deptCompliance?.total_assignments ?? 0

  return (
    <div className='space-y-6'>
      <RoleHero 
        eyebrow={`${deptName} command view`}
        title='Track department training compliance and qualification readiness.' 
        description='The HOD console shows real-time training progress, critical NQ alerts, and overdue compliance items for your team.' 
        ctaPrimary='Review weak topics' 
        ctaSecondary='Open qualification'
        onCtaPrimaryClick={() => navigate('/hod/reports')}
        onCtaSecondaryClick={() => navigate('/hod/qualification')}
      />

      {/* Metrics */}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard 
          label='Department compliance' 
          value={loading ? '…' : `${compScore}%`} 
          hint={`${completedCount} of ${totalCount} completed`} 
          trend={compScore >= 90 ? 'Excellent' : compScore >= 80 ? 'Good' : 'Needs attention'} 
        />
        <MetricCard 
          label='NQ Employees' 
          value={loading ? '…' : String(nqList.length)} 
          hint='Repeated weak profiles needing OJT' 
        />
        <MetricCard 
          label='Overdue training' 
          value={loading ? '…' : String(overdue.length)} 
          hint='Assignments past due date' 
        />
        <MetricCard 
          label='Active employees' 
          value={loading ? '…' : String(deptCompliance?.employees ?? 0)} 
          hint={`Total enrolled in ${deptName}`} 
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        {/* Department Concerns */}
        <Card>
          <SectionHeader eyebrow='Current concerns' title='Overdue assignments' description='Urgent training tasks to follow up with team members.' />
          <CardContent className='mt-6 space-y-4'>
            {loading ? (
              <div className='flex justify-center py-8'><div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500' /></div>
            ) : overdue.length === 0 ? (
              <div className='flex flex-col items-center py-8 text-slate-500 gap-1.5'>
                <CheckCircle className='h-8 w-8 text-emerald-400' />
                <p className='text-sm'>All team members are fully compliant!</p>
              </div>
            ) : (
              overdue.slice(0, 4).map(item => (
                <div key={item.assignment_id} className='rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='font-medium text-white text-sm'>{item.full_name}</p>
                      <p className='text-xs text-slate-400'>{item.training_type?.replace(/_/g, ' ').toUpperCase()}</p>
                    </div>
                    <Badge variant='warning'>{item.days_overdue}d overdue</Badge>
                  </div>
                  <p className='text-xs text-slate-400 font-mono'>{item.document_code} — {item.document_title}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Qualification Snapshot */}
        <Card>
          <SectionHeader eyebrow='Readiness map' title='NQ / Blocked profiles' description='Employees currently restricted due to assessment failures.' />
          <CardContent className='mt-6 space-y-4'>
            {loading ? (
              <div className='flex justify-center py-8'><div className='h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500' /></div>
            ) : nqList.length === 0 ? (
              <div className='flex flex-col items-center py-8 text-slate-500 gap-1.5'>
                <CheckCircle className='h-8 w-8 text-emerald-400' />
                <p className='text-sm'>No NQ or blocked employees in your department.</p>
              </div>
            ) : (
              nqList.slice(0, 4).map(item => (
                <div key={item.user_id} className='rounded-3xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='font-medium text-white text-sm'>{item.full_name} <span className='text-xs text-slate-400'>({item.employee_code})</span></p>
                      <p className='text-xs text-slate-400'>Avg MCQ score: {item.avg_score}%</p>
                    </div>
                    <Badge variant='danger'>{item.critical_weak_topics} weak topics</Badge>
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
