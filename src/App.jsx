import { useEffect } from 'react'
import { Toaster } from 'sonner'
import AppRoutes from '@/routes'
import { useAuthStore } from '@/store/authStore'

export default function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser)
  const loading = useAuthStore((state) => state.loading)
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (token) {
      fetchUser()
    }
  }, [token, fetchUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          <p className="text-sm tracking-widest text-slate-400 uppercase">Loading Pulse LMS...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppRoutes />
      <Toaster position='top-right' richColors closeButton />
    </>
  )
}
