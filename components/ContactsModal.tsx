'use client'

import { useState } from 'react'
import { supabase, Contact } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

interface ContactsModalProps {
  contacts: Contact[]
  onClose: () => void
  onRefresh: () => void
}

export default function ContactsModal({ contacts, onClose, onRefresh }: ContactsModalProps) {
  const { addToast } = useToast()
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('contacts')
      .insert({
        name: newName.trim(),
        email: newEmail.trim() || null,
        role: newRole.trim() || null,
      })

    if (error) {
      addToast(`Error adding contact: ${error.message}`, 'error')
    } else {
      addToast('Contact added', 'success')
      setNewName('')
      setNewEmail('')
      setNewRole('')
      onRefresh()
    }
    setSaving(false)
  }

  const handleEdit = async (id: string) => {
    const { error } = await supabase
      .from('contacts')
      .update({
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        role: editForm.role.trim() || null,
      })
      .eq('id', id)

    if (error) {
      addToast(`Error updating contact: ${error.message}`, 'error')
    } else {
      addToast('Contact updated', 'success')
      setEditingId(null)
      onRefresh()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    if (error) {
      addToast(`Error deleting contact: ${error.message}`, 'error')
    } else {
      addToast('Contact deleted', 'success')
      setDeleteConfirm(null)
      onRefresh()
    }
  }

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditForm({
      name: contact.name,
      email: contact.email || '',
      role: contact.role || '',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Contacts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Contact Form */}
        <form onSubmit={handleAdd} className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </form>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-4">
          {contacts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No contacts yet. Add one above.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="text-sm">
                    {editingId === contact.id ? (
                      <>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(contact.id)}
                            className="text-sm text-green-600 hover:underline mr-3"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-4 text-gray-900">{contact.name}</td>
                        <td className="py-2 pr-4 text-gray-600">{contact.email || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{contact.role || '—'}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEdit(contact)}
                            className="text-sm text-blue-600 hover:underline mr-3"
                          >
                            Edit
                          </button>
                          {deleteConfirm === contact.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="text-sm text-red-600 hover:underline mr-2"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-sm text-gray-500 hover:underline"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(contact.id)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
