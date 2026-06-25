import { app, BrowserWindow, dialog, type WebContents } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DownloadFileRequest, DownloadFileResult } from '../../shared/types/ipc';
import { safeFilename } from '../utils/filename';

export async function downloadFile(sender: WebContents, request: DownloadFileRequest): Promise<DownloadFileResult> {
  if (!/^https?:\/\//i.test(request.url)) {
    throw new Error('文件下载地址无效。');
  }

  const owner = BrowserWindow.fromWebContents(sender) || undefined;
  const defaultPath = path.join(app.getPath('downloads'), safeFilename(request.filename));
  const saveOptions = {
    title: '保存文件',
    defaultPath,
    buttonLabel: '保存',
  };
  const selected = owner ? await dialog.showSaveDialog(owner, saveOptions) : await dialog.showSaveDialog(saveOptions);

  if (selected.canceled || !selected.filePath) {
    return {
      canceled: true,
    };
  }

  const response = await fetch(request.url);

  if (!response.ok) {
    throw new Error(`文件下载失败：HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(selected.filePath, buffer);

  return {
    canceled: false,
    filePath: selected.filePath,
  };
}
