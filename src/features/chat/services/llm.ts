import type { ChatCompletionContent, ChatCompletionMessage, ChatMessageModel } from '../model/chatTypes'

export const buildLlmMessages = (params: {
  history: ChatMessageModel[]
  currentUserMessageId: string
  currentUserContentChunks: ChatCompletionContent[]
}): ChatCompletionMessage[] => {
  const { history, currentUserMessageId, currentUserContentChunks } = params

  return history.map((msg) => {
    const role = (msg.role ?? 'user') as ChatCompletionMessage['role']

    if (msg.id === currentUserMessageId && currentUserContentChunks.length > 0) {
      // 当前消息，使用多模态内容（文本+图片/文档摘要）
      if (currentUserContentChunks.length === 1 && currentUserContentChunks[0].type === 'text') {
        return {
          role,
          content: currentUserContentChunks[0].text,
        }
      }
      return { role, content: currentUserContentChunks }
    }

    const attachmentNote = msg.attachments?.length
      ? `\n[附件] ${msg.attachments.map((a) => a.name || '未命名附件').join('、')}`
      : ''

    return {
      role,
      content: `${msg.text}${attachmentNote}`,
    }
  })
}

