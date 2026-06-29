import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LawyerRoute({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'lawyer' && user.role !== 'admin' && user.role !== 'legal_aid') {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}
