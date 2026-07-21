import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import type { DownloadFileRequest, UploadFileRequest } from '../../shared/types/ipc';
import { downloadFile } from '../services/downloadService';
import { readData } from '../services/appDataService';
import { uploadDifyFile } from '../services/dify/client';

export function registerFileHandlers() {
  ipcMain.handle(IPC_CHANNELS.fileDownload, async (event, request: DownloadFileRequest) => {
    return downloadFile(event.sender, request);
  });
  ipcMain.handle(IPC_CHANNELS.fileUpload, async (_event, request: UploadFileRequest) => {
    const data = await readData();
    const assistant = data.assistants.find((item) => item.id === request.assistantId);
    if (!assistant) throw new Error('未找到当前助手。');
    return uploadDifyFile(assistant, request.name, request.mimeType, request.bytes);
  });
}
