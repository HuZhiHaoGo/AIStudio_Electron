import type {
  Annotation, DifyAppMode, MessageAttachment, MessageFeedbackRating, PublicAppData,
} from './app';
import type { DifySseEvent } from './dify';
import type { RagflowAsset } from './citation';

export type SaveAssistantRequest = { id?: string; name: string; apiBaseUrl: string; apiKey: string; userId: string; mode: DifyAppMode };
export type RefreshAssistantRequest = { assistantId: string };
export type RefreshAllAssistantsResult = { data: PublicAppData; refreshed: number; failed: string[] };
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
export type RagflowDocumentRequest = { datasetId: string; documentId: string; filename?: string };

export type DifyApiBridge = {
  getData(): Promise<PublicAppData>;
  saveAssistant(request: SaveAssistantRequest): Promise<PublicAppData>;
  verifySettingsPassword(request: VerifySettingsPasswordRequest): Promise<boolean>;
  loadRagflowImage(request: RagflowImageRequest): Promise<RagflowAsset>;
  loadRagflowDocument(request: RagflowDocumentRequest): Promise<RagflowAsset>;
  refreshAssistant(request: RefreshAssistantRequest): Promise<PublicAppData>;
  refreshAllAssistants(): Promise<RefreshAllAssistantsResult>;
  createConversation(assistantId: string): Promise<PublicAppData>;
  renameConversation(request: RenameConversationRequest): Promise<PublicAppData>;
  deleteConversation(conversationId: string): Promise<PublicAppData>;
  sendMessage(request: SendMessageRequest): Promise<PublicAppData>;
  stopMessage(streamId: string): Promise<StopMessageResult>;
  uploadFile(request: UploadFileRequest): Promise<MessageAttachment>;
  sendMessageFeedback(request: MessageFeedbackRequest): Promise<PublicAppData>;
  createAnnotation(request: AnnotationRequest): Promise<PublicAppData>;
  deleteAnnotation(request: DeleteAnnotationRequest): Promise<PublicAppData>;
  submitHitl(request: HitlSubmitRequest): Promise<PublicAppData>;
  downloadFile(request: DownloadFileRequest): Promise<DownloadFileResult>;
  onMessageStreamChunk(callback: (chunk: MessageStreamChunk) => void): () => void;
};

export type { Annotation };
