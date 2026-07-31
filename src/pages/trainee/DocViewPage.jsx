import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const DocViewPage = () => {
  const { documentId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (documentId) {
      navigate(`/trainee/learn/${documentId}`, { replace: true })
    }
  }, [documentId, navigate])

  return <div className="p-8 text-center text-slate-400">Opening learning session…</div>
}

export default DocViewPage
