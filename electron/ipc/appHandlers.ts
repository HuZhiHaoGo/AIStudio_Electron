import { ipcMain } from 'electron';
import { publicData, readData } from '../services/appDataService';

export function registerAppHandlers() {
  ipcMain.handle('app:get-data', async () => {
    const data = await readData();
    return publicData(data);
  });
}
