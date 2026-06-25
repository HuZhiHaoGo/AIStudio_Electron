import { ipcMain } from 'electron';
import type { DownloadFileRequest } from '../../shared/types/ipc';
import { downloadFile } from '../services/downloadService';

export function registerFileHandlers() {
  ipcMain.handle('file:download', async (event, request: DownloadFileRequest) => {
    return downloadFile(event.sender, request);
  });
}
