import { Suspense } from 'react'
import { ActiveSession } from './active-session'
import { Spinner } from '@/components/ui/spinner'

export default function ActiveSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    }>
      <ActiveSession />
    </Suspense>
  )
}
