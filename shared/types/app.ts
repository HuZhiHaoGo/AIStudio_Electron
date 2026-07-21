export type Role = 'user' | 'assistant';
export type MessageFeedbackRating = 'like' | 'dislike' | null;
export type DifyAppMode = 'chat' | 'advanced-chat' | 'agent-chat' | 'workflow' | 'completion';
export type DifyInputType = 'text-input' | 'paragraph' | 'select' | 'number' | 'file' | 'file-list';
export type MessageStatus = 'ok' | 'error' | 'streaming' | 'paused';

export type DifyInputField = {
  type: DifyInputType;
  variable: string;
  label: string;
  required: boolean;
  default?: string | number;
  options?: string[];
  maxLength?: number;
  allowedFileTypes?: string[];
  allowedFileExtensions?: string[];
};

export type DifyFileCapabilities = {
  enabled: boolean;
  allowedFileTypes: string[];
  allowedFileExtensions: string[];
  allowedUploadMethods: Array<'local_file' | 'remote_url'>;
  numberLimits: number;
  fileSizeLimitMb?: number;
  imageFileSizeLimitMb?: number;
  audioFileSizeLimitMb?: number;
  videoFileSizeLimitMb?: number;
};

export type DifyCapabilities = {
  loaded: boolean;
  supportsConversation: boolean;
  supportsWorkflow: boolean;
  supportsCompletion: boolean;
  supportsFileUpload: boolean;
  supportsFeedback: boolean;
  supportsSuggestedQuestions: boolean;
  supportsSpeechToText: boolean;
  supportsTextToSpeech: boolean;
  supportsAnnotations: boolean;
  supportsHitl: boolean;
  inputFields: DifyInputField[];
  fileUpload: DifyFileCapabilities;
  openingStatement?: string;
  openingSuggestedQuestions: string[];
};

export type Assistant = {
  id: string;
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  apiKeyMasked?: string;
  userId: string;
  mode: DifyAppMode;
  description?: string;
  iconUrl?: string;
  capabilities?: DifyCapabilities;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  assistantId: string;
  title: string;
  difyConversationId?: string;
  inputs?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  transferMethod?: 'local_file' | 'remote_url';
  uploadFileId?: string;
  type?: string;
};

export type MessageTrace = {
  id: string;
  kind: 'agent-thought' | 'workflow' | 'node' | 'iteration' | 'loop' | 'tool';
  title: string;
  status: 'running' | 'success' | 'failed' | 'paused';
  content?: string;
  metadata?: Record<string, unknown>;
  startedAt?: number;
  finishedAt?: number;
};

export type MessageCitation = Citation;

export type HitlInput = {
  outputVariableName: string;
  type?: string;
  required?: boolean;
};

export type HitlAction = {
  id: string;
  title: string;
  buttonStyle?: string;
};

export type HitlRequest = {
  formToken: string;
  taskId?: string;
  formContent: string;
  inputs: HitlInput[];
  defaultValues: Record<string, string>;
  actions: HitlAction[];
  expirationTime: number;
  submitted?: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  attachments?: MessageAttachment[];
  difyMessageId?: string;
  taskId?: string;
  suggestedQuestions?: string[];
  feedbackRating?: MessageFeedbackRating;
  feedbackContent?: string;
  traces?: MessageTrace[];
  citations?: MessageCitation[];
  hitl?: HitlRequest;
  annotationId?: string;
  createdAt: string;
  status?: MessageStatus;
};

export type Annotation = {
  id: string;
  assistantId: string;
  question: string;
  answer: string;
  createdAt?: string;
};

export type AppData = {
  schemaVersion: 3;
  assistants: Assistant[];
  conversations: Conversation[];
  messages: Message[];
  annotations: Annotation[];
};
export type AdminConfig = { assistants: Assistant[] };

/** 可以安全暴露给渲染进程的助手数据，不包含真实 API Key。 */
export type PublicAssistant = Omit<Assistant, 'apiKey'>;

/** 渲染进程使用的应用状态；敏感配置始终留在 Electron 主进程。 */
export type PublicAppData = Omit<AppData, 'assistants'> & {
  assistants: PublicAssistant[];
};
import type { Citation } from './citation';
