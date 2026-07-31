import { useState, useEffect } from 'react'
import { get, post } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '@/components/ui/table'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import {
  CalendarDays, CheckCircle, AlertTriangle, RefreshCw, Plus,
  Users, Clock, X, MapPin, FileText
} from 'lucide-react'

const STATUS_BADGE = {
  approved:            { variant: 'success',   label: 'Approved' },
  pending:             { variant: 'warning',   label: 'Pending Approval' },
  reschedule_required: { variant: 'danger',    label: 'Reschedule Required' },
  completed:           { variant: 'secondary', label: 'Completed' },
}

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [approvingId, setApprovingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lowAttendanceEvents, setLowAttendanceEvents] = useState([])

  // New event form
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'need_based',
    calendar_type: 'department',
    location: '',
    start_time: '',
    end_time: '',
    planned_attendees: 10,
  })

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/calendar/events')
      const data = response.data || []
      setEvents(data)

      // Detect low-attendance events: attendance < 70% of planned
      const lowAttn = data.filter(e =>
        e.actual_attendees != null &&
        e.planned_attendees > 0 &&
        (e.actual_attendees / e.planned_attendees) < 0.7
      )
      setLowAttendanceEvents(lowAttn)
    } catch {
      // fallback to /calendar/upcoming if /calendar/events fails
      try {
        const response = await apiClient.get('/calendar/upcoming')
        setEvents(response.data || [])
      } catch {
        toast.error('Failed to load department calendar')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  const handleApprove = async (eventId) => {
    setApprovingId(eventId)
    try {
      await apiClient.post(`/calendar/events/${eventId}/approve`)
      toast.success('Training session approved!')
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, status: 'approved' } : e
      ))
    } catch {
      toast.error('Failed to approve event')
    } finally {
      setApprovingId(null)
    }
  }

  const handleCreateEvent = async (ev) => {
    ev.preventDefault()
    if (!form.title || !form.start_time || !form.end_time) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post('/calendar/events', {
        ...form,
        planned_attendees: Number(form.planned_attendees),
      })
      toast.success('Need-based training session scheduled!')
      setShowModal(false)
      setForm({ title: '', description: '', event_type: 'need_based', calendar_type: 'department', location: '', start_time: '', end_time: '', planned_attendees: 10 })
      fetchEvents()
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create event')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (evt) => {
    const isPast = new Date(evt.end_time) < new Date()
    if (isPast && !evt.status) return <Badge variant="secondary">Completed</Badge>
    const meta = STATUS_BADGE[evt.status] || { variant: 'secondary', label: evt.status || 'Pending' }
    return <Badge variant={meta.variant}>{meta.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl font-bold text-white">Department Training Calendar</CardTitle>
            <CardDescription className="text-slate-400">Review planned sessions, monitor attendance, and approve or schedule training events.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="cursor-pointer" onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Schedule Need-Based
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-500 py-20">
              <CalendarDays className="h-16 w-16 mb-4 stroke-[1]" />
              <p>No upcoming events in the calendar.</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300">
                + Schedule your first session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableRoot>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="text-slate-300">Date &amp; Time</TableHeader>
                      <TableHeader className="text-slate-300">Session Title</TableHeader>
                      <TableHeader className="text-slate-300">Location</TableHeader>
                      <TableHeader className="text-slate-300">Attendees</TableHeader>
                      <TableHeader className="text-slate-300">Status</TableHeader>
                      <TableHeader className="text-slate-300 text-right">Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((evt) => {
                      const isPast = new Date(evt.end_time) < new Date()
                      const attendancePct = evt.planned_attendees > 0 && evt.actual_attendees != null
                        ? Math.round((evt.actual_attendees / evt.planned_attendees) * 100) : null
                      return (
                        <TableRow key={evt.id} className="hover:bg-white/5 transition-colors">
                          <TableCell className="font-semibold text-white">
                            <p>{new Date(evt.start_time).toLocaleDateString([], { dateStyle: 'medium' })}</p>
                            <p className="text-xs text-slate-400">{new Date(evt.start_time).toLocaleTimeString([], { timeStyle: 'short' })}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-slate-200 font-medium">{evt.title}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{evt.description}</p>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {evt.location || 'TBD'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {evt.planned_attendees != null ? (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-xs text-slate-300">
                                  {evt.actual_attendees ?? '—'}/{evt.planned_attendees}
                                  {attendancePct != null && (
                                    <span className={`ml-1 ${attendancePct < 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                                      ({attendancePct}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(evt)}</TableCell>
                          <TableCell className="text-right">
                            {!isPast && evt.status !== 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(evt.id)}
                                disabled={approvingId === evt.id}
                                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20"
                              >
                                {approvingId === evt.id ? 'Approving...' : <><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve</>}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </TableRoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Attendance Alerts ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Attendance Alerts
            {lowAttendanceEvents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">
                {lowAttendanceEvents.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowAttendanceEvents.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>All sessions met the 70% attendance threshold. No rescheduling required.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {lowAttendanceEvents.map(evt => {
                const pct = Math.round((evt.actual_attendees / evt.planned_attendees) * 100)
                return (
                  <div key={evt.id} className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-amber-200 font-semibold text-sm">{evt.title}</p>
                        <p className="text-amber-300/70 text-xs mt-0.5">
                          {new Date(evt.start_time).toLocaleDateString([], { dateStyle: 'medium' })} · {evt.location || 'No location'}
                        </p>
                      </div>
                      <span className="text-red-400 font-bold text-sm flex-shrink-0">{pct}% attended</span>
                    </div>
                    <p className="text-amber-300/80 text-xs mt-2">
                      <strong>Below 70% threshold:</strong> Only {evt.actual_attendees} of {evt.planned_attendees} planned attendees were present. Rescheduling is recommended.
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Schedule Need-Based Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-600/20 p-3 text-indigo-300 border border-indigo-500/30">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Schedule Training Session</h2>
                  <p className="text-sm text-slate-400">Add a need-based or planned training event to the calendar.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Session Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="cGMP Refresher Training"
                  required
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Training session objective..."
                  rows={2}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Event Type</label>
                  <select
                    value={form.event_type}
                    onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  >
                    <option value="need_based">Need-Based</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="cgmp_refresher">cGMP Refresher</option>
                    <option value="induction">Induction</option>
                    <option value="sop_training">SOP Training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Location</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Training Room A"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Start Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    required
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">End Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    required
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Planned Attendees</label>
                <input
                  type="number"
                  min="1"
                  value={form.planned_attendees}
                  onChange={e => setForm(f => ({ ...f, planned_attendees: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xs">
                  {submitting ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? 'Scheduling…' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
