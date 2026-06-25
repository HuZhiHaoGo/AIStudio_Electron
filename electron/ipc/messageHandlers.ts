import { ipcMain } from 'electron';
import type { MessageFeedbackRequest, SendMessageRequest } from '../../shared/types/ipc';
import { publicData, readData, writeData } from '../services/appDataService';
import { sendDifyMessageFeedback, sendToDify } from '../services/difyService';
import { createId } from '../utils/id';
import { now } from '../utils/time';

const activeDifyRequests = new Map<string, AbortController>();

export function registerMessageHandlers() {
  ipcMain.handle('message:stop', async (_event, streamId: string) => {
    const controller = activeDifyRequests.get(streamId);

    if (!controller) {
      return {
        stopped: false,
      };
    }

    controller.abort();
    activeDifyRequests.delete(streamId);

    return {
      stopped: true,
    };
  });

  ipcMain.handle('message:feedback', async (_event, request: MessageFeedbackRequest) => {
    const data = await readData();
    const message = data.messages.find((item) => item.id === request.messageId);

    if (!message || message.role !== 'assistant') {
      throw new Error('未找到可反馈的 AI 回复。');
    }

    if (!message.difyMessageId) {
      throw new Error('当前消息缺少 Dify message_id，无法提交反馈。');
    }

    const conversation = data.conversations.find((item) => item.id === message.conversationId);
    const assistant = data.assistants.find((item) => item.id === conversation?.assistantId);

    if (!assistant) {
      throw new Error('未找到当前助手配置。');
    }

    const content = request.content?.trim() || '';
    await sendDifyMessageFeedback(assistant, message.difyMessageId, request.rating, content);

    message.feedbackRating = request.rating;
    message.feedbackContent = content;
    await writeData(data);

    return publicData(data);
  });

  ipcMain.handle('message:send', async (event, request: SendMessageRequest) => {
    const query = request.query.trim();

    if (!query) {
      throw new Error('请输入要发送的内容。');
    }

    const data = await readData();
    const assistant = data.assistants.find((item) => item.id === request.assistantId);
    const conversation = data.conversations.find((item) => item.id === request.conversationId);

    if (!assistant) {
      throw new Error('未找到当前助手配置。');
    }

    if (!conversation) {
      throw new Error('未找到当前会话。');
    }

    const currentTime = now();
    data.messages.push({
      id: createId(),
      conversationId: conversation.id,
      role: 'user',
      content: query,
      createdAt: currentTime,
      status: 'ok',
    });

    if (conversation.title === '新会话') {
      conversation.title = query.length > 18 ? `${query.slice(0, 18)}...` : query;
    }

    const abortController = request.streamId ? new AbortController() : undefined;

    if (request.streamId && abortController) {
      activeDifyRequests.set(request.streamId, abortController);
    }

    try {
      const result = await sendToDify(assistant, query, conversation.difyConversationId, {
        streamId: request.streamId,
        sender: event.sender,
        signal: abortController?.signal,
      });
      const replyTime = now();

      conversation.difyConversationId = result.difyConversationId || conversation.difyConversationId;
      conversation.updatedAt = replyTime;
      data.messages.push({
        id: createId(),
        conversationId: conversation.id,
        role: 'assistant',
        content: result.answer,
        attachments: result.attachments,
        difyMessageId: result.difyMessageId,
        suggestedQuestions: result.suggestedQuestions,
        createdAt: replyTime,
        status: 'ok',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送失败，请检查 Dify 配置。';
      const replyTime = now();

      conversation.updatedAt = replyTime;
      data.messages.push({
        id: createId(),
        conversationId: conversation.id,
        role: 'assistant',
        content: `发送失败：${errorMessage}`,
        createdAt: replyTime,
        status: 'error',
      });
    } finally {
      if (request.streamId) {
        activeDifyRequests.delete(request.streamId);
      }
    }

    data.conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await writeData(data);
    return publicData(data);
  });
}
