'use client'

import { useEffect, useState } from 'react'
import { supabase, Transcript, Contact, parseLocalDate, getDueDateInfo } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { StatusBadge } from '@/components/StatusBadge'
import { exportAsText, exportAsDocx } from '@/lib/export'
import { logError } from '@/lib/logger'
import Link from 'next/link'
import RichTextEditor from '@/components/RichTextEditor'
import { sanitizeHtml, stripHtml, isHtml, plainTextToHtml } from '@/lib/sanitize'
import ContactPicker from '@/components/ContactPicker'
import ContactsModal from '@/components/ContactsModal'

const ADMIN_PASSWORD = 'ComeFollowMe'

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewTranscript, setViewTranscript] = useState<Transcript | null>(null)
  const [editTranscript, setEditTranscript] = useState<Transcript | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'in_progress' | 'approved'>('all')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showContactsModal, setShowContactsModal] = useState(false)
  const { addToast } = useToast()

  const filteredTranscripts = transcripts.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        t.speaker_name.toLowerCase().includes(q) ||
        t.talk_title.toLowerCase().includes(q) ||
        (t.reviewer_email && t.reviewer_email.toLowerCase().includes(q))
      )
    }
    return true
  })

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchTranscripts()
      fetchContacts()
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true')
      setIsAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Talk Transcripts</h1>
          <p className="text-gray-600 text-center mb-6">Enter password to continue</p>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setAuthError(false)
              }}
              placeholder="Password"
              className={`w-full px-4 py-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                authError ? 'border-red-500' : 'border-gray-300'
              }`}
              autoFocus
            />
            {authError && (
              <p className="text-red-500 text-sm mb-4">Incorrect password</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  async function fetchTranscripts() {
    const { data, error } = await supabase
      .from('talk_transcripts')
      .select('*')
      .order('talk_date', { ascending: false })

    if (error) {
      logError('fetchTranscripts', error)
      if (error.message?.includes('Invalid URL') || error.message?.includes('fetch')) {
        setConfigError('Supabase not configured. Check environment variables.')
      }
    } else {
      setTranscripts(data || [])
    }
    setLoading(false)
  }

  async function fetchContacts() {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('name')

    setContacts(data || [])
  }

  const BASE_URL = 'https://transcript.bountifulsouthstake.org'

  const copyReviewLink = async (id: string) => {
    const link = `${BASE_URL}/review/${id}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    addToast('Review link copied to clipboard', 'success')
  }

  const sendInvite = async (t: Transcript) => {
    const link = `${BASE_URL}/review/${t.id}`
    const firstName = t.speaker_name?.split(' ')[0] || 'Speaker'
    const subject = encodeURIComponent(`Awaiting Your Review: ${t.talk_title}`)
    const body = encodeURIComponent(
      `${firstName},\n\n` +
      `Will you please take a moment to review this document "${t.talk_title}", revising it as you see fit, then press "Approve" when ready to be published.\n\n` +
      `${link}\n\n` +
      `Thank you!`
    )

    if (!t.reviewer_email) {
      addToast('No reviewer email set for this transcript', 'error')
      return
    }

    window.location.href = `mailto:${t.reviewer_email}?subject=${subject}&body=${body}`

    // Small delay so the mail client has time to launch before the confirm dialog appears
    await new Promise(resolve => setTimeout(resolve, 500))

    if (window.confirm('Did you send the email?')) {
      const { error } = await supabase
        .from('talk_transcripts')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', t.id)

      if (error) {
        addToast('Failed to record email sent status', 'error')
      } else {
        addToast('Email marked as sent', 'success')
        fetchTranscripts()
      }
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase
      .from('talk_transcripts')
      .delete()
      .eq('id', id)

    if (error) {
      addToast(`Error deleting transcript: ${error.message}`, 'error')
    } else {
      setTranscripts(prev => prev.filter(t => t.id !== id))
      addToast('Transcript deleted', 'success')
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
            <button
              onClick={() => setShowContactsModal(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Contacts
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
          <>
            {/* Search and filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by speaker, title, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="in_progress">In Progress</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            {filteredTranscripts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No transcripts match your search</p>
              </div>
            ) : (
            <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {filteredTranscripts.map((t) => (
                <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{t.talk_title}</div>
                      <div className="text-sm text-gray-600">{t.speaker_name}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {parseLocalDate(t.talk_date).toLocaleDateString()}
                    {t.reviewer_email && <span> • {t.reviewer_email}</span>}
                    {t.due_date && t.status !== 'approved' && (() => {
                      const info = getDueDateInfo(t.due_date)
                      return (
                        <span>
                          {' '}• Due: {parseLocalDate(t.due_date).toLocaleDateString()}
                          {info.label && <span className={`ml-1 font-medium ${info.colorClass}`}>{info.label}</span>}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-3 items-center border-t border-gray-100 pt-3">
                    <button
                      onClick={() => sendInvite(t)}
                      className={`text-sm ${!t.reviewer_email ? 'text-gray-400' : t.email_sent_at ? 'text-green-600' : 'text-purple-600'}`}
                    >
                      {t.email_sent_at
                        ? `Sent ${new Date(t.email_sent_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`
                        : 'Send'}
                    </button>
                    <button
                      onClick={() => copyReviewLink(t.id)}
                      className="text-sm text-blue-600"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => setEditTranscript(t)}
                      className="text-sm text-green-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setViewTranscript(t)}
                      className="text-sm text-gray-600"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(t.id)}
                      className="text-red-500 p-1 ml-auto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Speaker</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Talk Title</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Due</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTranscripts.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.speaker_name}</div>
                        {t.reviewer_email && (
                          <div className="text-sm text-gray-500">{t.reviewer_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{t.talk_title}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {parseLocalDate(t.talk_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.due_date ? (
                          <div className="flex items-center gap-1">
                            <span>{parseLocalDate(t.due_date).toLocaleDateString()}</span>
                            {t.status !== 'approved' && (() => {
                              const info = getDueDateInfo(t.due_date)
                              return info.label ? <span className={`text-xs font-medium ${info.colorClass}`}>{info.label}</span> : null
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-3 justify-end items-center">
                          <button
                            onClick={() => sendInvite(t)}
                            className={`text-sm ${!t.reviewer_email ? 'text-gray-400 cursor-not-allowed' : t.email_sent_at ? 'text-green-600 hover:underline' : 'text-purple-600 hover:underline'}`}
                            title={!t.reviewer_email ? 'No email set' : t.email_sent_at ? `Resend to ${t.reviewer_email}` : `Email ${t.reviewer_email}`}
                          >
                            {t.email_sent_at
                              ? `Sent ${new Date(t.email_sent_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`
                              : 'Send'}
                          </button>
                          <button
                            onClick={() => copyReviewLink(t.id)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Copy Link
                          </button>
                          <button
                            onClick={() => setEditTranscript(t)}
                            className="text-sm text-green-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setViewTranscript(t)}
                            className="text-sm text-gray-600 hover:underline"
                          >
                            View
                          </button>
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
            </>
            )}
          </>
        )}
      </main>

      {showAddModal && (
        <AddTranscriptModal
          contacts={contacts}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchTranscripts()
          }}
        />
      )}

      {showContactsModal && (
        <ContactsModal
          contacts={contacts}
          onClose={() => setShowContactsModal(false)}
          onRefresh={fetchContacts}
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

      {viewTranscript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewTranscript.talk_title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {viewTranscript.speaker_name} • {parseLocalDate(viewTranscript.talk_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={viewTranscript.status} />
                  <button
                    onClick={() => setViewTranscript(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {viewTranscript.status === 'approved' && viewTranscript.approved_at && (
                <p className="text-sm text-green-600 mt-2">
                  Approved on {new Date(viewTranscript.approved_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {viewTranscript.revised_text ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase">Approved/Revised Text</h3>
                  <div
                    className="prose max-w-none text-gray-800 font-serif"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewTranscript.revised_text) }}
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase">Original Text</h3>
                  <div
                    className="prose max-w-none text-gray-800 font-serif"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewTranscript.original_text) }}
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <Link
                href={`/review/${viewTranscript.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Open Review Page
              </Link>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    exportAsText(viewTranscript)
                    addToast('Exported as .txt', 'success')
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                >
                  Export .txt
                </button>
                <button
                  onClick={async () => {
                    try {
                      await exportAsDocx(viewTranscript)
                      addToast('Exported as .docx', 'success')
                    } catch {
                      addToast('Failed to export .docx', 'error')
                    }
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                >
                  Export .docx
                </button>
                <button
                  onClick={async () => {
                    const date = parseLocalDate(viewTranscript.talk_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                    const header = `${viewTranscript.talk_title} — ${date}\n\n`
                    const rawText = viewTranscript.revised_text || viewTranscript.original_text
                    const text = stripHtml(rawText)
                    await navigator.clipboard.writeText(header + text)
                    addToast('Text copied to clipboard', 'success')
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => setViewTranscript(null)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editTranscript && (
        <EditTranscriptModal
          transcript={editTranscript}
          onClose={() => setEditTranscript(null)}
          onSuccess={() => {
            setEditTranscript(null)
            fetchTranscripts()
          }}
        />
      )}
    </div>
  )
}

function EditTranscriptModal({
  transcript,
  onClose,
  onSuccess
}: {
  transcript: Transcript
  onClose: () => void
  onSuccess: () => void
}) {
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    speaker_name: transcript.speaker_name,
    reviewer_email: transcript.reviewer_email || '',
    talk_title: transcript.talk_title,
    talk_date: transcript.talk_date,
    due_date: transcript.due_date || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('talk_transcripts')
      .update({
        ...form,
        due_date: form.due_date || null,
        reviewer_email: form.reviewer_email || null
      })
      .eq('id', transcript.id)

    if (error) {
      addToast(`Error updating transcript: ${error.message}`, 'error')
    } else {
      addToast('Transcript updated successfully', 'success')
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Transcript</h2>

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
              Review Due Date
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddTranscriptModal({ contacts, onClose, onSuccess }: { contacts: Contact[]; onClose: () => void; onSuccess: () => void }) {
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    speaker_name: '',
    reviewer_email: '',
    talk_title: '',
    talk_date: new Date().toLocaleDateString('en-CA'),
    due_date: '',
    original_text: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('talk_transcripts')
      .insert({
        ...form,
        due_date: form.due_date || null,
        status: 'pending_review'
      })

    if (error) {
      addToast(`Error creating transcript: ${error.message}`, 'error')
    } else {
      addToast('Transcript created successfully', 'success')
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
              <ContactPicker
                contacts={contacts}
                value={form.speaker_name}
                onChange={(value) => setForm({ ...form, speaker_name: value })}
                onSelect={(contact) => setForm({
                  ...form,
                  speaker_name: contact.name,
                  reviewer_email: contact.email || '',
                })}
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
              Review Due Date
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transcript Text *
            </label>
            <RichTextEditor
              content={form.original_text}
              onChange={(html) => setForm({ ...form, original_text: html })}
              editorClassName="tiptap-admin"
              placeholder="Paste the transcript here..."
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
