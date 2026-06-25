import fs from 'node:fs/promises';
import path from 'node:path';
import type { AdminConfig } from '../../shared/types/app';
import { now } from '../utils/time';
import { adminConfigPath } from '../window/windowPaths';

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
        createdAt,
        updatedAt: createdAt,
      },
    ],
    translationWebUrl: process.env.TRANSLATION_WEB_URL || '',
  };
}

export function normalizeAdminConfig(config: Partial<AdminConfig>): AdminConfig {
  const currentTime = now();

  return {
    assistants: (config.assistants || []).map((assistant, index) => ({
      id: assistant.id || `assistant-${index + 1}`,
      name: assistant.name || `助手${index + 1}`,
      apiBaseUrl: assistant.apiBaseUrl || '',
      apiKey: assistant.apiKey || '',
      userId: assistant.userId || 'desktop-demo-user',
      createdAt: assistant.createdAt || currentTime,
      updatedAt: assistant.updatedAt || currentTime,
    })),
    translationWebUrl: config.translationWebUrl || '',
  };
}

export async function readAdminConfig(): Promise<AdminConfig> {
  const filePath = adminConfigPath();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return normalizeAdminConfig(JSON.parse(content) as Partial<AdminConfig>);
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';

    if (errorCode && errorCode !== 'ENOENT') {
      throw new Error(`管理员配置文件读取失败：${filePath}`);
    }

    const config = defaultAdminConfig();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
    return config;
  }
}
