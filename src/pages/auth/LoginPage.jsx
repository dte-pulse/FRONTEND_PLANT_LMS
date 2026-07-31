import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import apiClient from '@/api/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  useEffect(() => {
    if (token && user) {
      navigate(`/${user.role}`, { replace: true })
    }
  }, [token, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeCode || !password) {
      toast.error('Please enter employee code and password')
      return
    }

    setSubmitting(true)
    try {
      const response = await apiClient.post('/auth/login', {
        employee_code: employeeCode,
        password: password
      })
      
      const { access_token, role } = response.data
      
      // Save token temporarily so fetchUser can read it
      localStorage.setItem('pulse_lms_token', access_token)
      
      // Fetch user details
      const userResponse = await apiClient.get('/users/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      
      setAuth({
        user: userResponse.data,
        token: access_token,
        role: role
      })

      toast.success('Successfully logged in!')
      navigate(`/${role}`, { replace: true })
    } catch (error) {
      console.error(error)
      localStorage.removeItem('pulse_lms_token')
      const message = error.response?.data?.detail || 'Login failed. Please check credentials.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-[#0B0F17] px-4 py-10 text-white font-sans selection:bg-indigo-500 selection:text-white'>
      <div className='grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]'>
        <div className='rounded-3xl border border-slate-800/80 bg-[#131825] p-8 shadow-xl backdrop-blur-xl md:p-10 flex flex-col justify-center'>
          <div className='inline-flex self-start items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300'>
            <Sparkles className='h-4 w-4' />
            AI-guided pharmaceutical training
          </div>
          <h1 className='mt-6 max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl text-white'>Train faster, audit better, and keep every SOP learning journey measurable.</h1>
          <p className='mt-4 max-w-2xl text-xs md:text-sm leading-relaxed text-slate-400'>A premium LMS console for Admin, HOD, Trainer, and Trainee workflows with document-grounded learning, compliance alerts, and qualification tracking.</p>
        </div>

        <div className='rounded-3xl border border-slate-800/80 bg-[#161C2C] p-8 shadow-xl backdrop-blur-xl md:p-10 flex flex-col justify-center'>
          <div className='mb-6 flex items-center gap-3'>
            <div className='rounded-xl bg-indigo-600/20 p-2.5 text-indigo-300 border border-indigo-500/30'>
              <ShieldCheck className='h-5 w-5' />
            </div>
            <div>
              <p className='text-sm font-bold text-white'>Secure Login</p>
              <p className='text-xs text-slate-400'>Use your employee code and password</p>
            </div>
          </div>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div>
              <label className='mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400'>Employee Code</label>
              <Input 
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder='PLANT-EMP-001' 
                disabled={submitting}
              />
            </div>
            <div>
              <label className='mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400'>Password</label>
              <Input 
                type='password' 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter password' 
                disabled={submitting}
              />
            </div>
            <div className="text-right mt-1 mb-2">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <Button 
              className='w-full cursor-pointer mt-2' 
              size='lg' 
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Entering Workspace...' : 'Enter Workspace'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

