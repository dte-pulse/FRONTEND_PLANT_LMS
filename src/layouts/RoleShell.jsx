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
  trainer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trainee: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
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

  return (
    <div className='min-h-screen bg-[#0B0F17] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col overflow-x-clip'>
      <a className='skip-link' href='#main-content'>Skip to page content</a>
      {/* Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0F1420]/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg px-3 sm:px-4 2xl:px-6 py-3.5">
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left section: Logo & Role Badge */}
          <div className="flex items-center gap-4 shrink-0">
            <Logo />
            <span className={`hidden 2xl:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleBadges[role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
              {role}
            </span>
          </div>

          {/* Middle section: Horizontal Nav Links (hidden on mobile/tablet) */}
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar rounded-xl" aria-label={`${role} navigation`}>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === `/${role}`}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-200 border border-transparent whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right section: Actions (NotifBell, ThemeToggle, User card, Logout) */}
          <div className="flex items-center gap-2 2xl:gap-3 shrink-0">
            <div className="hidden 2xl:flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                {initials}
              </div>
              <div className="text-[10px] font-semibold text-slate-300 max-w-[120px] truncate">
                {user.full_name}
              </div>
            </div>

            <NotifBell />
            <ThemeToggle />

            {/* Mobile Menu Toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 focus:outline-none"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Sign Out Button (Desktop only) */}
            <button
              onClick={clearAuth}
              className="hidden lg:flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500/40 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Links Panel */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="lg:hidden border-b border-slate-800 bg-[#0F1420] px-4 py-4 space-y-4 shadow-xl">
          <nav className="flex flex-col gap-1.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === `/${role}`}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          
          {/* Mobile User Card & Sign Out */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">{user.full_name}</p>
                <span className="text-[9px] font-mono text-indigo-400 capitalize">{role}</span>
              </div>
            </div>
            <button
              onClick={clearAuth}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 p-3 sm:p-4 md:p-6 max-w-[1680px] w-full mx-auto">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-[#131825] shadow-xl overflow-hidden min-h-[calc(100vh-8.5rem)] flex flex-col">
          {/* Sub Header for Page Context */}
          <header className="flex flex-col gap-2 border-b border-slate-800/80 px-4 sm:px-6 py-4 bg-[#161C2C]/50">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="capitalize font-semibold text-slate-300">{role} Workspace</span>
              <ChevronRight className="h-3 w-3 text-slate-500" />
              <span className="text-emerald-400 font-semibold">{roleTitles[role]}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{roleTitles[role]}</h2>
          </header>

          {/* View Body */}
          <section className="p-3 sm:p-4 md:p-6 flex-1 text-slate-200 overflow-x-hidden">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  )
}
