import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'blockquote', 'ol', 'ul', 'li']
const ALLOWED_ATTR: string[] = []

export function sanitizeHtml(html: string): string {
  if (!isHtml(html)) {
    return plainTextToHtml(html)
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

export function stripHtml(html: string): string {
  if (!isHtml(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

export function isHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const paragraphs = escaped.split(/\n\n+/)
  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
