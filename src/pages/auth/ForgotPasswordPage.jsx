import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import apiClient from '@/api/client'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email') // 'email' | 'otp' | 'reset'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your registered email address')
      return
    }

    setSubmitting(true)
    try {
      const response = await apiClient.post('/auth/forgot-password', { email })
      toast.success(response.data?.message || 'OTP sent to your email address!')
      setStep('otp')
    } catch (error) {
      console.error(error)
      toast.error('Failed to request OTP. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp) {
      toast.error('Please enter the OTP sent to your email')
      return
    }

    setSubmitting(true)
    try {
      const response = await apiClient.post('/auth/verify-otp', { email, otp })
      toast.success(response.data?.message || 'OTP verified successfully!')
      setStep('reset')
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.detail || 'Invalid OTP. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setSubmitting(true)
    try {
      const response = await apiClient.post('/auth/reset-password', { email, otp, new_password: newPassword })
      toast.success(response.data?.message || 'Password reset successfully! Please log in.')
      navigate('/')
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.detail || 'Failed to reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-[#0B0F17] px-4 py-10 text-white font-sans selection:bg-indigo-500 selection:text-white'>
      <div className='w-full max-w-md rounded-3xl border border-slate-800/80 bg-[#161C2C] p-8 shadow-xl backdrop-blur-xl md:p-10'>
        <div className='mb-6 flex flex-col items-center text-center'>
          <div className='rounded-xl bg-indigo-600/20 p-3.5 text-indigo-300 border border-indigo-500/30 mb-3'>
            {step === 'email' && <Mail className='h-7 w-7' />}
            {step === 'otp' && <ShieldCheck className='h-7 w-7' />}
            {step === 'reset' && <KeyRound className='h-7 w-7' />}
          </div>
          <h2 className='text-xl font-bold text-white'>
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'Create New Password'}
          </h2>
          <p className='mt-1.5 text-xs text-slate-400'>
            {step === 'email' && 'Enter your registered email to receive a reset code.'}
            {step === 'otp' && `We sent a code to ${email}.`}
            {step === 'reset' && 'Please enter your new secure password.'}
          </p>
        </div>

        {step === 'email' && (
          <form className='space-y-4' onSubmit={handleRequestOtp}>
            <div>
              <label className='mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400'>Email Address</label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='john.doe@company.com' 
                disabled={submitting}
              />
            </div>
            <Button className='w-full' size='lg' type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send OTP'}
            </Button>
            <Button variant="ghost" className="w-full text-slate-400" onClick={() => navigate('/')}>
              Back to login
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form className='space-y-4' onSubmit={handleVerifyOtp}>
            <div>
              <label className='mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400'>One-Time Password (OTP)</label>
              <Input 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder='123456' 
                className="text-center tracking-widest font-mono text-lg"
                disabled={submitting}
              />
            </div>
            <Button className='w-full' size='lg' type="submit" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Verify Code'}
            </Button>
            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setStep('email')}>
              Back
            </Button>
          </form>
        )}

        {step === 'reset' && (
          <form className='space-y-4' onSubmit={handleResetPassword}>
            <div>
              <label className='mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400'>New Password</label>
              <Input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='Minimum 6 characters' 
                disabled={submitting}
              />
            </div>
            <Button className='w-full' size='lg' type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Password'}
            </Button>
            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setStep('email')}>
              Back
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
