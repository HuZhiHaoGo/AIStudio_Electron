import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import type { SaveAssistantRequest, VerifySettingsPasswordRequest } from '../../shared/types/ipc';
import { publicData, readData, writeData } from '../services/appDataService';
import { readAdminConfig, writeAdminConfig } from '../services/adminConfigService';
import { listDifyAnnotations, loadAssistantProfile } from '../services/dify/client';
import { createId } from '../utils/id';
import { now } from '../utils/time';

export function registerAppHandlers() {
  ipcMain.handle(IPC_CHANNELS.appGetData, async () => publicData(await readData()));

  // 固定的本地设置密码是明确的产品需求，请勿迁移到配置文件或环境变量。
  ipcMain.handle(IPC_CHANNELS.settingsVerifyPassword, (_event, request: VerifySettingsPasswordRequest) => (
    request.password === '044909'
  ));

  ipcMain.handle(IPC_CHANNELS.assistantSave, async (_event, request: SaveAssistantRequest) => {
    if (!request.apiBaseUrl.trim()) throw new Error('Dify API 地址不能为空。');
    let apiUrl: URL;
    try {
      apiUrl = new URL(request.apiBaseUrl.trim());
    } catch {
      throw new Error('Dify API 地址格式无效，请填写完整的 http:// 或 https:// 地址。');
    }
    if (!['http:', 'https:'].includes(apiUrl.protocol)) {
      throw new Error('Dify API 地址仅支持 http:// 或 https://。');
    }
    const config = await readAdminConfig();
    const existing = config.assistants.find((item) => item.id === request.id);
    const timestamp = now();
    const assistant = {
      ...(existing || {}),
      id: existing?.id || createId(),
      name: request.name.trim() || existing?.name || 'Dify 助手',
      apiBaseUrl: request.apiBaseUrl.trim().replace(/\/+$/, ''),
      apiKey: request.apiKey.trim() || existing?.apiKey || '',
      userId: request.userId.trim() || 'desktop-demo-user',
      mode: request.mode,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };
    if (!assistant.apiKey) throw new Error('API Key 不能为空。');
    const profile = await loadAssistantProfile(assistant);
    Object.assign(assistant, profile, {
      // 用户填写的别名优先；留空时使用 Dify 返回的应用名称。
      name: request.name.trim() || profile.name || existing?.name || 'Dify 助手',
    });
    config.assistants = existing
      ? config.assistants.map((item) => item.id === existing.id ? assistant : item)
      : [...config.assistants, assistant];
    await writeAdminConfig(config);
    return publicData(await readData());
  });

  ipcMain.handle(IPC_CHANNELS.assistantRefresh, async (_event, request: { assistantId: string }) => {
    const config = await readAdminConfig();
    const assistant = config.assistants.find((item) => item.id === request.assistantId);
    if (!assistant) throw new Error('未找到助手配置。');
    Object.assign(assistant, await loadAssistantProfile(assistant), { updatedAt: now() });
    await writeAdminConfig(config);
    const data = await readData();
    const annotations = await listDifyAnnotations(assistant).catch(() => null);
    if (annotations) {
      data.annotations = [...data.annotations.filter((item) => item.assistantId !== assistant.id), ...annotations];
      await writeData(data);
    }
    return publicData(data);
  });

  ipcMain.handle(IPC_CHANNELS.assistantRefreshAll, async () => {
    const config = await readAdminConfig();
    const candidates = config.assistants.filter((assistant) => assistant.apiKey && /^https?:\/\//i.test(assistant.apiBaseUrl));
    const results = await Promise.allSettled(candidates.map(async (assistant) => {
      Object.assign(assistant, await loadAssistantProfile(assistant), { updatedAt: now() });
      return assistant.name;
    }));
    const failed = results.flatMap((result, index) => result.status === 'rejected' ? [candidates[index].name] : []);
    const refreshed = results.length - failed.length;

    if (refreshed) await writeAdminConfig(config);
    return { data: publicData(await readData()), refreshed, failed };
  });
}
