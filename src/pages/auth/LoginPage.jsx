import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Sprout } from 'lucide-react'
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
    <div className='flex min-h-screen items-center justify-center bg-[#0B0F17] px-4 py-10 text-white font-sans selection:bg-emerald-500 selection:text-white'>
      <div className='grid w-full max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]'>
        <section className='relative overflow-hidden rounded-3xl border border-slate-800/80 bg-[#131825] p-8 shadow-2xl shadow-emerald-950/20 md:p-10 flex flex-col justify-center'>
          <div className='pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl' />
          <div className='relative inline-flex self-start items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-emerald-300'>
            <Sprout className='h-4 w-4' aria-hidden='true' />
            Controlled plant learning
          </div>
          <h1 className='relative mt-6 max-w-2xl text-balance text-3xl font-bold leading-[1.08] tracking-tight md:text-5xl text-white'>Training evidence that stays connected to the plant floor.</h1>
          <p className='relative mt-4 max-w-xl text-sm leading-relaxed text-slate-400'>Use the same workspace to learn controlled documents, track qualification, and see where follow-up is needed.</p>
          <div className='relative mt-8 grid max-w-lg grid-cols-3 gap-3 border-t border-slate-800 pt-5 text-xs'>
            <div><p className='font-semibold text-white'>SOP learning</p><p className='mt-1 text-slate-500'>Grounded content</p></div>
            <div><p className='font-semibold text-white'>Qualification</p><p className='mt-1 text-slate-500'>Clear sign-off</p></div>
            <div><p className='font-semibold text-white'>Readiness</p><p className='mt-1 text-slate-500'>Actionable status</p></div>
          </div>
        </section>

        <section aria-labelledby='login-title' className='rounded-3xl border border-slate-800/80 bg-[#161C2C] p-8 shadow-2xl shadow-slate-950/20 md:p-10 flex flex-col justify-center'>
          <div className='mb-6 flex items-center gap-3'>
            <div className='rounded-xl bg-emerald-600/20 p-2.5 text-emerald-300 border border-emerald-500/30'>
              <ShieldCheck className='h-5 w-5' aria-hidden='true' />
            </div>
            <div>
              <h2 id='login-title' className='text-sm font-bold text-white'>Secure login</h2>
              <p className='text-xs text-slate-400'>Use your employee code and password</p>
            </div>
          </div>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div>
              <label htmlFor='employee-code' className='mb-1.5 block text-xs font-semibold tracking-wide text-slate-400'>Employee code</label>
              <Input 
                id='employee-code'
                name='employeeCode'
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder='e.g. PLANT-EMP-001'
                autoComplete='username'
                spellCheck={false}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor='password' className='mb-1.5 block text-xs font-semibold tracking-wide text-slate-400'>Password</label>
              <Input 
                id='password'
                name='password'
                type='password' 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter your password'
                autoComplete='current-password'
                disabled={submitting}
              />
            </div>
            <div className="text-right mt-1 mb-2">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
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
        </section>
      </div>
    </div>
  )
}
