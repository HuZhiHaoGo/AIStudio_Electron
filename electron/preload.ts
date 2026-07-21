import { contextBridge, ipcRenderer } from 'electron';
import type {
  DownloadFileRequest,
  AnnotationRequest,
  DeleteAnnotationRequest,
  HitlSubmitRequest,
  MessageFeedbackRequest,
  MessageStreamChunk,
  SaveAssistantRequest,
  SendMessageRequest,
  UploadFileRequest,
  VerifySettingsPasswordRequest,
  RagflowDocumentRequest,
  RagflowImageRequest,
  DifyApiBridge,
} from '../shared/types/ipc';

// Electron 沙箱 preload 只能加载有限的运行时模块，因此频道值必须内联。
// satisfies 会在编译期逐项对照共享定义：频道缺失、拼写或值不一致都会报错。
const PRELOAD_CHANNELS = {
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
} satisfies typeof import('../shared/ipc/channels').IPC_CHANNELS;

// preload 运行在 Electron 的隔离环境里。
// 它的作用是：只把前端需要的少量能力暴露出去，避免 React 直接接触 Node.js 能力。

// contextBridge.exposeInMainWorld 会在 React 页面里创建 window.difyApi。
// React 只能通过这些方法和 Electron Main 通信。
const difyApiBridge: DifyApiBridge = {
  // 读取本地保存的助手、会话、消息。
  getData: () => ipcRenderer.invoke(PRELOAD_CHANNELS.appGetData),

  // 保存左侧助手配置。
  saveAssistant: (request: SaveAssistantRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.assistantSave, request),

  verifySettingsPassword: (request: VerifySettingsPasswordRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.settingsVerifyPassword, request),
  loadRagflowImage: (request: RagflowImageRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.ragflowImage, request),
  loadRagflowDocument: (request: RagflowDocumentRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.ragflowDocument, request),
  refreshAssistant: (request: { assistantId: string }) => ipcRenderer.invoke(PRELOAD_CHANNELS.assistantRefresh, request),
  refreshAllAssistants: () => ipcRenderer.invoke(PRELOAD_CHANNELS.assistantRefreshAll),

  // 为某个助手创建新会话。
  createConversation: (assistantId: string) => ipcRenderer.invoke(PRELOAD_CHANNELS.conversationCreate, assistantId),
  renameConversation: (request: { conversationId: string; title: string }) => ipcRenderer.invoke(PRELOAD_CHANNELS.conversationRename, request),

  // 删除会话以及会话下的消息。
  deleteConversation: (conversationId: string) => ipcRenderer.invoke(PRELOAD_CHANNELS.conversationDelete, conversationId),

  // 发送消息给 Main，由 Main 保存记录并调用 Dify。
  sendMessage: (request: SendMessageRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.messageSend, request),

  // 停止当前正在进行的 Dify streaming 请求。
  stopMessage: (streamId: string) => ipcRenderer.invoke(PRELOAD_CHANNELS.messageStop, streamId),
  uploadFile: (request: UploadFileRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.fileUpload, request),

  // 给 Dify 回复提交点赞、点踩或撤销反馈。
  sendMessageFeedback: (request: MessageFeedbackRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.messageFeedback, request),
  createAnnotation: (request: AnnotationRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.messageAnnotate, request),
  deleteAnnotation: (request: DeleteAnnotationRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.annotationDelete, request),
  submitHitl: (request: HitlSubmitRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.messageHitlSubmit, request),

  // 弹出系统“另存为”窗口并下载文件。
  downloadFile: (request: DownloadFileRequest) => ipcRenderer.invoke(PRELOAD_CHANNELS.fileDownload, request),

  // 返回清理函数，React 卸载监听时必须调用，避免重复追加流式内容。
  onMessageStreamChunk: (callback: (chunk: MessageStreamChunk) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: MessageStreamChunk) => callback(chunk);
    ipcRenderer.on(PRELOAD_CHANNELS.messageStreamChunk, listener);
    return () => ipcRenderer.removeListener(PRELOAD_CHANNELS.messageStreamChunk, listener);
  },
};

contextBridge.exposeInMainWorld('difyApi', difyApiBridge);
