import {
  Bell,
  BookOpenText,
  ChartColumnBig,
  Database,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Route,
} from 'lucide-react'

export const roleNavigation = {
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/documents', label: 'Documents', icon: BookOpenText },
    { to: '/admin/training', label: 'Training', icon: GraduationCap },
    { to: '/admin/reports', label: 'Reports', icon: ChartColumnBig },
    { to: '/admin/master-data', label: 'Master Data', icon: Database },
    { to: '/admin/notifications', label: 'Alerts', icon: Bell },
  ],
  hod: [
    { to: '/hod', label: 'Department Pulse', icon: LayoutDashboard },
    { to: '/hod/calendar', label: 'Calendar', icon: GraduationCap },
    { to: '/hod/qualification', label: 'Qualification', icon: FileCheck2 },
    { to: '/hod/reports', label: 'Reports', icon: ChartColumnBig },
  ],
  trainer: [
    { to: '/trainer', label: 'Sessions', icon: LayoutDashboard },
    { to: '/trainer/paths', label: 'Paths', icon: Route },
    { to: '/trainer/attendance', label: 'Attendance', icon: Users },
    { to: '/trainer/assessments', label: 'Assessments', icon: ShieldCheck },
    { to: '/trainer/materials', label: 'Materials', icon: BookOpenText },
  ],
  trainee: [
    { to: '/trainee', label: 'My Learning', icon: LayoutDashboard },
    { to: '/trainee/paths', label: 'Paths', icon: Route },
    { to: '/trainee/progress', label: 'Progress', icon: ChartColumnBig },
    { to: '/trainee/qa', label: 'AI Q&A', icon: Bell },
    { to: '/trainee/assessments', label: 'Assessments', icon: ShieldCheck },
  ],
}
