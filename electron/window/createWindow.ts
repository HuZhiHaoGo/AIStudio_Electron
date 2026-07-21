import { BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { installEditableContextMenu } from './editableContextMenu';
import { windowIconPath } from './windowPaths';

type CreateWindowOptions = {
  isDev: boolean;
  devServerUrl?: string;
};

/**
 * 创建应用唯一的主窗口，并在这里集中维护 Renderer 的安全边界。
 * React 页面不能直接使用 Node.js；所有系统能力必须经过 preload 白名单。
 */
export function createWindow({ isDev, devServerUrl }: CreateWindowOptions) {
  const win = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 1050,
    minHeight: 680,
    title: '匠宝Bot',
    icon: windowIconPath(),
    backgroundColor: '#F4F8FF',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  installEditableContextMenu(win);

  // 无应用菜单时仍保留开发者工具快捷键，方便排查 Renderer 问题。
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // 外部链接交给系统浏览器，Electron 内部不创建不受控的新窗口。
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
