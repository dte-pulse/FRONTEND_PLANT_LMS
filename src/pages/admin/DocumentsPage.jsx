import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/api/client'
import { toast } from 'sonner'
import { FileText, Upload, RefreshCw, Eye, AlertCircle, CheckCircle, Clock, Archive, Rocket, RotateCcw, Layers, Cpu, History, BarChart3 } from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [chunks, setChunks] = useState([])
  const [historySummary, setHistorySummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingChunks, setLoadingChunks] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [pollingDocId, setPollingDocId] = useState(null)
  const [reingestingIds, setReingestingIds] = useState(new Set())

  // Preview / Version Track State
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewChunks, setPreviewChunks] = useState([])
  const [previewHistory, setPreviewHistory] = useState(null)
  const [previewVersionId, setPreviewVersionId] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const loadPreviewData = async (docId) => {
    setLoadingPreview(true)
    try {
      const [chunksRes, historyRes] = await Promise.all([
        apiClient.get(`/documents/${docId}/chunks`),
        apiClient.get(`/documents/${docId}/history-summary`)
      ])
      setPreviewChunks(chunksRes.data || [])
      setPreviewHistory(historyRes.data || null)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load preview data')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handlePreviewVersionChange = async (verDocId) => {
    setPreviewVersionId(verDocId)
    setLoadingPreview(true)
    try {
      const chunksRes = await apiClient.get(`/documents/${verDocId}/chunks`)
      setPreviewChunks(chunksRes.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load version preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  // Upload Form State
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [version, setVersion] = useState(1)
  const [qaScope, setQaScope] = useState('doc_strict')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Subject/Topic FK selection state
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState('')

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/documents')
      setDocuments(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjectsAndTopics = async () => {
    try {
      const [subsRes, topsRes] = await Promise.all([
        apiClient.get('/subjects'),
        apiClient.get('/topics')
      ])
      setSubjects(subsRes.data || [])
      setTopics(topsRes.data || [])
    } catch (error) {
      console.error('Failed to load subjects/topics:', error)
    }
  }

  const fetchChunks = async (docId) => {
    setLoadingChunks(true)
    try {
      const response = await apiClient.get(`/documents/${docId}/chunks`)
      setChunks(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load chunks')
    } finally {
      setLoadingChunks(false)
    }
  }

  const fetchHistorySummary = async (docId) => {
    setLoadingHistory(true)
    try {
      const response = await apiClient.get(`/documents/${docId}/history-summary`)
      setHistorySummary(response.data)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load document history')
      setHistorySummary(null)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchSubjectsAndTopics()
  }, [])

  useEffect(() => {
    if (selectedDoc) {
      fetchChunks(selectedDoc.id)
      fetchHistorySummary(selectedDoc.id)
    } else {
      setChunks([])
      setHistorySummary(null)
    }
  }, [selectedDoc])

  // Polling for document status when it's processing
  useEffect(() => {
    let intervalId;
    if (pollingDocId) {
      intervalId = setInterval(async () => {
        try {
          const response = await apiClient.get(`/ingestion/status/${pollingDocId}`)
          const status = response.data.status
          
          // Update status in documents list
          setDocuments(prevDocs => 
            prevDocs.map(d => d.id === pollingDocId ? { ...d, status } : d)
          )

          // Update selectedDoc if it's the one being polled
          if (selectedDoc && selectedDoc.id === pollingDocId) {
            setSelectedDoc(prev => ({ ...prev, status }))
            if (status === 'completed' || status === 'ready') {
              fetchChunks(pollingDocId)
            }
          }

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
  }, [pollingDocId, selectedDoc])

  const handleUpload = async (e) => {
    e.preventDefault()
    // We require topic input (either selected from FK topic list, or inputted manually)
    const topicObj = topics.find(t => t.id === Number(selectedTopicId))
    const finalTopic = topicObj ? topicObj.title : topic
    
    if (!code || !title || !finalTopic || !file) {
      toast.error('Please fill in all required fields and choose a file')
      return
    }

    const formData = new FormData()
    formData.append('code', code)
    formData.append('title', title)
    formData.append('topic', finalTopic)
    if (selectedTopicId) formData.append('topic_id', selectedTopicId)
    if (selectedSubjectId) formData.append('subject_id', selectedSubjectId)
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
      setSelectedTopicId('')
      setSelectedSubjectId('')
      setVersion(1)
      setFile(null)
      
      // Add document to list and start polling
      await fetchDocuments()
      setPollingDocId(response.data.document_id)
    } catch (error) {
      console.error(error)
      const msg = error.response?.data?.detail || 'Failed to upload document'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const triggerProcessing = async (docId) => {
    try {
      toast.info('Starting manual document processing...')
      await apiClient.post(`/ingestion/process/${docId}`)
      setPollingDocId(docId)
    } catch (error) {
      console.error(error)
      toast.error('Failed to trigger document processing')
    }
  }

  const triggerReingest = async (docId, e) => {
    if (e) e.stopPropagation()
    setReingestingIds(prev => new Set(prev).add(docId))
    try {
      toast.info('Re-ingestion started — this will rebuild chunks, embeddings & MCQs…')
      await apiClient.post(`/ingestion/process/${docId}`)
      setPollingDocId(docId)
      // Update status in list immediately
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'chunking' } : d))
      if (selectedDoc?.id === docId) setSelectedDoc(prev => ({ ...prev, status: 'chunking' }))
    } catch (error) {
      console.error(error)
      toast.error('Failed to start re-ingestion')
    } finally {
      setReingestingIds(prev => { const s = new Set(prev); s.delete(docId); return s })
    }
  }

  const handleLifecycleAction = async (action) => {
    if (!selectedDoc) return
    try {
      await apiClient.post(`/documents/${selectedDoc.id}/${action}`)
      toast.success(`Document ${action === 'publish' ? 'published' : 'archived'} successfully`)
      await fetchDocuments()
      const refreshed = await apiClient.get(`/documents/${selectedDoc.id}`)
      setSelectedDoc(refreshed.data)
      fetchHistorySummary(selectedDoc.id)
    } catch (error) {
      console.error(error)
      toast.error(`Failed to ${action} document`)
    }
  }

  const requestPublish = () => {
    if (!selectedDoc) return
    const impacted = historySummary?.publish_impact?.impacted_user_count ?? 0
    if (impacted > 0) {
      setShowPublishConfirm(true)
      return
    }
    handleLifecycleAction('publish')
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'ready':
      case 'active':
      case 'archived':
        return <Badge variant="success" className={status === 'active' ? 'bg-green-600' : ''}><CheckCircle className="mr-1 h-3 w-3 inline" /> {status === 'active' ? 'Published' : (status === 'archived' ? 'Archived' : 'Ready')}</Badge>
      case 'processing':
        return <Badge variant="warning"><Clock className="mr-1 h-3 w-3 inline animate-pulse" /> Processing</Badge>
      case 'chunking':
        return <Badge variant="warning"><Layers className="mr-1 h-3 w-3 inline animate-pulse" /> Extraction & Chunking</Badge>
      case 'embedding':
        return <Badge variant="warning"><Cpu className="mr-1 h-3 w-3 inline animate-pulse" /> Embedding</Badge>
      case 'mcq_gen':
        return <Badge variant="warning"><FileText className="mr-1 h-3 w-3 inline animate-pulse" /> MCQ Generation</Badge>
      case 'failed':
      case 'failed_extraction':
      case 'failed_embedding':
      case 'failed_mcq':
        return <Badge variant="danger"><AlertCircle className="mr-1 h-3 w-3 inline" /> {status.replace('_', ' ').toUpperCase()}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: Document List */}
        <Card className="min-h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-2xl font-bold text-white">Document Control</CardTitle>
              <CardDescription className="text-slate-400">Upload and manage active SOPs and training materials.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchDocuments} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button className="cursor-pointer" onClick={() => {
                setCode('')
                setTitle('')
                setTopic('')
                setSelectedSubjectId('')
                setSelectedTopicId('')
                setVersion(1)
                setFile(null)
                setIsUploadOpen(true)
              }}>
                <Upload className="mr-2 h-4 w-4" /> Upload SOP
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && documents.length === 0 ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
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
                        <TableHeader className="text-slate-300">Scope</TableHeader>
                        <TableHeader className="text-slate-300">Status</TableHeader>
                        <TableHeader className="text-slate-300"></TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                            No documents uploaded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        documents.map((doc) => (
                          <TableRow 
                            key={doc.id} 
                            onClick={() => setSelectedDoc(doc)}
                            className={`cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
                          >
                            <TableCell className="font-semibold text-white">{doc.code} (v{doc.version})</TableCell>
                            <TableCell className="text-slate-200 max-w-[150px] truncate">{doc.title}</TableCell>
                            <TableCell className="text-slate-400">{doc.topic}</TableCell>
                            <TableCell className="text-xs font-mono text-indigo-300">{doc.qa_scope}</TableCell>
                            <TableCell>{getStatusBadge(doc.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await apiClient.get(`/documents/${doc.id}/view-url`);
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
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                  title="Upload new version"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCode(doc.code);
                                    setTitle(doc.title);
                                    setTopic(doc.topic);
                                    setSelectedSubjectId(doc.subject_id || '');
                                    setSelectedTopicId(doc.topic_id || '');
                                    setVersion((doc.version || 1) + 1);
                                    setFile(null);
                                    setIsUploadOpen(true);
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                                  title="Track version history & preview"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setPreviewDoc(doc);
                                    setPreviewVersionId(doc.id);
                                    setIsPreviewOpen(true);
                                    await loadPreviewData(doc.id);
                                  }}
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                  title="Re-ingest document (rebuild chunks + MCQs)"
                                  disabled={reingestingIds.has(doc.id) || ['chunking','embedding'].includes(doc.status)}
                                  onClick={(e) => triggerReingest(doc.id, e)}
                                >
                                  <RotateCcw className={`h-4 w-4 ${reingestingIds.has(doc.id) ? 'animate-spin' : ''}`} />
                                </Button>
                              </div>
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

        {/* Right Column: Chunk Viewer / Extracted Text */}
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              {selectedDoc ? `Extracted Content: ${selectedDoc.code}` : 'Extracted Content'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {selectedDoc 
                ? `Showing semantic chunks and AI training representations.`
                : 'Select a document to inspect its parsed structures and learning cards.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDoc ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-20">
                <FileText className="h-16 w-16 mb-4 stroke-[1]" />
                <p>No document selected</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div>
                    <p className="text-xs text-slate-400">DOCUMENT ID</p>
                    <p className="text-sm font-semibold text-white">{selectedDoc.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">TOTAL CHUNKS</p>
                    <p className="text-sm font-semibold text-white">{chunks.length}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-300 border-amber-400/30 hover:bg-amber-400/10 gap-1.5"
                      disabled={reingestingIds.has(selectedDoc.id) || ['chunking','embedding'].includes(selectedDoc.status)}
                      onClick={() => triggerReingest(selectedDoc.id)}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${reingestingIds.has(selectedDoc.id) ? 'animate-spin' : ''}`} />
                      {reingestingIds.has(selectedDoc.id) ? 'Re-ingesting…' : 'Re-ingest'}
                    </Button>
                    {selectedDoc.status !== 'active' && (
                      <Button size="sm" onClick={requestPublish}>
                        <Rocket className="mr-2 h-4 w-4" /> Publish
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 gap-1.5"
                      onClick={() => {
                        setCode(selectedDoc.code)
                        setTitle(selectedDoc.title)
                        setTopic(selectedDoc.topic)
                        setSelectedSubjectId(selectedDoc.subject_id || '')
                        setSelectedTopicId(selectedDoc.topic_id || '')
                        setVersion((selectedDoc.version || 1) + 1)
                        setFile(null)
                        setIsUploadOpen(true)
                      }}
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload New Version
                    </Button>
                    {selectedDoc.status !== 'archived' && (
                      <Button size="sm" variant="outline" onClick={() => handleLifecycleAction('archive')}>
                        <Archive className="mr-2 h-4 w-4" /> Archive
                      </Button>
                    )}
                  </div>
                </div>

                {selectedDoc.failure_reason && (
                  <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <p className="text-sm font-semibold text-red-400">Ingestion Failure Details</p>
                    </div>
                    <p className="text-sm text-red-300 font-mono text-xs whitespace-pre-wrap break-words">{selectedDoc.failure_reason}</p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Version History</p>
                      {loadingHistory && <span className="text-xs text-slate-500">Loading…</span>}
                    </div>
                    <div className="space-y-2">
                      {(historySummary?.version_history || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No version history available.</p>
                      ) : (
                        historySummary.version_history.map((item) => (
                          <div key={item.id} className="rounded-xl bg-white/5 px-3 py-2 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm text-white font-medium">v{item.version} · {item.title}</p>
                              <p className="text-xs text-slate-400 capitalize">{item.status}</p>
                            </div>
                            {item.id === selectedDoc.id && (
                              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/30">CURRENT</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-white">Publish Impact Summary</p>
                      <p className="text-xs text-slate-500 mt-1">Projected retraining reset impact when this document is published.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Impacted Users', historySummary?.publish_impact?.impacted_user_count ?? 0],
                        ['Training Assignments', historySummary?.publish_impact?.training_assignment_count ?? 0],
                        ['Doc Assignments', historySummary?.publish_impact?.document_assignment_count ?? 0],
                        ['Progress Resets', historySummary?.publish_impact?.progress_records_to_reset ?? 0],
                        ['Completed Progress', historySummary?.publish_impact?.completed_progress_records ?? 0],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-white/5 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
                          <p className="text-lg font-bold text-white mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Impacted Departments</p>
                        {(historySummary?.publish_impact?.impacted_departments || []).length === 0 ? (
                          <p className="text-sm text-slate-500">No department-level assignments linked.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {historySummary.publish_impact.impacted_departments.map((department) => (
                              <span key={department} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {department}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Impacted Users</p>
                        {(historySummary?.publish_impact?.impacted_users || []).length === 0 ? (
                          <p className="text-sm text-slate-500">No impacted users found.</p>
                        ) : (
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {historySummary.publish_impact.impacted_users.slice(0, 12).map((user) => (
                              <div key={user.user_id} className="rounded-xl bg-white/5 px-3 py-2">
                                <p className="text-sm text-white font-medium">{user.full_name}</p>
                                <p className="text-xs text-slate-400">{user.employee_code} · {user.department || '—'}</p>
                              </div>
                            ))}
                            {historySummary.publish_impact.impacted_users.length > 12 && (
                              <p className="text-xs text-slate-500">
                                Showing first 12 of {historySummary.publish_impact.impacted_users.length} impacted users.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {loadingChunks ? (
                    <div className="flex justify-center py-20">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                    </div>
                  ) : chunks.length === 0 ? (
                    <div className="text-center text-slate-500 py-20">
                      {selectedDoc.status === 'completed' 
                        ? 'No chunks extracted.' 
                        : `Document is currently in '${selectedDoc.status}' state.`}
                    </div>
                  ) : (
                    chunks.map((chunk) => (
                      <div key={chunk.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="bg-cyan-400/20 text-cyan-200 px-2 py-0.5 rounded-full">
                            Chunk {chunk.chunk_index + 1}
                          </span>
                          <span className="text-slate-400">
                            Page {chunk.page_no} • {chunk.token_count} tokens
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-sans">{chunk.content}</p>
                        
                        {chunk.learning_card && (
                          <div className="mt-3 bg-amber-400/10 border border-amber-400/20 p-3 rounded-xl">
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block mb-1">
                              AI Learning Representation
                            </span>
                            <p className="text-xs text-amber-200/90 leading-relaxed">{chunk.learning_card}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload SOP Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-600/20 p-3 text-indigo-300 border border-indigo-500/30">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload SOP Document</h3>
                <p className="text-sm text-slate-400">Upload a PDF or DOCX file to start the ingestion pipeline.</p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">SOP Code *</label>
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
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Subject Link</label>
                  <select 
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value)
                      setSelectedTopicId('')
                    }}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="" className="bg-slate-900">Choose subject…</option>
                    {subjects.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Topic Link</label>
                  <select 
                    value={selectedTopicId}
                    onChange={(e) => {
                      setSelectedTopicId(e.target.value)
                      const topicObj = topics.find(t => t.id === Number(e.target.value))
                      if (topicObj) setTopic(topicObj.title)
                    }}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="" className="bg-slate-900">Choose topic…</option>
                    {topics
                      .filter(t => !selectedSubjectId || t.subject_id === Number(selectedSubjectId))
                      .map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.title}</option>)
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Or Custom Topic *</label>
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
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-500/10 file:text-indigo-300 hover:file:bg-indigo-500/20 cursor-pointer"
                  required
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
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

      {showPublishConfirm && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowPublishConfirm(false)}>
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Confirm Publish and Retraining Reset</h3>
            <p className="text-sm text-slate-400 mt-2">
              Publishing <span className="text-white font-semibold">{selectedDoc.code}</span> will reassign retraining for impacted learners and reset existing progress where applicable.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Impacted Users</p>
                <p className="text-xl font-bold text-white mt-1">{historySummary?.publish_impact?.impacted_user_count ?? 0}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Progress Resets</p>
                <p className="text-xl font-bold text-white mt-1">{historySummary?.publish_impact?.progress_records_to_reset ?? 0}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowPublishConfirm(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  setShowPublishConfirm(false)
                  await handleLifecycleAction('publish')
                }}
              >
                Confirm Publish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Version Hub & Preview Modal */}
      {isPreviewOpen && previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-7xl h-[85vh] rounded-3xl border border-white/10 bg-slate-950 flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-600/20 p-2.5 text-cyan-400 border border-cyan-500/30">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {previewDoc.code} Version Hub & Document Preview
                  </h3>
                  <p className="text-xs text-slate-400">Track procedural updates, revision histories, and preview content chunks.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 gap-1.5"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setCode(previewDoc.code);
                    setTitle(previewDoc.title);
                    setTopic(previewDoc.topic);
                    setSelectedSubjectId(previewDoc.subject_id || '');
                    setSelectedTopicId(previewDoc.topic_id || '');
                    setVersion((previewDoc.version || 1) + 1);
                    setFile(null);
                    setIsUploadOpen(true);
                  }}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload New Version
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close Hub
                </Button>
              </div>
            </div>

            {/* Modal Content - Three Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Column 1: Version Timeline & History */}
              <div className="w-1/4 border-r border-white/10 p-5 overflow-y-auto space-y-4 bg-slate-950">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Version Records</h4>
                {loadingPreview && !previewHistory ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  </div>
                ) : !previewHistory ? (
                  <p className="text-xs text-slate-500">No version history loaded.</p>
                ) : (
                  <div className="space-y-3">
                    {(previewHistory.version_history || []).map((ver) => {
                      const isCurrentPreview = ver.id === previewVersionId;
                      const isCurrentDoc = ver.id === previewDoc.id;
                      return (
                        <div 
                          key={ver.id}
                          onClick={() => handlePreviewVersionChange(ver.id)}
                          className={`rounded-2xl border p-3.5 text-left cursor-pointer transition-all ${isCurrentPreview ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white">Version {ver.version}</span>
                            <div className="flex gap-1.5">
                              {isCurrentDoc && <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">Active</span>}
                              {ver.status === 'archived' && <span className="text-[9px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full">Archived</span>}
                            </div>
                          </div>
                          <p className="text-xs text-slate-300 font-medium truncate">{ver.title}</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-mono">{ver.created_at ? new Date(ver.created_at).toLocaleDateString() : ''}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Column 2: Chunk Preview */}
              <div className="w-1/2 p-5 overflow-y-auto space-y-4 bg-slate-900/30">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Document Chunk Preview</h4>
                  <span className="text-xs text-slate-500 font-mono">Showing {previewChunks.length} chunks</span>
                </div>
                {loadingPreview ? (
                  <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                  </div>
                ) : previewChunks.length === 0 ? (
                  <div className="text-center text-slate-500 py-20 text-xs">
                    No content chunks extracted for this version.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewChunks.map((chunk, idx) => (
                      <div key={chunk.id} className="rounded-2xl border border-white/5 bg-slate-950 p-4 space-y-2.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                            Chunk {chunk.chunk_index + 1}
                          </span>
                          <span className="text-slate-500">
                            Page {chunk.page_no} · {chunk.token_count} tokens
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{chunk.content}</p>
                        {chunk.learning_card && (
                          <div className="bg-amber-400/5 border border-amber-400/15 p-2.5 rounded-xl">
                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">AI Representation</span>
                            <p className="text-[11px] text-amber-200/90 leading-snug">{chunk.learning_card}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 3: Impact Summary */}
              <div className="w-1/4 border-l border-white/10 p-5 overflow-y-auto space-y-4 bg-slate-950">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Publish Reset Impact</h4>
                {loadingPreview && !previewHistory ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  </div>
                ) : !previewHistory ? (
                  <p className="text-xs text-slate-500">No impact stats available.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        ['Impacted Users', previewHistory.publish_impact?.impacted_user_count ?? 0],
                        ['Training Assignments', previewHistory.publish_impact?.training_assignment_count ?? 0],
                        ['Progress Resets', previewHistory.publish_impact?.progress_records_to_reset ?? 0]
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/5 bg-white/5 p-3.5">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
                          <p className="text-xl font-black text-white mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Impacted Departments</p>
                      {(previewHistory.publish_impact?.impacted_departments || []).length === 0 ? (
                        <p className="text-xs text-slate-500 font-medium">None linked.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {previewHistory.publish_impact.impacted_departments.map((dept) => (
                            <span key={dept} className="rounded-lg bg-slate-900 border border-white/5 px-2.5 py-1 text-[10px] text-slate-300">
                              {dept}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
