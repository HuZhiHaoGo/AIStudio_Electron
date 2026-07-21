import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppData, PublicAppData } from '../../shared/types/app';
import { dataFilePath } from '../window/windowPaths';
import { readAdminConfig } from './adminConfigService';
import { migrateStoredMessages } from './messageMigration';

function maskKey(apiKey: string) {
  if (!apiKey) {
    return '';
  }

  if (apiKey.length <= 10) {
    return '******';
  }

  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

export function publicData(data: AppData): PublicAppData {
  return {
    ...data,
    assistants: data.assistants.map(({ apiKey: _apiKey, ...assistant }) => ({
      ...assistant,
      apiKeyMasked: maskKey(_apiKey),
    })),
  };
}

export function defaultData(): AppData {
  return {
    schemaVersion: 3,
    assistants: [],
    conversations: [],
    messages: [],
    annotations: [],
  };
}

export async function readData(): Promise<AppData> {
  const filePath = dataFilePath();
  const adminConfig = await readAdminConfig();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as AppData;

    return {
      schemaVersion: 3,
      assistants: adminConfig.assistants,
      conversations: data.conversations || [],
      messages: migrateStoredMessages(data.messages || []),
      annotations: data.annotations || [],
    };
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (error instanceof SyntaxError) {
      await fs.rename(filePath, `${filePath}.corrupt-${Date.now()}`).catch(() => undefined);
    } else if (errorCode && errorCode !== 'ENOENT') {
      throw new Error(`本地数据读取失败：${filePath}`);
    }
    const data = {
      ...defaultData(),
      assistants: adminConfig.assistants,
    };
    await writeData(data);
    return data;
  }
}

export async function writeData(data: AppData) {
  const filePath = dataFilePath();
  const storedData: AppData = {
    schemaVersion: 3,
    assistants: [],
    conversations: data.conversations,
    messages: data.messages,
    annotations: data.annotations,
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(storedData, null, 2), 'utf-8');
}
