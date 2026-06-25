import { BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { windowIconPath } from './windowPaths';

type CreateWindowOptions = {
  isDev: boolean;
  devServerUrl?: string;
};

export function createWindow({ isDev, devServerUrl }: CreateWindowOptions) {
  const win = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 1050,
    minHeight: 680,
    title: '匠宝Bot',
    icon: windowIconPath(),
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  if (isDev && devServerUrl) {
    void win.loadURL(devServerUrl);
    return win;
  }

  void win.loadFile(path.join(__dirname, '../../../dist/index.html'));
  return win;
}
