/**
 * Main 进程中 IPC 频道名称的运行时来源。
 * 沙箱 preload 不能加载本文件，因此会内联同一份值，并通过 TypeScript
 * satisfies 在编译期精确校验。请求和返回类型定义在 shared/types/ipc.ts。
 */
export const IPC_CHANNELS = {
  appGetData: 'app:get-data',
  settingsVerifyPassword: 'settings:verify-password',
  assistantSave: 'assistant:save',
  assistantRefresh: 'assistant:refresh',
  assistantRefreshAll: 'assistant:refresh-all',
  conversationCreate: 'conversation:create',
  conversationRename: 'conversation:rename',
  conversationDelete: 'conversation:delete',
  messageSend: 'message:send',
  messageStop: 'message:stop',
  messageFeedback: 'message:feedback',
  messageAnnotate: 'message:annotate',
  messageHitlSubmit: 'message:hitl-submit',
  annotationDelete: 'annotation:delete',
  fileUpload: 'file:upload',
  fileDownload: 'file:download',
  ragflowImage: 'ragflow:image',
  ragflowDocument: 'ragflow:document',
  messageStreamChunk: 'message:stream-chunk',
} as const;
