import { Transcript, parseLocalDate } from './supabase'

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
  const content = [
    transcript.talk_title,
    `${transcript.speaker_name} — ${date}`,
    '',
    transcript.revised_text || transcript.original_text
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, `${sanitizeFilename(transcript.talk_title)}.txt`)
}

export async function exportAsDocx(transcript: Transcript): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  const date = parseLocalDate(transcript.talk_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const textContent = transcript.revised_text || transcript.original_text
  const paragraphs = textContent.split(/\n\n+/).map(
    para => new Paragraph({
      children: [new TextRun({ text: para.replace(/\n/g, ' '), size: 24 })],
      spacing: { after: 200 }
    })
  )

  const doc = new Document({
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

  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${sanitizeFilename(transcript.talk_title)}.docx`)
}
