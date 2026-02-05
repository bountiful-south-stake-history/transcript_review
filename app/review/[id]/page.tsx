'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Transcript } from '@/lib/supabase'

interface ReviewPageProps {
  params: { id: string }
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch transcript on load
  useEffect(() => {
    async function fetchTranscript() {
      const { data, error } = await supabase
        .from('talk_transcripts')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        setError('Transcript not found')
        setLoading(false)
        return
      }

      setTranscript(data)
      setContent(data.revised_text || data.original_text)
      setLoading(false)
    }

    fetchTranscript()
  }, [params.id])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasChanges || !transcript) return

    const timer = setTimeout(() => {
      handleSave()
    }, 30000)

    return () => clearTimeout(timer)
  }, [hasChanges, content])

  const handleSave = useCallback(async () => {
    if (!transcript || saving) return

    setSaving(true)
    const { error } = await supabase
      .from('talk_transcripts')
      .update({
        revised_text: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', transcript.id)

    if (error) {
      console.error('Save error:', error)
    } else {
      setHasChanges(false)
      setLastSaved(new Date())
    }
    setSaving(false)
  }, [transcript, content, saving])

  const handleApprove = async () => {
    if (!transcript) return

    setSaving(true)
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('talk_transcripts')
      .update({
        revised_text: content,
        status: 'approved',
        approved_at: now,
        updated_at: now
      })
      .eq('id', transcript.id)

    if (error) {
      console.error('Approve error:', error)
      setSaving(false)
      return
    }

    setTranscript(prev => prev ? { ...prev, status: 'approved', approved_at: now } : null)
    setHasChanges(false)
    setShowApprovalModal(false)
    setSaving(false)
  }

  const handleResetToOriginal = () => {
    if (!transcript) return
    if (window.confirm('Reset to original transcript? Your changes will be lost.')) {
      setContent(transcript.original_text)
      setHasChanges(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading transcript...</div>
      </div>
    )
  }

  if (error || !transcript) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Transcript Not Found</h1>
          <p className="text-gray-600">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const isApproved = transcript.status === 'approved'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{transcript.talk_title}</h1>
              <p className="text-sm text-gray-600">
                {transcript.speaker_name} • {new Date(transcript.talk_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <StatusBadge status={transcript.status} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isApproved ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-green-600 text-4xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-green-800 mb-2">Transcript Approved</h2>
            <p className="text-green-700">
              You approved this transcript on {new Date(transcript.approved_at!).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Editor */}
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setHasChanges(true)
                }}
                className="w-full min-h-[500px] p-6 text-gray-800 leading-relaxed resize-none focus:outline-none font-serif text-lg"
                placeholder="Transcript content..."
              />
            </div>

            {/* Action bar */}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleResetToOriginal}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Reset to original
                </button>
                {lastSaved && (
                  <span className="text-sm text-gray-400">
                    Saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                {hasChanges && (
                  <span className="text-sm text-yellow-600 font-medium">
                    • Unsaved changes
                  </span>
                )}
                {saving && (
                  <span className="text-sm text-blue-600">Saving...</span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    hasChanges && !saving
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Save Draft
                </button>

                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Approve Transcript
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
              <p className="text-sm text-blue-800">
                Review the transcript for accuracy and make any necessary corrections.
                Your changes are auto-saved every 30 seconds.
                Click "Approve Transcript" when you're satisfied with the content.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Approval confirmation modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Approve Transcript?</h2>
            <p className="text-gray-600 mb-6">
              By approving, you confirm that this transcript accurately represents your talk
              and is ready for publication.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                {saving ? 'Approving...' : 'Yes, Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200'
  }

  const labels: Record<string, string> = {
    pending_review: 'Pending Review',
    approved: 'Approved'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
