/// <reference types="vite/client" />

type Role = 'user' | 'assistant';
type MessageFeedbackRating = 'like' | 'dislike' | null;

type Assistant = {
  id: string;
  name: string;
  apiBaseUrl: string;
  apiKey?: string;
  apiKeyMasked?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type Conversation = {
  id: string;
  assistantId: string;
  title: string;
  difyConversationId?: string;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  attachments?: MessageAttachment[];
  difyMessageId?: string;
  suggestedQuestions?: string[];
  feedbackRating?: MessageFeedbackRating;
  feedbackContent?: string;
  createdAt: string;
  status?: 'ok' | 'error';
};

type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

type AppData = {
  assistants: Assistant[];
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings;
};

type AppSettings = {
  translationWebUrl: string;
};

type SaveAssistantRequest = {
  id?: string;
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
};

type SaveSettingsRequest = {
  translationWebUrl: string;
};

type SendMessageRequest = {
  assistantId: string;
  conversationId: string;
  query: string;
  streamId?: string;
};

type MessageFeedbackRequest = {
  messageId: string;
  rating: MessageFeedbackRating;
  content?: string;
};

type MessageStreamChunk = {
  streamId: string;
  content: string;
};

type DownloadFileRequest = {
  url: string;
  filename?: string;
};

type DownloadFileResult = {
  canceled: boolean;
  filePath?: string;
};

type StopMessageResult = {
  stopped: boolean;
};

interface Window {
  difyApi: {
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
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: {
      className?: string;
      src?: string;
    };
  }
}
