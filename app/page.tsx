'use client'

import { useEffect, useState } from 'react'
import { supabase, Transcript } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminDashboard() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchTranscripts()
  }, [])

  async function fetchTranscripts() {
    const { data, error } = await supabase
      .from('talk_transcripts')
      .select('*')
      .order('talk_date', { ascending: false })

    if (error) {
      console.error('Error fetching transcripts:', error)
      if (error.message?.includes('Invalid URL') || error.message?.includes('fetch')) {
        setConfigError('Supabase not configured. Check environment variables.')
      }
    } else {
      setTranscripts(data || [])
    }
    setLoading(false)
  }

  const copyReviewLink = async (id: string) => {
    const link = `${window.location.origin}/review/${id}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase
      .from('talk_transcripts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      alert(`Error deleting: ${error.message}`)
    } else {
      setTranscripts(prev => prev.filter(t => t.id !== id))
    }
    setDeleteConfirm(null)
    setDeleting(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Talk Transcripts</h1>
              <p className="text-gray-600">Manage speaker transcript reviews</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + Add Transcript
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {configError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Configuration Error:</strong> {configError}
          </div>
        )}
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : transcripts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No transcripts yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-600 hover:underline"
            >
              Add your first transcript
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Speaker</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Talk Title</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transcripts.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{t.speaker_name}</div>
                      {t.reviewer_email && (
                        <div className="text-sm text-gray-500">{t.reviewer_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.talk_title}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {new Date(t.talk_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-3 justify-end items-center">
                        <button
                          onClick={() => copyReviewLink(t.id)}
                          className={`text-sm ${copiedId === t.id ? 'text-green-600 font-medium' : 'text-blue-600 hover:underline'}`}
                        >
                          {copiedId === t.id ? 'Copied!' : 'Copy Link'}
                        </button>
                        <Link
                          href={`/review/${t.id}`}
                          className="text-sm text-gray-600 hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(t.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete transcript"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddTranscriptModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchTranscripts()
          }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Transcript?</h2>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The transcript will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-6 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
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
    pending_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800'
  }

  const labels: Record<string, string> = {
    pending_review: 'Pending',
    approved: 'Approved'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function AddTranscriptModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    speaker_name: '',
    reviewer_email: '',
    talk_title: '',
    talk_date: new Date().toISOString().split('T')[0],
    original_text: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('talk_transcripts')
      .insert({
        ...form,
        status: 'pending_review'
      })

    if (error) {
      console.error('Full error:', JSON.stringify(error, null, 2))
      alert(`Error: ${error.message} (Code: ${error.code}, Details: ${error.details}, Hint: ${error.hint})`)
    } else {
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Transcript</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speaker Name *
              </label>
              <input
                type="text"
                required
                value={form.speaker_name}
                onChange={(e) => setForm({ ...form, speaker_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reviewer Email
              </label>
              <input
                type="email"
                value={form.reviewer_email}
                onChange={(e) => setForm({ ...form, reviewer_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Talk Title *
              </label>
              <input
                type="text"
                required
                value={form.talk_title}
                onChange={(e) => setForm({ ...form, talk_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Talk Date *
              </label>
              <input
                type="date"
                required
                value={form.talk_date}
                onChange={(e) => setForm({ ...form, talk_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transcript Text *
            </label>
            <textarea
              required
              rows={12}
              value={form.original_text}
              onChange={(e) => setForm({ ...form, original_text: e.target.value })}
              placeholder="Paste the transcript here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Transcript'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
