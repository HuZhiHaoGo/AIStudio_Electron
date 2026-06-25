import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppData } from '../../shared/types/app';
import { dataFilePath } from '../window/windowPaths';
import { readAdminConfig } from './adminConfigService';

function maskKey(apiKey: string) {
  if (!apiKey) {
    return '';
  }

  if (apiKey.length <= 10) {
    return '******';
  }

  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

export function publicData(data: AppData) {
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
    assistants: [],
    conversations: [],
    messages: [],
    settings: {
      translationWebUrl: '',
    },
  };
}

export async function readData(): Promise<AppData> {
  const filePath = dataFilePath();
  const adminConfig = await readAdminConfig();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as AppData;

    return {
      assistants: adminConfig.assistants,
      conversations: data.conversations || [],
      messages: (data.messages || []).map((message) => ({
        ...message,
        attachments: message.attachments || [],
        suggestedQuestions: message.suggestedQuestions || [],
        feedbackRating: message.feedbackRating ?? null,
        feedbackContent: message.feedbackContent || '',
      })),
      settings: {
        translationWebUrl: adminConfig.translationWebUrl,
      },
    };
  } catch {
    const data = {
      ...defaultData(),
      assistants: adminConfig.assistants,
      settings: {
        translationWebUrl: adminConfig.translationWebUrl,
      },
    };
    await writeData(data);
    return data;
  }
}

export async function writeData(data: AppData) {
  const filePath = dataFilePath();
  const storedData: AppData = {
    assistants: [],
    conversations: data.conversations,
    messages: data.messages,
    settings: {
      translationWebUrl: '',
    },
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(storedData, null, 2), 'utf-8');
}
