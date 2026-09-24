import { useState, useRef, useEffect } from 'react'
import { Bell, BellDot, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { post } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'

export function NotifBell() {
  const [open, setOpen] = useState(false)
  const role = useAuthStore((state) => state.role)
  const navigate = useNavigate()
  const dropRef = useRef(null)
  const { unreadCount, notifications, refetch } = useNotifications()

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    try {
      await post('/notifications/mark-all-read', {})
      refetch()
    } catch { /* silent */ }
  }

  const markOne = async (id) => {
    try {
      await post(`/notifications/${id}/read`, {})
      refetch()
    } catch { /* silent */ }
  }

  const recentNotifs = notifications.slice(0, 8)

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-all shadow-xs"
        title="Notifications"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-controls='notifications-panel'
      >
        {unreadCount > 0 ? <BellDot className="h-4 w-4 text-indigo-400" /> : <Bell className="h-4 w-4 text-slate-300" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center border border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section id='notifications-panel' role='dialog' aria-label='Notifications' className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
            {recentNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-xs">
                <Bell className="h-8 w-8 mx-auto mb-2 stroke-[1]" />
                No notifications
              </div>
            ) : recentNotifs.map(n => (
              <button key={n.id}
                type="button"
                className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors cursor-pointer ${!n.is_read ? 'bg-indigo-500/10' : ''}`}
                onClick={() => !n.is_read && markOne(n.id)}
              >
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${!n.is_read ? 'text-white' : 'text-slate-400'}`}>{n.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          {role === 'admin' && (
            <div className="px-4 py-2.5 border-t border-slate-800 bg-[#161C2C]">
              <button
                onClick={() => { navigate('/admin/notifications'); setOpen(false) }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                View all notifications →
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
