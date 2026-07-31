import { useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { roleNavigation } from '@/data/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { LogOut, ChevronRight, Menu, X } from 'lucide-react'
import { NotifBell } from '@/components/shared/NotifBell'

const roleTitles = {
  admin: 'Admin Control Center',
  hod: 'Department Execution Workspace',
  trainer: 'Training Delivery Workspace',
  trainee: 'Personal Learning Workspace',
}

const roleBadges = {
  admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  hod: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  trainer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  trainee: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
}

export default function RoleShell({ role = 'admin' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const userRole = useAuthStore((state) => state.role)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  if (!token || !user) {
    return <Navigate to="/" replace />
  }

  if (userRole !== role) {
    return <Navigate to={`/${userRole}`} replace />
  }

  const navItems = roleNavigation[role] || []
  const initials = user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'

  const NavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        <div className="pb-5 border-b border-slate-800/80 flex items-center justify-between">
          <Logo />
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleBadges[role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
            {role}
          </span>
        </div>

        <div>
          <div className="mb-3 px-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Navigation Menu</span>
          </div>

          <nav className='space-y-1.5'>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === `/${role}`}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                    <span className="flex-1 truncate">{label}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom User Card */}
      <div className='pt-6 border-t border-slate-800/80 space-y-3.5 mt-auto'>
        <div className='flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner'>
          <div className='w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0'>
            {initials}
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-bold text-slate-100 truncate'>{user.full_name}</p>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mt-0.5">
              <span className="font-mono text-indigo-400">{user.employee_code || 'EMP-ID'}</span>
              <span>•</span>
              <span className="capitalize">{role}</span>
            </div>
          </div>
        </div>

        <button
          onClick={clearAuth}
          className='flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 transition-all duration-200 shadow-xs'
        >
          <LogOut className='h-3.5 w-3.5' />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className='min-h-screen bg-[#0B0F17] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white'>
      {/* Mobile Topbar (< xl screens) */}
      <header className="xl:hidden flex items-center justify-between px-4 py-3 bg-[#0F1420] border-b border-slate-800/80 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          <NotifBell />
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Off-Canvas Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 xl:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-72 bg-[#0F1420] text-slate-200 p-6 flex flex-col justify-between h-full border-r border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </aside>
        </div>
      )}

      <div className='mx-auto grid min-h-screen max-w-[1680px] grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)]'>
        {/* Desktop Sidebar (xl screens and above) */}
        <aside className='hidden xl:flex bg-[#0F1420] text-slate-200 p-6 flex-col justify-between border-r border-slate-800/80 shadow-2xl relative z-20'>
          <NavContent />
        </aside>

        {/* Main Content Area */}
        <main className='p-3 sm:p-4 md:p-6 xl:p-8 flex flex-col justify-between bg-[#0B0F17]'>
          <div className='rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-[#131825] shadow-xl overflow-hidden min-h-[calc(100vh-64px)] flex flex-col'>
            {/* Page Header */}
            <header className='flex flex-col gap-3 border-b border-slate-800/80 px-4 sm:px-6 py-4 md:flex-row md:items-center md:justify-between bg-[#161C2C]/90 backdrop-blur-md'>
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <span className="capitalize font-semibold text-slate-300">{role} Workspace</span>
                  <ChevronRight className="h-3 w-3 text-slate-500" />
                  <span className="text-indigo-400 font-semibold">{roleTitles[role]}</span>
                </div>
                <h2 className='mt-1 text-lg sm:text-xl font-bold tracking-tight text-white'>{roleTitles[role]}</h2>
              </div>
              <div className="hidden xl:flex items-center gap-3">
                <NotifBell />
                <ThemeToggle />
              </div>
            </header>

            {/* View Body */}
            <section className='p-3 sm:p-4 md:p-6 flex-1 text-slate-200 overflow-x-hidden'>
              <Outlet />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}


