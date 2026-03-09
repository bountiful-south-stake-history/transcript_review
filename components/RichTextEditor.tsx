'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useCallback } from 'react'
import { isHtml, plainTextToHtml } from '@/lib/sanitize'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  resetKey?: number
  className?: string
  editorClassName?: string
  placeholder?: string
}

function prepareContent(text: string): string {
  if (!text) return '<p></p>'
  return isHtml(text) ? text : plainTextToHtml(text)
}

export default function RichTextEditor({
  content,
  onChange,
  resetKey,
  className = '',
  editorClassName = '',
  placeholder = 'Paste the transcript here...',
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const isInitialRender = useRef(true)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
    ],
    content: prepareContent(content),
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `tiptap ${editorClassName}`,
        'data-placeholder': placeholder,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    // Skip the initial render — content is already set via the content prop
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    if (resetKey !== undefined) {
      editor.commands.setContent(prepareContent(content))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, editor])

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${className}`}>
      <EditorContent editor={editor} />
    </div>
  )
}
