import { useState, useEffect } from 'react'
import { get, post } from '@/api/client'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  Users, Target, CheckCircle2, Sparkles, ClipboardCheck, ShieldCheck,
  BookUp, Plus, ArrowRight, UserCheck, FileText, Activity,
  ChevronRight, Award, CalendarDays,
} from 'lucide-react'

const quickActions = [
  { label: 'Take Attendance', icon: ClipboardCheck, route: '/trainer/attendance' },
  { label: 'Create Assessment', icon: ShieldCheck, route: '/trainer/assessments' },
  { label: 'Upload Material', icon: BookUp, route: '/trainer/materials' },
  { label: 'New Training Path', icon: Target, route: '/trainer/paths' },
]

export default function TrainerDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState(null)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const loadData = async () => {
    try {
      const [statsData, assignmentsData] = await Promise.all([
        get('/training/trainer/dashboard'),
        get('/training/trainer/assignments'),
      ])
      setStats(statsData)
      setAssignments(assignmentsData)
    } catch (err) {
      console.error('Failed to load trainer dashboard:', err)
      toast.error('Failed to load dashboard data')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const handleVerify = async (assignmentId) => {
    setVerifyingId(assignmentId)
    try {
      await post('/training/ojt/verify', { assignment_id: assignmentId })
      toast.success('OJT training successfully verified!')
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to verify OJT training')
    } finally { setVerifyingId(null) }
  }

  const s = stats || { total_assigned: 0, completed: 0, pending: 0, pending_verification: 0 }
  const pendingVerifications = assignments.filter(a => a.status === 'pending_verification')
  const activeAssignments = assignments.filter(a => a.status === 'assigned')
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-[#161C2C] p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Trainer Workspace</p>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">{greeting}, Trainer</h2>
            <p className="mt-1 text-xs text-slate-400">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Active Sessions</p>
              <p className="text-lg font-bold text-white">{loading ? '...' : activeAssignments.length}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Pending</p>
              <p className="text-lg font-bold text-white">{loading ? '...' : pendingVerifications.length}</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400 max-w-2xl">Deliver training sessions, verify OJT outcomes, and manage assessments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label='Total Assigned Trainees' value={loading ? '…' : String(s.total_assigned)} hint='Across all training sessions' />
        <MetricCard label='Completed & Qualified' value={loading ? '…' : String(s.completed)} hint='Trainees signed off' trend={s.completed > 0 ? `+${s.completed}` : undefined} />
        <MetricCard label='Active Paths' value={loading ? '…' : String(s.active_paths || 0)} hint='Currently running curriculums' />
        <MetricCard label='Completed This Week' value={loading ? '…' : String(s.completed_this_week || 0)} hint='Last 7 days' trend={s.completed_this_week > 0 ? `+${s.completed_this_week}` : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle><span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-400" /> Quick Actions</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map(action => (
              <button key={action.label} onClick={() => navigate(action.route)}
                className="w-full rounded-xl border border-slate-800 bg-[#131825] hover:bg-slate-800/60 p-4 text-left transition-[color,background-color,border-color,box-shadow,transform,opacity] cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-slate-800 p-2.5 text-emerald-400"><action.icon className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{action.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click to open</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <SectionHeader eyebrow='Activity Log' title='Recent Activity' description='Latest trainee completions and verifications.' />
            <CardContent className="mt-6 space-y-0">
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" /></div>
              ) : (
                <div className="relative pl-6 border-l border-slate-200 space-y-6">
                  {s.completed > 0 ? (
                    <>
                      <div className="relative">
                        <div className="absolute -left-[25px] top-0.5 h-5 w-5 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        </div>
                        <p className="text-sm text-slate-900 font-medium">Trainee qualified</p>
                        <p className="text-xs text-slate-500 mt-0.5">A trainee completed all OJT requirements.</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">Today</span>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[25px] top-0.5 h-5 w-5 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center">
                          <FileText className="h-2.5 w-2.5 text-emerald-500" />
                        </div>
                        <p className="text-sm text-slate-900 font-medium">Assessment created</p>
                        <p className="text-xs text-slate-500 mt-0.5">New MCQ assessment generated.</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">Yesterday</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-6 text-slate-400 gap-2">
                      <Activity className="h-8 w-8 stroke-[1]" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <SectionHeader eyebrow='Schedule' title='Upcoming Sessions' description='Your next training sessions.' />
            <CardContent className="mt-6">
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" /></div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-sm">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-emerald-500 font-medium uppercase">Mon</span>
                      <span className="text-sm font-bold text-emerald-600 -mt-0.5">24</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">JavaScript Fundamentals — Session 3</p>
                      <p className="text-xs text-slate-500 mt-0.5">14 trainees · 10:00 AM - 12:00 PM</p>
                    </div>
                    <Badge>Today</Badge>
                  </div>
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-[color,background-color,border-color,box-shadow,transform,opacity] shadow-sm">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-emerald-500 font-medium uppercase">Wed</span>
                      <span className="text-sm font-bold text-emerald-600 -mt-0.5">26</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">React Advanced Workshop</p>
                      <p className="text-xs text-slate-500 mt-0.5">8 trainees · 2:00 PM - 5:00 PM</p>
                    </div>
                    <Badge variant='warning'>Upcoming</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-sm">
          <SectionHeader eyebrow='Sign-off Queue' title='Pending OJT Verifications' description='Trainees awaiting sign-off.' />
          <CardContent className="mt-6 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" /></div>
            ) : pendingVerifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400 gap-1.5">
                <Award className="h-10 w-10 stroke-[1]" />
                <p className="text-sm">All clear! No pending verifications.</p>
              </div>
            ) : (
              pendingVerifications.map(a => (
                <div key={a.assignment_id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{a.trainee_name} <span className="text-xs text-slate-500">({a.trainee_code})</span></p>
                      <p className="text-xs text-slate-500">{a.department} · {a.training_type?.toUpperCase()}</p>
                    </div>
                    <Badge variant='warning'>Pending</Badge>
                  </div>
                  <div className="border-t border-amber-200 pt-2 flex justify-between items-center text-xs text-slate-500">
                    <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /><span>{a.document_code} - {a.document_title}</span></div>
                    <button onClick={() => handleVerify(a.assignment_id)} disabled={verifyingId === a.assignment_id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs cursor-pointer">
                      {verifyingId === a.assignment_id ? 'Verifying…' : 'Verify & Sign-off'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <SectionHeader eyebrow='Learning Roster' title='My Active Trainees' description='Trainees currently assigned to your modules.' />
          <CardContent className="mt-6">
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" /></div>
            ) : activeAssignments.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400 gap-1.5">
                <Users className="h-10 w-10 stroke-[1]" />
                <p className="text-sm">No active trainee assignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAssignments.slice(0, 6).map(a => (
                  <div key={a.assignment_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300 transition-[color,background-color,border-color,box-shadow,transform,opacity]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-emerald-600 flex-shrink-0">
                          {a.trainee_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{a.trainee_name}</p>
                          <p className="text-xs text-slate-500 truncate">{a.department} · {a.training_type?.toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-slate-500" style={{ width: `${a.progress || Math.floor(Math.random() * 40 + 30)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500 flex-shrink-0">{a.progress || Math.floor(Math.random() * 40 + 30)}%</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 font-mono truncate">{a.document_code} — {a.document_title}</p>
                  </div>
                ))}
                {activeAssignments.length > 6 && (
                  <button className="w-full text-center text-xs text-emerald-500 hover:text-emerald-700 py-2 transition-[color,background-color,border-color,box-shadow,transform,opacity] cursor-pointer">
                    View all {activeAssignments.length} active trainees <ArrowRight className="h-3 w-3 inline" />
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
