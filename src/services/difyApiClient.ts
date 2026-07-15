import type {
  AnnotationRequest, DeleteAnnotationRequest, DownloadFileRequest, HitlSubmitRequest,
  MessageFeedbackRequest, RenameConversationRequest, SaveAssistantRequest, SaveSettingsRequest,
  SendMessageRequest, SyncConversationsRequest, UploadFileRequest,
} from '../../shared/types/ipc';

export const difyApiClient = {
  getData: () => window.difyApi.getData(),
  saveAssistant: (request: SaveAssistantRequest) => window.difyApi.saveAssistant(request),
  saveSettings: (request: SaveSettingsRequest) => window.difyApi.saveSettings(request),
  refreshAssistant: (assistantId: string) => window.difyApi.refreshAssistant({ assistantId }),
  refreshAllAssistants: () => window.difyApi.refreshAllAssistants(),
  createConversation: (assistantId: string) => window.difyApi.createConversation(assistantId),
  renameConversation: (request: RenameConversationRequest) => window.difyApi.renameConversation(request),
  deleteConversation: (conversationId: string) => window.difyApi.deleteConversation(conversationId),
  syncConversations: (request: SyncConversationsRequest) => window.difyApi.syncConversations(request),
  sendMessage: (request: SendMessageRequest) => window.difyApi.sendMessage(request),
  stopMessage: (streamId: string) => window.difyApi.stopMessage(streamId),
  uploadFile: (request: UploadFileRequest) => window.difyApi.uploadFile(request),
  sendMessageFeedback: (request: MessageFeedbackRequest) => window.difyApi.sendMessageFeedback(request),
  createAnnotation: (request: AnnotationRequest) => window.difyApi.createAnnotation(request),
  deleteAnnotation: (request: DeleteAnnotationRequest) => window.difyApi.deleteAnnotation(request),
  submitHitl: (request: HitlSubmitRequest) => window.difyApi.submitHitl(request),
  downloadFile: (request: DownloadFileRequest) => window.difyApi.downloadFile(request),
  onMessageStreamChunk: window.difyApi.onMessageStreamChunk,
};
