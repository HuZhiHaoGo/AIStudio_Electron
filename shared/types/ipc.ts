import type { AppData, MessageFeedbackRating } from './app';

export type SaveAssistantRequest = {
  id?: string;
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
};

export type SaveSettingsRequest = {
  translationWebUrl: string;
};

export type SendMessageRequest = {
  assistantId: string;
  conversationId: string;
  query: string;
  streamId?: string;
};

export type MessageFeedbackRequest = {
  messageId: string;
  rating: MessageFeedbackRating;
  content?: string;
};

export type MessageStreamChunk = {
  streamId: string;
  content: string;
};

export type DownloadFileRequest = {
  url: string;
  filename?: string;
};

export type DownloadFileResult = {
  canceled: boolean;
  filePath?: string;
};

export type StopMessageResult = {
  stopped: boolean;
};

export type DifyApiBridge = {
  getData(): Promise<AppData>;
  saveAssistant(request: SaveAssistantRequest): Promise<AppData>;
  saveSettings(request: SaveSettingsRequest): Promise<AppData>;
  createConversation(assistantId: string): Promise<AppData>;
  deleteConversation(conversationId: string): Promise<AppData>;
  sendMessage(request: SendMessageRequest): Promise<AppData>;
  stopMessage(streamId: string): Promise<StopMessageResult>;
  sendMessageFeedback(request: MessageFeedbackRequest): Promise<AppData>;
  downloadFile(request: DownloadFileRequest): Promise<DownloadFileResult>;
  onMessageStreamChunk(callback: (chunk: MessageStreamChunk) => void): () => void;
};
