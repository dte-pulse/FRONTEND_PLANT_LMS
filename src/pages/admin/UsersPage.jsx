import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { Plus, UserPlus, RefreshCw, Upload } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form State
  const [employeeCode, setEmployeeCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('trainee')
  const [employeeType, setEmployeeType] = useState('permanent')
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/users')
      setUsers(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!employeeCode || !fullName || !password) {
      toast.error('Employee Code, Full Name, and Password are required')
      return
    }

    setCreating(true)
    try {
      await apiClient.post('/users', {
        employee_code: employeeCode,
        full_name: fullName,
        email: email || null,
        password,
        department: department || null,
        role,
        employee_type: employeeType || 'permanent'
      })
      toast.success('User created successfully')
      setIsModalOpen(false)
      // Reset form
      setEmployeeCode('')
      setFullName('')
      setEmail('')
      setPassword('')
      setDepartment('')
      setRole('trainee')
      setEmployeeType('permanent')
      fetchUsers()
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.detail || 'Failed to create user'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const loadingToast = toast.loading('Importing users from CSV...')
    try {
      const response = await apiClient.post('/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      toast.dismiss(loadingToast)
      const data = response.data
      if (data.failed_count === 0) {
        toast.success(`Successfully imported ${data.success_count} users!`)
      } else {
        toast.warning(
          `Imported ${data.success_count} users. Failed to import ${data.failed_count} users. Check console for details.`
        )
        console.error('CSV Import Errors:', data.errors)
      }
      fetchUsers()
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error(error)
      const msg = error.response?.data?.detail || 'Failed to import CSV'
      toast.error(msg)
    } finally {
      e.target.value = ''
    }
  }

  return (

    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold text-white">User Management</CardTitle>
            <CardDescription className="text-slate-400">View and manage plant personnel, roles, and department assignments.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="cursor-pointer" onClick={() => document.getElementById('csv-import-file').click()}>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              id="csv-import-file" 
              onChange={handleCsvImport} 
            />
            <Button className="cursor-pointer" onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-slate-400">Loading users...</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableRoot>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="text-slate-300">Employee Code</TableHeader>
                      <TableHeader className="text-slate-300">Full Name</TableHeader>
                      <TableHeader className="text-slate-300">Email</TableHeader>
                      <TableHeader className="text-slate-300">Department</TableHeader>
                      <TableHeader className="text-slate-300">Role</TableHeader>
                      <TableHeader className="text-slate-300">Type</TableHeader>
                      <TableHeader className="text-slate-300">Status</TableHeader>
                      <TableHeader className="text-slate-300">Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-500 py-10">
                          No users found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u.id} className="hover:bg-white/5 transition-colors">
                          <TableCell className="font-semibold text-white">{u.employee_code}</TableCell>
                          <TableCell className="text-slate-200">{u.full_name}</TableCell>
                          <TableCell className="text-slate-400">{u.email || '-'}</TableCell>
                          <TableCell className="text-slate-400">{u.department || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              u.role === 'admin' ? 'danger' :
                              u.role === 'hod' ? 'warning' :
                              u.role === 'trainer' ? 'default' : 'secondary'
                            }>
                              {u.role.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 capitalize">{u.employee_type || 'permanent'}</TableCell>
                          <TableCell>
                            <Badge variant={u.is_active ? 'success' : 'default'}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                              onClick={async () => {
                                try {
                                  await apiClient.post(`/users/${u.id}/deactivate`)
                                  toast.success(`User ${u.full_name} status toggled`)
                                  fetchUsers()
                                } catch {
                                  toast.error('Failed to update user status')
                                }
                              }}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </TableRoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tailwind Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600/20 p-3 text-emerald-300 border border-emerald-500/30">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New User</h3>
                <p className="text-sm text-slate-400">Add an employee to the system with role-based permissions.</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Code *</label>
                  <Input 
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="PLANT-EMP-001" 
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name *</label>
                  <Input 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe" 
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@company.com" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Password *</label>
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Department</label>
                  <Input 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Production / QA" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="trainee" className="bg-slate-900">Trainee</option>
                    <option value="trainer" className="bg-slate-900">Trainer</option>
                    <option value="hod" className="bg-slate-900">HOD</option>
                    <option value="admin" className="bg-slate-900">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Type</label>
                  <select 
                    value={employeeType}
                    onChange={(e) => setEmployeeType(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="permanent" className="bg-slate-900">Permanent</option>
                    <option value="contractual" className="bg-slate-900">Contractual</option>
                    <option value="casual" className="bg-slate-900">Casual</option>
                  </select>
                </div>
              </div>


              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="cursor-pointer"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
