import fs from 'node:fs/promises';
import path from 'node:path';
import type { AdminConfig } from '../../shared/types/app';
import { now } from '../utils/time';
import { app } from 'electron';
import { adminConfigPath, bundledAdminConfigPath } from '../window/windowPaths';
import { defaultCapabilities, normalizeMode } from './dify/capabilities';

export function defaultAdminConfig(): AdminConfig {
  const createdAt = now();

  return {
    assistants: [
      {
        id: 'default-assistant',
        name: '默认助手',
        apiBaseUrl: process.env.DIFY_API_BASE_URL || 'http://你的内网dify地址/v1',
        apiKey: process.env.DIFY_API_KEY || '',
        userId: process.env.DIFY_USER_ID || 'desktop-demo-user',
        mode: 'chat',
        capabilities: defaultCapabilities('chat'),
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

export function normalizeAdminConfig(config: Partial<AdminConfig>): AdminConfig {
  const currentTime = now();

  return {
    assistants: (config.assistants || []).map((assistant, index) => {
      const mode = normalizeMode(assistant.mode, 'chat');
      return {
        id: assistant.id || `assistant-${index + 1}`,
        name: assistant.name || `助手${index + 1}`,
        apiBaseUrl: assistant.apiBaseUrl || '',
        apiKey: assistant.apiKey || '',
        userId: assistant.userId || 'desktop-demo-user',
        mode,
        description: assistant.description || '',
        iconUrl: assistant.iconUrl || '',
        capabilities: assistant.capabilities || defaultCapabilities(mode),
        createdAt: assistant.createdAt || currentTime,
        updatedAt: assistant.updatedAt || currentTime,
      };
    }),
  };
}

export async function writeAdminConfig(config: AdminConfig) {
  const filePath = adminConfigPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(normalizeAdminConfig(config), null, 2), 'utf-8');
}

export async function readAdminConfig(): Promise<AdminConfig> {
  const filePath = adminConfigPath();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return normalizeAdminConfig(JSON.parse(content) as Partial<AdminConfig>);
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';

    if (error instanceof SyntaxError) {
      await fs.rename(filePath, `${filePath}.corrupt-${Date.now()}`).catch(() => undefined);
    } else if (errorCode && errorCode !== 'ENOENT') {
      throw new Error(`管理员配置文件读取失败：${filePath}`);
    }

    let config = defaultAdminConfig();
    if (app.isPackaged) {
      try {
        config = normalizeAdminConfig(JSON.parse(await fs.readFile(bundledAdminConfigPath(), 'utf-8')) as Partial<AdminConfig>);
      } catch {
        // 安装包未附带有效配置时使用环境变量和默认值。
      }
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await writeAdminConfig(config);
    return config;
  }
}
