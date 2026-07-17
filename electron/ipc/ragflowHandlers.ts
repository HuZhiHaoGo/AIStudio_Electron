import { ipcMain } from 'electron';
import type { RagflowDocumentRequest, RagflowImageRequest } from '../../shared/types/ipc';
import { loadRagflowDocument, loadRagflowImage } from '../services/ragflow/client';

export function registerRagflowHandlers() {
  ipcMain.handle('ragflow:image', (_event, request: RagflowImageRequest) => loadRagflowImage(request.imageId, request.datasetId));
  ipcMain.handle('ragflow:document', (_event, request: RagflowDocumentRequest) => loadRagflowDocument(request.datasetId, request.documentId));
}

