'use client'

interface StatusBadgeProps {
  status: string
  variant?: 'compact' | 'full'
}

export function StatusBadge({ status, variant = 'compact' }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
  }

  const labels: Record<string, string> = {
    pending_review: variant === 'full' ? 'Pending Review' : 'Pending',
    in_progress: 'In Progress',
    approved: 'Approved',
  }

  if (variant === 'full') {
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}
