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
  const reconnectTimeoutRef = useRef(null)
  const isConnectingRef = useRef(false)

  const fetchNotifications = async () => {
    try {
      const data = await get('/notifications')
      setNotifications(Array.isArray(data) ? data : [])
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch {
      // silent fail
    }
  }

  const connectSSE = async () => {
    const token = localStorage.getItem('pulse_lms_token')
    if (!token) return

    // Prevent duplicate connection attempts
    if (esRef.current || isConnectingRef.current) return
    isConnectingRef.current = true

    try {
      // VULN-009 fix: exchange the JWT (via Authorization header) for a
      // single-use stream ticket instead of putting the JWT in the URL.
      const { post } = await import('@/api/client')
      const ticketRes = await post('/notifications/stream-ticket')
      const ticket = ticketRes?.ticket
      if (!ticket) {
        isConnectingRef.current = false
        startPolling()
        return
      }
      const es = new EventSource(`${BASE_URL}/notifications/stream?ticket=${encodeURIComponent(ticket)}`)
      esRef.current = es

      es.onopen = () => {
        setConnected(true)
        isConnectingRef.current = false
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.event === 'new_notification') {
            setUnreadCount(data.unread_count)
            fetchNotifications() // fetch updated full list
          } else if (data.event === 'init') {
            setUnreadCount(data.unread_count)
          }
        } catch { }
      }

      es.onerror = () => {
        setConnected(false)
        isConnectingRef.current = false
        if (esRef.current) {
          esRef.current.close()
          esRef.current = null
        }
        
        // Throttled fallback to prevent tight error looping
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            startPolling()
          }, 5000) // wait 5 seconds before switching to polling
        }
      }
    } catch {
      isConnectingRef.current = false
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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  useEffect(() => {
    fetchNotifications()
    connectSSE()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      stopPolling()
    }
  }, [])

  return { unreadCount, notifications, connected, refetch: fetchNotifications }
}

