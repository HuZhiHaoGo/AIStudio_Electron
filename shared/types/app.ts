export type Role = 'user' | 'assistant';

export type MessageFeedbackRating = 'like' | 'dislike' | null;

export type Assistant = {
  id: string;
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  apiKeyMasked?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  assistantId: string;
  title: string;
  difyConversationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
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

export type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type AppSettings = {
  translationWebUrl: string;
};

export type AppData = {
  assistants: Assistant[];
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings;
};

export type AdminConfig = {
  assistants: Assistant[];
  translationWebUrl: string;
};
