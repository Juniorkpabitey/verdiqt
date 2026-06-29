import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/platform'

export default function RoleRoute({
  children,
  roles,
  fallback = '/app',
}: {
  children: React.ReactNode
  roles: UserRole[]
  fallback?: string
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={fallback} replace />
  return <>{children}</>
}
