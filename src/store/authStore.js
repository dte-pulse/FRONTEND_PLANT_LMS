import { create } from 'zustand'
import apiClient from '@/api/client'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('pulse_lms_token') || '',
  role: localStorage.getItem('pulse_lms_role') || '',
  loading: false,
  setAuth: ({ user, token, role }) => {
    localStorage.setItem('pulse_lms_token', token)
    localStorage.setItem('pulse_lms_role', role)
    set({ user, token, role })
  },
  clearAuth: async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('pulse_lms_token')
      localStorage.removeItem('pulse_lms_role')
      set({ user: null, token: '', role: '' })
    }
  },
  fetchUser: async () => {
    const { token } = get()
    if (!token) return null
    set({ loading: true })
    try {
      const response = await apiClient.get('/users/me')
      const user = response.data
      set({ user, role: user.role, loading: false })
      localStorage.setItem('pulse_lms_role', user.role)
      return user
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('pulse_lms_token')
      localStorage.removeItem('pulse_lms_role')
      set({ user: null, token: '', role: '', loading: false })
      return null
    }
  }
}))
