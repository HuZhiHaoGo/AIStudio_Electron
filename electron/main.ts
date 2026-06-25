import { app, BrowserWindow, Menu } from 'electron';
import dotenv from 'dotenv';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { createWindow } from './window/createWindow';

dotenv.config();

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  createWindow({
    isDev,
    devServerUrl: process.env.VITE_DEV_SERVER_URL,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow({
        isDev,
        devServerUrl: process.env.VITE_DEV_SERVER_URL,
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
