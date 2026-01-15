import type { UploadFile } from 'antd'
import type { RcFile } from 'antd/es/upload'
import type { ChatCompletionContent } from '../model/chatTypes'

const fileToDataUrl = (file: RcFile) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })

const fileToArrayBuffer = (file: RcFile) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })

const fileToText = (file: RcFile, maxLen = 4000) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = (reader.result as string) || ''
      resolve(content.slice(0, maxLen))
    }
    reader.onerror = (err) => reject(err)
    reader.readAsText(file)
  })

export const truncateWithNotice = (text: string, maxLen = 4000) => {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}\n\n……(已截断，原文长度约 ${text.length} 字符)`
}

export const buildImageContents = async (files: UploadFile[]): Promise<ChatCompletionContent[]> => {
  const imageFiles = files.filter((f) => f.type?.startsWith('image/') && f.originFileObj)
  const contents: ChatCompletionContent[] = []
  for (const img of imageFiles) {
    const dataUrl = await fileToDataUrl(img.originFileObj as RcFile)
    contents.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    })
  }
  return contents
}

export const buildDocumentContents = async (files: UploadFile[]): Promise<ChatCompletionContent[]> => {
  const docs = files.filter((f) => !f.type?.startsWith('image/') && f.originFileObj)
  const contents: ChatCompletionContent[] = []

  const textLike = docs.filter((f) => {
    const name = f.name?.toLowerCase() || ''
    const extText = /\.(txt|md|log|csv|tsv|yaml|yml|ini|conf|cfg)$/i.test(name)
    return (
      f.type?.startsWith('text/') ||
      f.type === 'application/json' ||
      (!f.type && extText)
    )
  })

  for (const doc of textLike) {
    try {
      const text = await fileToText(doc.originFileObj as RcFile)
      contents.push({
        type: 'text',
        text: `【文件:${doc.name}】\n${truncateWithNotice(text)}`,
      })
    } catch {
      contents.push({
        type: 'text',
        text: `【文件:${doc.name}】无法读取内容（前端解析失败）`,
      })
    }
  }

  const docxLike = docs.filter(
    (f) =>
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.name.toLowerCase().endsWith('.docx')
  )

  if (docxLike.length > 0) {
    const mammoth = (await import('mammoth/mammoth.browser.js')) as typeof import('mammoth/mammoth.browser.js')
    for (const doc of docxLike) {
      try {
        const buffer = await fileToArrayBuffer(doc.originFileObj as RcFile)
        const result = await mammoth.extractRawText({ arrayBuffer: buffer })
        const raw = (result.value || '').replace(/\s+/g, ' ').trim()
        const text = raw ? truncateWithNotice(raw) : '【内容为空或无法提取】'
        contents.push({
          type: 'text',
          text: `【文件:${doc.name}】\n${text}`,
        })
      } catch {
        contents.push({
          type: 'text',
          text: `【文件:${doc.name}】无法读取内容（docx 解析失败）`,
        })
      }
    }
  }

  return contents
}

export const buildAttachmentSummary = (files: UploadFile[]): ChatCompletionContent[] => {
  if (!files.length) return []
  return files.map((file) => {
    const size = file.size ? `${(file.size / 1024).toFixed(1)} KB` : '未知大小'
    const type = file.type || '未知类型'
    return {
      type: 'text',
      // 不把内部 url/uid 发给模型，避免出现在 AI 回复里
      text: `【附件:${file.name}】类型:${type} 大小:${size}`,
    }
  })
}

export const buildUserContentChunks = async (params: {
  textToSend: string
  uploadedFiles: UploadFile[]
}): Promise<ChatCompletionContent[]> => {
  const { textToSend, uploadedFiles } = params
  const hasFiles = uploadedFiles.length > 0

  const userContentChunks: ChatCompletionContent[] = []
  if (textToSend) userContentChunks.push({ type: 'text', text: textToSend })
  if (!hasFiles) return userContentChunks

  const summaryContents = buildAttachmentSummary(uploadedFiles)
  const imageContents = await buildImageContents(uploadedFiles)
  const docContents = await buildDocumentContents(uploadedFiles)
  userContentChunks.push(...summaryContents, ...imageContents, ...docContents)
  return userContentChunks
}

