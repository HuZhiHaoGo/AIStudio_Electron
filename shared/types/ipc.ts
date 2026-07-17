import type {
  Annotation, AppData, DifyAppMode, MessageAttachment, MessageFeedbackRating,
} from './app';
import type { DifySseEvent } from './dify';
import type { RagflowAsset } from './citation';

export type SaveAssistantRequest = { id?: string; name: string; apiBaseUrl: string; apiKey: string; userId: string; mode: DifyAppMode };
export type SaveSettingsRequest = { translationWebUrl: string };
export type RefreshAssistantRequest = { assistantId: string };
export type RefreshAllAssistantsResult = { data: AppData; refreshed: number; failed: string[] };
export type RenameConversationRequest = { conversationId: string; title: string };
export type SendMessageRequest = {
  assistantId: string; conversationId: string; query: string; streamId?: string;
  inputs?: Record<string, unknown>; files?: MessageAttachment[];
};
export type MessageFeedbackRequest = { messageId: string; rating: MessageFeedbackRating; content?: string };
export type AnnotationRequest = { messageId: string; question: string; answer: string };
export type DeleteAnnotationRequest = { assistantId: string; annotationId: string };
export type HitlSubmitRequest = { messageId: string; inputs: Record<string, string>; action: string };
export type UploadFileRequest = { assistantId: string; name: string; mimeType: string; bytes: Uint8Array };
export type MessageStreamChunk = { streamId: string; content: string; event?: DifySseEvent };
export type DownloadFileRequest = { url: string; filename?: string };
export type DownloadFileResult = { canceled: boolean; filePath?: string };
export type StopMessageResult = { stopped: boolean };
export type VerifySettingsPasswordRequest = { password: string };
export type RagflowImageRequest = { imageId: string; datasetId?: string };
export type RagflowDocumentRequest = { datasetId: string; documentId: string };

export type DifyApiBridge = {
  getData(): Promise<AppData>;
  saveAssistant(request: SaveAssistantRequest): Promise<AppData>;
  saveSettings(request: SaveSettingsRequest): Promise<AppData>;
  verifySettingsPassword(request: VerifySettingsPasswordRequest): Promise<boolean>;
  loadRagflowImage(request: RagflowImageRequest): Promise<RagflowAsset>;
  loadRagflowDocument(request: RagflowDocumentRequest): Promise<RagflowAsset>;
  refreshAssistant(request: RefreshAssistantRequest): Promise<AppData>;
  refreshAllAssistants(): Promise<RefreshAllAssistantsResult>;
  createConversation(assistantId: string): Promise<AppData>;
  renameConversation(request: RenameConversationRequest): Promise<AppData>;
  deleteConversation(conversationId: string): Promise<AppData>;
  sendMessage(request: SendMessageRequest): Promise<AppData>;
  stopMessage(streamId: string): Promise<StopMessageResult>;
  uploadFile(request: UploadFileRequest): Promise<MessageAttachment>;
  sendMessageFeedback(request: MessageFeedbackRequest): Promise<AppData>;
  createAnnotation(request: AnnotationRequest): Promise<AppData>;
  deleteAnnotation(request: DeleteAnnotationRequest): Promise<AppData>;
  submitHitl(request: HitlSubmitRequest): Promise<AppData>;
  downloadFile(request: DownloadFileRequest): Promise<DownloadFileResult>;
  onMessageStreamChunk(callback: (chunk: MessageStreamChunk) => void): () => void;
};

export type { Annotation };
