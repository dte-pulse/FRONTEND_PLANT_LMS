import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, ExternalLink, RefreshCw, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import apiClient from '@/api/client'
import { toast } from 'sonner'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [pollingDocId, setPollingDocId] = useState(null)

  // Upload Form State
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [version, setVersion] = useState(1)
  const [qaScope, setQaScope] = useState('doc_strict')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const fetchMaterials = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/documents')
      setMaterials(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [])

  // Polling for document status
  useEffect(() => {
    let intervalId;
    if (pollingDocId) {
      intervalId = setInterval(async () => {
        try {
          const response = await apiClient.get(`/ingestion/status/${pollingDocId}`)
          const status = response.data.status
          
          setMaterials(prevDocs => 
            prevDocs.map(d => d.id === pollingDocId ? { ...d, status } : d)
          )

          if (status === 'completed' || status === 'ready' || status === 'failed') {
            setPollingDocId(null)
            toast.success(`Document ingestion ${status}!`)
          }
        } catch (error) {
          console.error('Polling error:', error)
          setPollingDocId(null)
        }
      }, 3000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [pollingDocId])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!code || !title || !topic || !file) {
      toast.error('Please fill in all required fields and choose a file')
      return
    }

    const formData = new FormData()
    formData.append('code', code)
    formData.append('title', title)
    formData.append('topic', topic)
    formData.append('version', version)
    formData.append('qa_scope', qaScope)
    formData.append('file', file)

    setUploading(true)
    try {
      const response = await apiClient.post('/ingestion/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      toast.success('Document uploaded successfully! Processing started.')
      setIsUploadOpen(false)
      // Reset form
      setCode('')
      setTitle('')
      setTopic('')
      setVersion(1)
      setFile(null)
      
      await fetchMaterials()
      setPollingDocId(response.data.document_id)
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.detail || 'Failed to upload document'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3 inline" /> Ready</Badge>
      case 'processing':
      case 'chunking':
      case 'embedding':
      case 'mcq_gen':
        return <Badge variant="warning"><Clock className="mr-1 h-3 w-3 inline animate-pulse" /> Processing</Badge>
      case 'failed':
        return <Badge variant="danger"><AlertCircle className="mr-1 h-3 w-3 inline" /> Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-xl font-bold text-white">Training Materials</CardTitle>
            <CardDescription className="text-slate-400">Manage supplementary materials for your training sessions.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchMaterials} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="cursor-pointer" onClick={() => setIsUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Upload Material
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && materials.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableRoot>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="text-slate-300">Code</TableHeader>
                      <TableHeader className="text-slate-300">Title</TableHeader>
                      <TableHeader className="text-slate-300">Topic</TableHeader>
                      <TableHeader className="text-slate-300">Type</TableHeader>
                      <TableHeader className="text-slate-300">Status</TableHeader>
                      <TableHeader className="text-slate-300"></TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                          No materials uploaded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      materials.map((m) => (
                        <TableRow key={m.id} className="hover:bg-white/5 transition-colors">
                          <TableCell className="font-semibold text-white">
                            {m.code}
                          </TableCell>
                          <TableCell className="font-semibold text-white flex items-center gap-2">
                            <FileText className="h-4 w-4 text-cyan-400" />
                            {m.title}
                          </TableCell>
                          <TableCell className="text-slate-400">{m.topic}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{m.file_type ? m.file_type.toUpperCase() : 'UNKNOWN'}</Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(m.status)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-slate-400 hover:text-cyan-400 cursor-pointer"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await apiClient.get(`/documents/${m.id}/view-url`);
                                  if (res.data.url) {
                                    window.open(res.data.url, '_blank');
                                  } else {
                                    toast.error('File URL not available');
                                  }
                                } catch (err) {
                                  toast.error('Failed to get file URL');
                                }
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
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

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Training Material</h3>
                <p className="text-sm text-slate-400">Upload a PDF or DOCX file to start the ingestion pipeline.</p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Code *</label>
                  <Input 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SOP-102" 
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Version *</label>
                  <Input 
                    type="number"
                    value={version}
                    onChange={(e) => setVersion(parseInt(e.target.value))}
                    placeholder="1" 
                    required
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Title *</label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Granulation Machine Cleaning Procedure" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Topic Area *</label>
                  <Input 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Cleaning Processes" 
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">QA Ingestion Scope</label>
                  <select 
                    value={qaScope}
                    onChange={(e) => setQaScope(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="doc_strict" className="bg-slate-900">Doc Strict (Exact match)</option>
                    <option value="doc_grounded" className="bg-slate-900">Doc Grounded (Includes topic knowledge)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Choose File *</label>
                <input 
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-400/10 file:text-cyan-200 hover:file:bg-cyan-400/20 cursor-pointer"
                  required
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="cursor-pointer"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload & Process'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
