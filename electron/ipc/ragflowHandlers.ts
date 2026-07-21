import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import type { RagflowDocumentRequest, RagflowImageRequest } from '../../shared/types/ipc';
import { loadRagflowDocument, loadRagflowImage } from '../services/ragflow/client';

export function registerRagflowHandlers() {
  ipcMain.handle(IPC_CHANNELS.ragflowImage, (_event, request: RagflowImageRequest) => loadRagflowImage(request.imageId, request.datasetId));
  ipcMain.handle(IPC_CHANNELS.ragflowDocument, (_event, request: RagflowDocumentRequest) => loadRagflowDocument(request.datasetId, request.documentId, request.filename));
}
