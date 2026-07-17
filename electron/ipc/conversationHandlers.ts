import { ipcMain } from 'electron';
import type { Conversation } from '../../shared/types/app';
import type { RenameConversationRequest } from '../../shared/types/ipc';
import { publicData, readData, writeData } from '../services/appDataService';
import { deleteDifyConversation, renameDifyConversation } from '../services/dify/client';
import { createId } from '../utils/id';
import { now } from '../utils/time';

export function registerConversationHandlers() {
  ipcMain.handle('conversation:create', async (_event, assistantId: string) => {
    const data = await readData();
    const currentTime = now();
    data.conversations.unshift({ id: createId(), assistantId, title: '新会话', inputs: {}, createdAt: currentTime, updatedAt: currentTime });
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle('conversation:rename', async (_event, request: RenameConversationRequest) => {
    const data = await readData();
    const conversation = data.conversations.find((item) => item.id === request.conversationId);
    const assistant = data.assistants.find((item) => item.id === conversation?.assistantId);
    if (!conversation || !assistant) throw new Error('未找到会话。');
    if (conversation.difyConversationId && assistant.capabilities?.supportsConversation) {
      await renameDifyConversation(assistant, conversation.difyConversationId, request.title);
    }
    conversation.title = request.title.trim() || '新会话';
    conversation.updatedAt = now();
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle('conversation:delete', async (_event, conversationId: string) => {
    const data = await readData();
    const conversation = data.conversations.find((item) => item.id === conversationId);
    const assistant = data.assistants.find((item) => item.id === conversation?.assistantId);
    if (conversation?.difyConversationId && assistant?.capabilities?.supportsConversation) {
      await deleteDifyConversation(assistant, conversation.difyConversationId).catch(() => undefined);
    }
    data.conversations = data.conversations.filter((item) => item.id !== conversationId);
    data.messages = data.messages.filter((message) => message.conversationId !== conversationId);
    await writeData(data);
    return publicData(data);
  });
}
