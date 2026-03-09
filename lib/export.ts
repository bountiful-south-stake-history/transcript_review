import { Transcript, parseLocalDate } from './supabase'
import { stripHtml, isHtml } from './sanitize'

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 ]/g, '').trim()
}

export function exportAsText(transcript: Transcript): void {
  const date = parseLocalDate(transcript.talk_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const rawContent = transcript.revised_text || transcript.original_text
  const textContent = stripHtml(rawContent)
  const content = [
    transcript.talk_title,
    `${transcript.speaker_name} — ${date}`,
    '',
    textContent
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, `${sanitizeFilename(transcript.talk_title)}.txt`)
}

// Walk a DOM node tree and produce an array of TextRun-compatible objects
// with accumulated formatting from parent nodes
interface TextRunOptions {
  text: string
  bold?: boolean
  italics?: boolean
  underline?: Record<string, never>
}

function walkNode(
  node: Node,
  formatting: { bold?: boolean; italics?: boolean; underline?: boolean }
): TextRunOptions[] {
  const runs: TextRunOptions[] = []

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    if (text) {
      const run: TextRunOptions = { text }
      if (formatting.bold) run.bold = true
      if (formatting.italics) run.italics = true
      if (formatting.underline) run.underline = {}
      runs.push(run)
    }
    return runs
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    const tag = el.tagName.toLowerCase()

    const newFmt = { ...formatting }
    if (tag === 'strong' || tag === 'b') newFmt.bold = true
    if (tag === 'em' || tag === 'i') newFmt.italics = true
    if (tag === 'u') newFmt.underline = true

    for (const child of Array.from(node.childNodes)) {
      runs.push(...walkNode(child, newFmt))
    }
  }

  return runs
}

export async function exportAsDocx(transcript: Transcript): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  const date = parseLocalDate(transcript.talk_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const htmlContent = transcript.revised_text || transcript.original_text

  let paragraphs: InstanceType<typeof Paragraph>[]

  if (isHtml(htmlContent)) {
    // Parse HTML and convert to docx paragraphs
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    paragraphs = []

    for (const node of Array.from(doc.body.children)) {
      const tag = node.tagName.toLowerCase()
      const isBlockquote = tag === 'blockquote'

      // For blockquotes, process inner paragraphs or the blockquote itself
      const innerNodes = isBlockquote ? Array.from(node.children) : [node]
      if (isBlockquote && innerNodes.length === 0) {
        innerNodes.push(node)
      }

      for (const innerNode of innerNodes) {
        const textRuns = walkNode(innerNode, {})
        if (textRuns.length === 0 || textRuns.every(r => !r.text.trim())) continue

        const children = textRuns.map(r => new TextRun({
          text: r.text,
          size: 24,
          bold: r.bold,
          italics: isBlockquote ? true : r.italics,
          underline: r.underline,
        }))

        paragraphs.push(new Paragraph({
          children,
          spacing: { after: 200 },
          ...(isBlockquote ? { indent: { left: 720 } } : {}),
        }))
      }
    }
  } else {
    // Legacy plain text: split by double newlines
    paragraphs = htmlContent.split(/\n\n+/).map(
      para => new Paragraph({
        children: [new TextRun({ text: para.replace(/\n/g, ' '), size: 24 })],
        spacing: { after: 200 }
      })
    )
  }

  const docx = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: transcript.talk_title,
          heading: HeadingLevel.HEADING_1
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${transcript.speaker_name} — ${date}`, italics: true, size: 22 })
          ],
          spacing: { after: 400 }
        }),
        ...paragraphs
      ]
    }]
  })

  const blob = await Packer.toBlob(docx)
  triggerDownload(blob, `${sanitizeFilename(transcript.talk_title)}.docx`)
}
