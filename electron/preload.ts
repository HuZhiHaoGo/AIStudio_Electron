import { contextBridge, ipcRenderer } from 'electron';
import type {
  DownloadFileRequest,
  AnnotationRequest,
  DeleteAnnotationRequest,
  HitlSubmitRequest,
  MessageFeedbackRequest,
  MessageStreamChunk,
  SaveAssistantRequest,
  SaveSettingsRequest,
  SendMessageRequest,
  UploadFileRequest,
} from '../shared/types/ipc';

// preload 运行在 Electron 的隔离环境里。
// 它的作用是：只把前端需要的少量能力暴露出去，避免 React 直接接触 Node.js 能力。

// contextBridge.exposeInMainWorld 会在 React 页面里创建 window.difyApi。
// React 只能通过这些方法和 Electron Main 通信。
contextBridge.exposeInMainWorld('difyApi', {
  // 读取本地保存的助手、会话、消息。
  getData: () => ipcRenderer.invoke('app:get-data'),

  // 保存左侧助手配置。
  saveAssistant: (request: SaveAssistantRequest) => ipcRenderer.invoke('assistant:save', request),

  // 保存全局设置。
  saveSettings: (request: SaveSettingsRequest) => ipcRenderer.invoke('settings:save', request),
  refreshAssistant: (request: { assistantId: string }) => ipcRenderer.invoke('assistant:refresh', request),
  refreshAllAssistants: () => ipcRenderer.invoke('assistant:refresh-all'),

  // 为某个助手创建新会话。
  createConversation: (assistantId: string) => ipcRenderer.invoke('conversation:create', assistantId),
  renameConversation: (request: { conversationId: string; title: string }) => ipcRenderer.invoke('conversation:rename', request),

  // 删除会话以及会话下的消息。
  deleteConversation: (conversationId: string) => ipcRenderer.invoke('conversation:delete', conversationId),

  // 发送消息给 Main，由 Main 保存记录并调用 Dify。
  sendMessage: (request: SendMessageRequest) => ipcRenderer.invoke('message:send', request),

  // 停止当前正在进行的 Dify streaming 请求。
  stopMessage: (streamId: string) => ipcRenderer.invoke('message:stop', streamId),
  uploadFile: (request: UploadFileRequest) => ipcRenderer.invoke('file:upload', request),

  // 给 Dify 回复提交点赞、点踩或撤销反馈。
  sendMessageFeedback: (request: MessageFeedbackRequest) => ipcRenderer.invoke('message:feedback', request),
  createAnnotation: (request: AnnotationRequest) => ipcRenderer.invoke('message:annotate', request),
  deleteAnnotation: (request: DeleteAnnotationRequest) => ipcRenderer.invoke('annotation:delete', request),
  submitHitl: (request: HitlSubmitRequest) => ipcRenderer.invoke('message:hitl-submit', request),

  // 弹出系统“另存为”窗口并下载文件。
  downloadFile: (request: DownloadFileRequest) => ipcRenderer.invoke('file:download', request),

  /**
   * 
   * @param callback 当有新的 Dify 流式回答片段时，Main 通过 IPC 发送 'message:stream-chunk' 事件，React 页面注册的这个回调函数就会被调用，参数 chunk 包含了这条流式回答片段的内容和所属的 streamId。React 页面可以在这个回调里把 chunk.content 追加到对应消息的显示内容里，这样用户就能看到流式更新的回答了。
   callback 是一个函数，它的类型是(chunk: MessageStreamChunk) => void 表示这个函数接收一个 chunk，不返回结果。
  * @returns 
   */
  // 监听 Dify streaming 片段。
  onMessageStreamChunk: (callback: (chunk: MessageStreamChunk) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: MessageStreamChunk) => callback(chunk);
    ipcRenderer.on('message:stream-chunk', listener);
    return () => ipcRenderer.removeListener('message:stream-chunk', listener);
  },
});
