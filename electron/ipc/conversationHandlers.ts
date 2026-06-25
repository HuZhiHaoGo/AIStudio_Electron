import { ipcMain } from 'electron';
import type { Conversation } from '../../shared/types/app';
import { publicData, readData, writeData } from '../services/appDataService';
import { createId } from '../utils/id';
import { now } from '../utils/time';

export function registerConversationHandlers() {
  ipcMain.handle('conversation:create', async (_event, assistantId: string) => {
    const data = await readData();
    const currentTime = now();
    const conversation: Conversation = {
      id: createId(),
      assistantId,
      title: '新会话',
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    data.conversations.unshift(conversation);
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle('conversation:delete', async (_event, conversationId: string) => {
    const data = await readData();
    data.conversations = data.conversations.filter((conversation) => conversation.id !== conversationId);
    data.messages = data.messages.filter((message) => message.conversationId !== conversationId);
    await writeData(data);
    return publicData(data);
  });
}
