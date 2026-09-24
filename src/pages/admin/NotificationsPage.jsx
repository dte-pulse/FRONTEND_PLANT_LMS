import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, RefreshCw, CheckCircle2, CheckCheck, Info, AlertTriangle, AlertCircle, Zap } from 'lucide-react'
import apiClient from '@/api/client'
import { toast } from 'sonner'

const TYPE_META = {
  info:         { icon: Info,          color: 'text-cyan-400',    bg: 'bg-cyan-400/10',    label: 'INFO' },
  warning:      { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-400/10',   label: 'WARNING' },
  error:        { icon: AlertCircle,   color: 'text-red-400',     bg: 'bg-red-400/10',     label: 'ERROR' },
  success:      { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'SUCCESS' },
  document_ready:{ icon: Zap,          color: 'text-violet-400',  bg: 'bg-violet-400/10',  label: 'DOCUMENT' },
  retraining:   { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-400/10',   label: 'RETRAIN' },
}

const getMeta = (type) => TYPE_META[type] || TYPE_META['info']

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [filter, setFilter] = useState('all')

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/notifications')
      setNotifications(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markOneRead = async (notifId) => {
    setMarkingId(notifId)
    try {
      await apiClient.post(`/notifications/${notifId}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      )
    } catch {
      toast.error('Failed to mark notification as read')
    } finally {
      setMarkingId(null)
    }
  }

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !n.is_read)
      : notifications.filter(n => n.type === filter)

  const allTypes = [...new Set(notifications.map(n => n.type).filter(Boolean))]

  return (
    <div className="space-y-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10">
          <div>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" />
              Notification Center
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">System alerts, training events, and document processing updates.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchNotifications} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllRead} className="gap-2">
                <CheckCheck className="h-4 w-4" /> Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filter Row */}
        <div className="flex gap-2 px-6 py-3 border-b border-white/10 overflow-x-auto">
          {['all', 'unread', ...allTypes].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] capitalize ${
                filter === f
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              {f === 'all' ? `All (${notifications.length})` : f === 'unread' ? `Unread (${unreadCount})` : f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-500 py-20">
              <Bell className="h-16 w-16 mb-4 stroke-[1]" />
              <p>{filter === 'unread' ? 'No unread notifications — you\'re all caught up!' : 'No notifications.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((notif) => {
                const meta = getMeta(notif.notification_type)
                const Icon = meta.icon
                return (
                  <div
                    key={notif.id}
                    className={`p-5 transition-colors flex gap-4 ${!notif.is_read ? 'bg-cyan-400/5 hover:bg-cyan-400/8' : 'hover:bg-white/5'}`}
                  >
                    {/* Type icon */}
                    <div className={`flex-shrink-0 mt-0.5 ${meta.bg} p-2 rounded-xl h-fit`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm leading-snug ${!notif.is_read ? 'text-white font-semibold' : 'text-slate-300'}`}>
                          {notif.title}
                        </p>
                        <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-3 pt-1">
                        {notif.notification_type && (
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {notif.notification_type.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {!notif.is_read && (
                          <button
                            onClick={() => markOneRead(notif.id)}
                            disabled={markingId === notif.id}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {markingId === notif.id ? 'Marking…' : 'Mark read'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Unread dot */}
                    <div className={`flex-shrink-0 mt-2 h-2 w-2 rounded-full ${!notif.is_read ? 'bg-cyan-400' : 'bg-transparent'}`} />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
