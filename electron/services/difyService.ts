import type { WebContents } from 'electron';
import type { Assistant, MessageAttachment, MessageFeedbackRating } from '../../shared/types/app';
import type { DifyFile, DifyStreamEvent, SendToDifyResult } from '../../shared/types/dify';
import { createId } from '../utils/id';
import { wait } from '../utils/time';

export type DifyStreamContext = {
  streamId?: string;
  sender: WebContents;
  signal?: AbortSignal;
};

export async function sendToDify(
  assistant: Assistant,
  query: string,
  difyConversationId?: string,
  stream?: DifyStreamContext,
): Promise<SendToDifyResult> {
  const baseUrl = assistant.apiBaseUrl?.replace(/\/$/, '');
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let answer = '';
  let finalAnswer = '';
  let nextDifyConversationId: string | undefined;
  let difyMessageId: string | undefined;
  const attachments: MessageAttachment[] = [];
  const seenAttachmentKeys = new Set<string>();

  function normalizeDifyUrl(value?: string | null) {
    if (!value) {
      return '';
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return new URL(value, baseUrl).toString();
  }

  function normalizeMarkdownFileLinks(content: string) {
    return content.replace(/\]\((\/files\/[^)]+)\)/g, (_match, filePath: string) => {
      return `](${normalizeDifyUrl(filePath)})`;
    });
  }

  function collectFiles(files?: DifyFile[]) {
    if (!files?.length) {
      return;
    }

    for (const file of files) {
      const url = normalizeDifyUrl(file.url || file.remote_url);
      const name = file.filename || file.name || '下载文件';

      if (!url) {
        continue;
      }

      const duplicateKey = file.related_id || url || name;
      if (seenAttachmentKeys.has(duplicateKey)) {
        continue;
      }

      seenAttachmentKeys.add(duplicateKey);
      attachments.push({
        id: file.related_id || createId(),
        name,
        url,
        mimeType: file.mime_type,
        size: file.size,
      });
    }
  }

  function collectFilesFromEvent(data: DifyStreamEvent) {
    collectFiles(data.data?.outputs?.files);
    collectFiles(data.data?.files);
    collectFiles(data.files);
  }

  function handleSseBlock(block: string) {
    const dataLines = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());

    for (const dataLine of dataLines) {
      if (!dataLine || dataLine === '[DONE]') {
        continue;
      }

      const data = JSON.parse(dataLine) as DifyStreamEvent;
      const outputAnswer = data.data?.outputs?.answer ? normalizeMarkdownFileLinks(data.data.outputs.answer) : '';
      const chunk = normalizeMarkdownFileLinks(data.answer || '');

      collectFilesFromEvent(data);

      if (outputAnswer) {
        finalAnswer = outputAnswer;
      }

      if (chunk) {
        answer += chunk;
        if (stream?.streamId) {
          stream.sender.send('message:stream-chunk', {
            streamId: stream.streamId,
            content: chunk,
          });
        }
      }

      if (data.conversation_id) {
        nextDifyConversationId = data.conversation_id;
      }

      if (data.message_id) {
        difyMessageId = data.message_id;
      }
    }
  }

  try {
    const response = await fetch(`${baseUrl}/chat-messages`, {
      method: 'POST',
      signal: stream?.signal,
      headers: {
        Authorization: `Bearer ${assistant.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: 'streaming',
        conversation_id: difyConversationId || '',
        user: assistant.userId || 'desktop-demo-user',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI 请求失败：HTTP ${response.status} ${detail}`);
    }

    if (!response.body) {
      throw new Error('AI 未返回可读取的流。');
    }

    const reader = response.body.getReader();

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        handleSseBlock(block);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      handleSseBlock(buffer);
    }
  } catch (error) {
    if (stream?.signal?.aborted) {
      return {
        answer: answer || '已停止生成。',
        difyConversationId: nextDifyConversationId,
        difyMessageId,
        attachments,
        suggestedQuestions: [],
        canceled: true,
      };
    }

    throw error;
  }

  const suggestedQuestions = difyMessageId ? await fetchSuggestedQuestionsWithRetry(assistant, difyMessageId) : [];
  const completeAnswer = finalAnswer || answer;

  return {
    answer: completeAnswer || `${assistant.name} 返回了空回答。`,
    difyConversationId: nextDifyConversationId,
    difyMessageId,
    attachments,
    suggestedQuestions,
  };
}

export async function fetchSuggestedQuestionsWithRetry(assistant: Assistant, messageId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const questions = await fetchSuggestedQuestions(assistant, messageId);

      if (questions.length || attempt === 2) {
        return questions;
      }
    } catch {
      if (attempt === 2) {
        return [];
      }
    }

    await wait(350);
  }

  return [];
}

export async function fetchSuggestedQuestions(assistant: Assistant, messageId: string) {
  const baseUrl = assistant.apiBaseUrl?.replace(/\/$/, '');
  const user = encodeURIComponent(assistant.userId || 'desktop-demo-user');
  const response = await fetch(`${baseUrl}/messages/${encodeURIComponent(messageId)}/suggested?user=${user}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${assistant.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`建议问题获取失败：HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    result?: string;
    data?: unknown;
  };

  if (body.result !== 'success' || !Array.isArray(body.data)) {
    return [];
  }

  return body.data.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
}

export async function sendDifyMessageFeedback(
  assistant: Assistant,
  messageId: string,
  rating: MessageFeedbackRating,
  content: string,
) {
  const baseUrl = assistant.apiBaseUrl?.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/messages/${encodeURIComponent(messageId)}/feedbacks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${assistant.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rating,
      user: assistant.userId || 'desktop-demo-user',
      content,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`反馈提交失败：HTTP ${response.status} ${detail}`);
  }

  const body = (await response.json()) as {
    result?: string;
  };

  if (body.result !== 'success') {
    throw new Error('反馈提交失败：Dify 未返回 success。');
  }
}
