import { useOutletContext } from 'react-router-dom'
import TopHeader from './TopHeader'

type Ctx = { openMenu?: () => void }

export default function PageScaffold({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const ctx = useOutletContext<Ctx>()
  return (
    <>
      <TopHeader
        title={title}
        subtitle={subtitle}
        onMenuClick={ctx?.openMenu}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        {children}
      </div>
    </>
  )
}
