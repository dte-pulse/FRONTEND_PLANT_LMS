import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import RoleShell from '@/layouts/RoleShell'
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import UsersPage from '@/pages/admin/UsersPage'
import DocumentsPage from '@/pages/admin/DocumentsPage'
import TrainingPage from '@/pages/admin/TrainingPage'
import ReportsPage from '@/pages/admin/ReportsPage'
import NotificationsPage from '@/pages/admin/NotificationsPage'
import ObservabilityPage from '@/pages/admin/ObservabilityPage'
import MasterDataPage from '@/pages/admin/MasterDataPage'
import HodDashboardPage from '@/pages/hod/HodDashboardPage'
import CalendarPage from '@/pages/hod/CalendarPage'
import QualificationPage from '@/pages/hod/QualificationPage'
import HodReportsPage from '@/pages/hod/ReportsPage'
import TrainerDashboardPage from '@/pages/trainer/TrainerDashboardPage'
import TrainingPathsPage from '@/pages/trainer/TrainingPathsPage'
import AttendancePage from '@/pages/trainer/AttendancePage'
import TrainerAssessmentsPage from '@/pages/trainer/AssessmentsPage'
import MaterialsPage from '@/pages/trainer/MaterialsPage'
import TraineeDashboardPage from '@/pages/trainee/TraineeDashboardPage'
import TraineePathsPage from '@/pages/trainee/TraineePathsPage'
import ProgressPage from '@/pages/trainee/ProgressPage'
import CapabilityPage from '@/pages/trainee/CapabilityPage'
import QaPage from '@/pages/trainee/QaPage'
import TraineeAssessmentsPage from '@/pages/trainee/AssessmentsPage'
import DocViewPage from '@/pages/trainee/DocViewPage'
import LearnSessionPage from '@/pages/trainee/LearnSessionPage'
import MindMapPage from '@/pages/trainee/MindMapPage'
import PpwecPassportPage from '@/pages/trainee/PpwecPassportPage'
import PpwecModulePage from '@/pages/trainee/PpwecModulePage'
import PpwecReportPage from '@/pages/admin/PpwecReportPage'
import PpwecAuthoringPage from '@/pages/admin/PpwecAuthoringPage'
import LeaderboardPage from '@/pages/shared/LeaderboardPage'

const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/admin',
    element: <RoleShell role='admin' />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'training', element: <TrainingPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'observability', element: <ObservabilityPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'master-data', element: <MasterDataPage /> },
      { path: 'ppwec', element: <PpwecReportPage /> },
      { path: 'ppwec/authoring', element: <PpwecAuthoringPage /> },
    ],
  },
  {
    path: '/hod',
    element: <RoleShell role='hod' />,
    children: [
      { index: true, element: <HodDashboardPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'qualification', element: <QualificationPage /> },
      { path: 'reports', element: <HodReportsPage /> },
    ],
  },
  {
    path: '/trainer',
    element: <RoleShell role='trainer' />,
    children: [
      { index: true, element: <TrainerDashboardPage /> },
      { path: 'paths', element: <TrainingPathsPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'assessments', element: <TrainerAssessmentsPage /> },
      { path: 'materials', element: <MaterialsPage /> },
    ],
  },
  {
    path: '/trainee',
    element: <RoleShell role='trainee' />,
    children: [
      { index: true, element: <TraineeDashboardPage /> },
      { path: 'paths', element: <TraineePathsPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'capability', element: <CapabilityPage /> },
      { path: 'capability/:documentId', element: <CapabilityPage /> },
      { path: 'qa', element: <QaPage /> },
      { path: 'assessments', element: <TraineeAssessmentsPage /> },
      { path: 'document/:documentId', element: <DocViewPage /> },
      { path: 'learn/:documentId', element: <LearnSessionPage /> },
      { path: 'mindmap/:documentId', element: <MindMapPage /> },
      { path: 'ppwec', element: <PpwecPassportPage /> },
      { path: 'ppwec/:moduleNumber', element: <PpwecModulePage /> },
    ],
  },
  {
    // Rewards page: trainee-only (gamification is a learner motivation surface)
    path: '/trainee/leaderboard',
    element: <RoleShell role='trainee' />,
    children: [{ index: true, element: <LeaderboardPage /> }],
  },
  // Unknown / de-scopeed URLs (e.g. /admin/leaderboard) → login or role home
  { path: '*', element: <Navigate to='/' replace /> },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
