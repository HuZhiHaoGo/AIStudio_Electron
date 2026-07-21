import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import type {
  AnnotationRequest, DeleteAnnotationRequest, HitlSubmitRequest, MessageFeedbackRequest, SendMessageRequest,
} from '../../shared/types/ipc';
import { publicData, readData, writeData } from '../services/appDataService';
import {
  createDifyAnnotation, deleteDifyAnnotation, resumeDifyWorkflow, runDifyApp, sendDifyMessageFeedback, submitDifyHitl,
} from '../services/dify/client';
import { createId } from '../utils/id';
import { now } from '../utils/time';

const activeDifyRequests = new Map<string, AbortController>();

export function registerMessageHandlers() {
  ipcMain.handle(IPC_CHANNELS.messageStop, async (_event, streamId: string) => {
    const controller = activeDifyRequests.get(streamId);
    if (!controller) return { stopped: false };
    controller.abort();
    activeDifyRequests.delete(streamId);
    return { stopped: true };
  });

  ipcMain.handle(IPC_CHANNELS.messageSend, async (event, request: SendMessageRequest) => {
    const query = request.query.trim();
    const data = await readData();
    const assistant = data.assistants.find((item) => item.id === request.assistantId);
    const conversation = data.conversations.find((item) => item.id === request.conversationId);
    if (!assistant || !conversation) throw new Error('未找到当前助手或会话。');
    if (!query && assistant.mode !== 'workflow') throw new Error('请输入要发送的内容。');

    const currentTime = now();
    conversation.inputs = request.inputs || conversation.inputs || {};
    data.messages.push({
      id: createId(), conversationId: conversation.id, role: 'user', content: query || '运行工作流',
      attachments: request.files || [], createdAt: currentTime, status: 'ok',
    });
    if (conversation.title === '新会话') conversation.title = (query || assistant.name).slice(0, 24);

    const controller = new AbortController();
    if (request.streamId) activeDifyRequests.set(request.streamId, controller);
    try {
      const result = await runDifyApp(assistant, {
        query, conversationId: conversation.difyConversationId, inputs: conversation.inputs, files: request.files,
      }, { streamId: request.streamId, sender: event.sender, signal: controller.signal });
      const replyTime = now();
      conversation.difyConversationId = result.difyConversationId || conversation.difyConversationId;
      conversation.updatedAt = replyTime;
      data.messages.push({
        id: createId(), conversationId: conversation.id, role: 'assistant',
        content: result.answer || (result.hitl ? '工作流等待人工处理。' : `${assistant.name} 返回了空结果。`),
        attachments: result.attachments, difyMessageId: result.difyMessageId, taskId: result.taskId,
        suggestedQuestions: result.suggestedQuestions, traces: result.traces, citations: result.citations, hitl: result.hitl,
        createdAt: replyTime, status: result.hitl ? 'paused' : 'ok',
      });
    } catch (error) {
      const replyTime = now();
      conversation.updatedAt = replyTime;
      data.messages.push({
        id: createId(), conversationId: conversation.id, role: 'assistant',
        content: `发送失败：${error instanceof Error ? error.message : '未知错误'}`,
        createdAt: replyTime, status: 'error',
      });
    } finally {
      if (request.streamId) activeDifyRequests.delete(request.streamId);
    }
    data.conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle(IPC_CHANNELS.messageFeedback, async (_event, request: MessageFeedbackRequest) => {
    const data = await readData();
    const message = data.messages.find((item) => item.id === request.messageId);
    const conversation = data.conversations.find((item) => item.id === message?.conversationId);
    const assistant = data.assistants.find((item) => item.id === conversation?.assistantId);
    if (!message || !assistant || !message.difyMessageId) throw new Error('当前消息无法提交反馈。');
    await sendDifyMessageFeedback(assistant, message.difyMessageId, request.rating, request.content?.trim() || '');
    message.feedbackRating = request.rating;
    message.feedbackContent = request.content?.trim() || '';
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle(IPC_CHANNELS.messageAnnotate, async (_event, request: AnnotationRequest) => {
    const data = await readData();
    const message = data.messages.find((item) => item.id === request.messageId);
    const conversation = data.conversations.find((item) => item.id === message?.conversationId);
    const assistant = data.assistants.find((item) => item.id === conversation?.assistantId);
    if (!message || !assistant) throw new Error('未找到要标注的消息。');
    const annotation = await createDifyAnnotation(assistant, request.question, request.answer);
    data.annotations.push(annotation);
    message.annotationId = annotation.id;
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle(IPC_CHANNELS.annotationDelete, async (_event, request: DeleteAnnotationRequest) => {
    const data = await readData();
    const assistant = data.assistants.find((item) => item.id === request.assistantId);
    if (!assistant) throw new Error('未找到助手。');
    await deleteDifyAnnotation(assistant, request.annotationId);
    data.annotations = data.annotations.filter((item) => item.id !== request.annotationId);
    for (const message of data.messages) if (message.annotationId === request.annotationId) delete message.annotationId;
    await writeData(data);
    return publicData(data);
  });

  ipcMain.handle(IPC_CHANNELS.messageHitlSubmit, async (_event, request: HitlSubmitRequest) => {
    const data = await readData();
    const message = data.messages.find((item) => item.id === request.messageId);
    const conversation = data.conversations.find((item) => item.id === message?.conversationId);
    const assistant = data.assistants.find((item) => item.id === conversation?.assistantId);
    if (!message?.hitl || !assistant) throw new Error('未找到待处理的人工介入请求。');
    await submitDifyHitl(assistant, message.hitl.formToken, request.inputs, request.action);
    message.hitl.submitted = true;
    if (message.hitl.taskId) {
      const result = await resumeDifyWorkflow(assistant, message.hitl.taskId);
      message.content = result.answer || message.content;
      message.attachments = [...(message.attachments || []), ...result.attachments];
      message.traces = [...(message.traces || []), ...result.traces];
      message.citations = [...(message.citations || []), ...result.citations];
      message.hitl = result.hitl || message.hitl;
      message.status = result.hitl ? 'paused' : 'ok';
    } else {
      message.status = 'ok';
    }
    await writeData(data);
    return publicData(data);
  });
}
