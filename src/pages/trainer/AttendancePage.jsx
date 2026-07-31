import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle, XCircle, RefreshCw, Save, AlertTriangle, MapPin, BookOpen, MessageSquare } from 'lucide-react'

export default function AttendancePage() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkingReschedule, setCheckingReschedule] = useState(false)

  // Session-level metadata (patched back to the event)
  const [sessionMeta, setSessionMeta] = useState({ venue: '', material_ref: '', trainer_remarks: '' })
  const [thresholdBreached, setThresholdBreached] = useState(false)

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/calendar/events')
      setEvents(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load training sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const selectEvent = async (event) => {
    setSelectedEvent(event)
    setSessionMeta({
      venue: event.venue || '',
      material_ref: event.material_ref || '',
      trainer_remarks: event.trainer_remarks || '',
    })
    setThresholdBreached(event.attendance_threshold_breached || false)
    setLoadingDetails(true)
    try {
      const response = await apiClient.get(`/attendance/event/${event.id}`)
      setAttendees(response.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load attendees')
    } finally {
      setLoadingDetails(false)
    }
  }

  const toggleAttendance = (index, field) => {
    const updated = [...attendees]
    updated[index][field] = !updated[index][field]
    setAttendees(updated)
  }

  const handleSaveAttendance = async () => {
    setSaving(true)
    try {
      // 1. Patch session metadata fields back to the event
      await apiClient.patch(`/calendar/events/${selectedEvent.id}`, {
        venue: sessionMeta.venue || null,
        material_ref: sessionMeta.material_ref || null,
        trainer_remarks: sessionMeta.trainer_remarks || null,
      })

      // 2. Submit attendance per trainee
      for (const attendee of attendees) {
        await apiClient.post(`/attendance/event/${selectedEvent.id}`, {
          user_id: attendee.user_id,
          is_present: attendee.is_present,
        })
      }

      // 3. Auto-check threshold
      const res = await apiClient.post(`/calendar/events/${selectedEvent.id}/reschedule-check`)
      if (res.data.reschedule_required) {
        setThresholdBreached(true)
        toast.warning('Attendance below 70% — reschedule flag set on this event.', { duration: 6000 })
      } else {
        setThresholdBreached(false)
      }

      toast.success('Attendance & session metadata saved!')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save attendance records')
    } finally {
      setSaving(false)
    }
  }

  const handleInitiateReschedule = async () => {
    setCheckingReschedule(true)
    try {
      const res = await apiClient.post(`/calendar/events/${selectedEvent.id}/reschedule-check`)
      setThresholdBreached(res.data.reschedule_required)
      if (res.data.reschedule_required) {
        toast.warning('Threshold breach confirmed. Please update the event date via calendar.', { duration: 6000 })
      } else {
        toast.success('Attendance meets the 70% threshold — no reschedule needed.')
      }
    } catch {
      toast.error('Failed to check reschedule status')
    } finally {
      setCheckingReschedule(false)
    }
  }

  const presentCount = attendees.filter(a => a.is_present).length

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        {/* Left Column: Events */}
        <Card>
          <CardHeader className="pb-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold text-white">My Sessions</CardTitle>
                <CardDescription className="text-slate-400">Select an event to mark attendance</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center text-slate-500 py-10">No upcoming sessions assigned to you.</div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => selectEvent(evt)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-colors ${
                      selectedEvent?.id === evt.id
                        ? 'border-cyan-400/50 bg-cyan-400/10'
                        : 'border-white/10 bg-slate-900/60 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{evt.title}</h4>
                      <div className="flex items-center gap-2">
                        {evt.attendance_threshold_breached && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        <Badge variant="default">{new Date(evt.start_time).toLocaleDateString()}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 truncate">{evt.description}</p>
                    <div className="flex items-center text-xs text-slate-500 gap-2">
                      <CalendarDays className="h-3 w-3" />
                      {evt.venue || evt.location || 'Venue TBD'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Attendance Sheet + Session Metadata */}
        <div className="space-y-4">
          {/* Threshold Warning Banner */}
          {thresholdBreached && selectedEvent && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300">Attendance Below 70%</p>
                <p className="text-xs text-amber-400/80">This session has been flagged for rescheduling due to low turnout.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex-shrink-0"
                onClick={handleInitiateReschedule}
                disabled={checkingReschedule}
              >
                {checkingReschedule ? 'Checking…' : 'Re-check'}
              </Button>
            </div>
          )}

          {/* Session Metadata Card */}
          {selectedEvent && (
            <Card>
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-base font-semibold text-white">Session Details</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Fill in venue, material, and remarks before saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Venue / Room
                  </label>
                  <input
                    type="text"
                    value={sessionMeta.venue}
                    onChange={e => setSessionMeta(m => ({ ...m, venue: e.target.value }))}
                    placeholder="e.g. Training Room B, Lab 3"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> Material Reference
                  </label>
                  <input
                    type="text"
                    value={sessionMeta.material_ref}
                    onChange={e => setSessionMeta(m => ({ ...m, material_ref: e.target.value }))}
                    placeholder="e.g. SOP-QA-001, Slide Deck v2"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/40"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> Trainer Remarks
                  </label>
                  <textarea
                    value={sessionMeta.trainer_remarks}
                    onChange={e => setSessionMeta(m => ({ ...m, trainer_remarks: e.target.value }))}
                    placeholder="Post-session observations, issues, or notes..."
                    rows={2}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/40 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attendance Sheet Card */}
          <Card>
            <CardHeader className="pb-4 border-b border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold text-white">Attendance Sheet</CardTitle>
                  <CardDescription className="text-slate-400">
                    {selectedEvent
                      ? `${selectedEvent.title} · ${presentCount}/${attendees.length} present`
                      : 'Select a session first'}
                  </CardDescription>
                </div>
                {selectedEvent && attendees.length > 0 && (
                  <Button onClick={handleSaveAttendance} disabled={saving} className="bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-600">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {!selectedEvent ? (
                <div className="flex flex-col items-center justify-center text-slate-500 py-20">
                  <CalendarDays className="h-16 w-16 mb-4 stroke-[1]" />
                  <p>Select a session from the list to view its roster.</p>
                </div>
              ) : loadingDetails ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center text-slate-500 py-20">No trainees enrolled for this session.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableRoot>
                      <TableHead>
                        <TableRow>
                          <TableHeader className="text-slate-300">Trainee Name</TableHeader>
                          <TableHeader className="text-center text-slate-300">Present</TableHeader>
                          <TableHeader className="text-center text-slate-300">Material Handed</TableHeader>
                          <TableHeader className="text-slate-300">Comments</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendees.map((attendee, idx) => (
                          <TableRow key={attendee.user_id} className="hover:bg-white/5 transition-colors">
                            <TableCell className="font-semibold text-white">
                              {attendee.user_name}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => toggleAttendance(idx, 'is_present')}
                                className={`p-1.5 rounded-full transition-colors ${attendee.is_present ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-800'}`}
                              >
                                {attendee.is_present ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => toggleAttendance(idx, 'material_used')}
                                className={`p-1.5 rounded-full transition-colors ${attendee.material_used ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-500 bg-slate-800'}`}
                              >
                                {attendee.material_used ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                              </button>
                            </TableCell>
                            <TableCell>
                              <input
                                type="text"
                                value={attendee.comments || ''}
                                onChange={(e) => {
                                  const updated = [...attendees]
                                  updated[idx].comments = e.target.value
                                  setAttendees(updated)
                                }}
                                placeholder="Optional remarks..."
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </TableRoot>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
