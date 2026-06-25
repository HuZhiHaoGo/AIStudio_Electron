import { app } from 'electron';
import path from 'node:path';

export function dataFilePath() {
  return path.join(app.getPath('userData'), 'aistudio-data.json');
}

export function windowIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'app-icon.ico')
    : path.join(process.cwd(), 'build', 'app-icon.ico');
}

export function adminConfigPath() {
  const baseDir = app.isPackaged ? process.resourcesPath : process.cwd();
  return path.join(baseDir, 'config', 'app-config.json');
}
