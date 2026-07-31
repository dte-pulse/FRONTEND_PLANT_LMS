/**
 * useNotifications — SSE hook for real-time notification count.
 * Falls back to polling if SSE fails (e.g., nginx proxy without streaming support).
 */
import { useState, useEffect, useRef } from 'react'
import { get } from '@/api/client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef(null)
  const pollRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      const data = await get('/notifications')
      setNotifications(Array.isArray(data) ? data : [])
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch {
      // silent fail
    }
  }

  const connectSSE = () => {
    const token = localStorage.getItem('pulse_lms_token')
    if (!token) return

    try {
      const es = new EventSource(`${BASE_URL}/notifications/stream?token=${token}`)
      esRef.current = es

      es.onopen = () => setConnected(true)

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'new_notification') {
            setUnreadCount(data.unread_count)
          } else if (data.event === 'init') {
            setUnreadCount(data.unread_count)
          }
        } catch { }
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        esRef.current = null
        // Fall back to polling every 30s
        startPolling()
      }
    } catch {
      startPolling()
    }
  }

  const startPolling = () => {
    if (pollRef.current) return
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, 30000)
  }

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    fetchNotifications()
    connectSSE()
    return () => {
      esRef.current?.close()
      stopPolling()
    }
  }, [])

  return { unreadCount, notifications, connected, refetch: fetchNotifications }
}
