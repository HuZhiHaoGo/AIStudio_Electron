import type {
  DownloadFileRequest,
  MessageFeedbackRequest,
  SaveAssistantRequest,
  SaveSettingsRequest,
  SendMessageRequest,
} from '../../shared/types/ipc';

export const difyApiClient = {
  getData: () => window.difyApi.getData(),
  saveAssistant: (request: SaveAssistantRequest) => window.difyApi.saveAssistant(request),
  saveSettings: (request: SaveSettingsRequest) => window.difyApi.saveSettings(request),
  createConversation: (assistantId: string) => window.difyApi.createConversation(assistantId),
  deleteConversation: (conversationId: string) => window.difyApi.deleteConversation(conversationId),
  sendMessage: (request: SendMessageRequest) => window.difyApi.sendMessage(request),
  stopMessage: (streamId: string) => window.difyApi.stopMessage(streamId),
  sendMessageFeedback: (request: MessageFeedbackRequest) => window.difyApi.sendMessageFeedback(request),
  downloadFile: (request: DownloadFileRequest) => window.difyApi.downloadFile(request),
  onMessageStreamChunk: window.difyApi.onMessageStreamChunk,
};
