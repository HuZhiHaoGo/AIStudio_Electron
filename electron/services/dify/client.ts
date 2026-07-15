import type { WebContents } from 'electron';
import type {
  Annotation, Assistant, Conversation, DifyAppMode, DifyCapabilities, HitlRequest, Message, MessageAttachment,
  MessageFeedbackRating,
} from '../../../shared/types/app';
import type { DifyRunResult, DifySseEvent } from '../../../shared/types/dify';
import { DifyEventAccumulator } from './eventAccumulator';
import { defaultCapabilities, normalizeMode, parseCapabilities } from './capabilities';
import { DifySseParser } from './sseParser';

type StreamContext = { streamId?: string; sender: WebContents; signal?: AbortSignal };
type RunInput = {
  query: string; conversationId?: string; inputs?: Record<string, unknown>; files?: MessageAttachment[];
};

const base = (assistant: Assistant) => assistant.apiBaseUrl.replace(/\/$/, '');
const headers = (assistant: Assistant, json = true): Record<string, string> => ({
  Authorization: `Bearer ${assistant.apiKey}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});
const user = (assistant: Assistant) => assistant.userId || 'desktop-demo-user';

async function errorFrom(response: Response, label: string): Promise<Error> {
  const detail = await response.text().catch(() => '');
  return new Error(`${label}：HTTP ${response.status}${detail ? ` ${detail.slice(0, 500)}` : ''}`);
}

async function jsonRequest<T>(assistant: Assistant, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base(assistant)}${path}`, {
      ...init,
      // 配置、会话列表等 JSON 请求不应无限等待；streaming 请求使用独立的可取消 signal。
      signal: init?.signal || AbortSignal.timeout(10_000),
      headers: { ...headers(assistant), ...(init?.headers || {}) },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('Dify API 请求超时。');
    }
    throw error;
  }
  if (!response.ok) throw await errorFrom(response, 'Dify API 请求失败');
  return response.json() as Promise<T>;
}

export async function loadAssistantProfile(assistant: Assistant): Promise<{
  name: string; description?: string; iconUrl?: string; mode: DifyAppMode; capabilities: DifyCapabilities;
}> {
  const [parameters, info, site] = await Promise.all([
    // /parameters 是所有 Dify 应用的基础接口，用它校验地址和 API Key，避免无效配置被静默保存。
    jsonRequest<Record<string, unknown>>(assistant, '/parameters'),
    jsonRequest<Record<string, unknown>>(assistant, '/info').catch((): Record<string, unknown> => ({})),
    jsonRequest<Record<string, unknown>>(assistant, '/site').catch((): Record<string, unknown> => ({})),
  ]);
  const mode = normalizeMode(info.mode || site.mode, assistant.mode || 'chat');
  return {
    name: String(info.name || site.title || assistant.name),
    description: typeof info.description === 'string' ? info.description : typeof site.description === 'string' ? site.description : assistant.description,
    iconUrl: typeof site.icon_url === 'string' ? site.icon_url : assistant.iconUrl,
    mode,
    capabilities: parseCapabilities(parameters, mode),
  };
}

function requestFiles(files: MessageAttachment[] | undefined) {
  return (files || []).filter((file) => file.uploadFileId).map((file) => ({
    type: file.type || 'custom', transfer_method: file.transferMethod || 'local_file', upload_file_id: file.uploadFileId,
  }));
}

function runPathAndBody(assistant: Assistant, input: RunInput) {
  const common = { inputs: input.inputs || {}, response_mode: 'streaming', user: user(assistant), files: requestFiles(input.files) };
  if (assistant.mode === 'workflow') return { path: '/workflows/run', body: common };
  if (assistant.mode === 'completion') return { path: '/completion-messages', body: { ...common, query: input.query } };
  return {
    path: '/chat-messages',
    body: { ...common, query: input.query, conversation_id: input.conversationId || '' },
  };
}

export async function runDifyApp(assistant: Assistant, input: RunInput, stream: StreamContext): Promise<DifyRunResult> {
  const { path, body } = runPathAndBody(assistant, input);
  const response = await fetch(`${base(assistant)}${path}`, {
    method: 'POST', signal: stream.signal, headers: headers(assistant), body: JSON.stringify(body),
  });
  if (!response.ok) throw await errorFrom(response, 'AI 请求失败');
  if (!response.body) throw new Error('AI 未返回可读取的数据流。');

  const parser = new DifySseParser();
  const accumulator = new DifyEventAccumulator(base(assistant));
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  const dispatch = (events: DifySseEvent[]) => {
    for (const event of events) {
      const content = accumulator.consume(event);
      if (stream.streamId) stream.sender.send('message:stream-chunk', { streamId: stream.streamId, content, event });
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      dispatch(parser.push(decoder.decode(value, { stream: true })));
    }
    dispatch(parser.finish(decoder.decode()));
  } catch (error) {
    if (!stream.signal?.aborted) throw error;
    return { ...accumulator.result(), answer: accumulator.answer || '已停止生成。', canceled: true };
  }

  if (accumulator.hitl?.formToken) accumulator.hitl = await enrichHitl(assistant, accumulator.hitl);
  const questions = accumulator.messageId && assistant.capabilities?.supportsSuggestedQuestions
    ? await fetchSuggestedQuestions(assistant, accumulator.messageId).catch(() => []) : [];
  return accumulator.result(questions);
}

async function enrichHitl(assistant: Assistant, hitl: HitlRequest): Promise<HitlRequest> {
  const value = await jsonRequest<Record<string, unknown>>(assistant, `/form/human_input/${encodeURIComponent(hitl.formToken)}?user=${encodeURIComponent(user(assistant))}`).catch(() => null);
  if (!value) return hitl;
  const event: DifySseEvent = { event: 'human_input_required', workflow_run_id: hitl.taskId, data: value };
  const accumulator = new DifyEventAccumulator(base(assistant));
  accumulator.consume(event);
  return accumulator.hitl || hitl;
}

export async function uploadDifyFile(assistant: Assistant, name: string, mimeType: string, bytes: Uint8Array): Promise<MessageAttachment> {
  const form = new FormData();
  const copy = Uint8Array.from(bytes);
  form.append('file', new Blob([copy.buffer], { type: mimeType || 'application/octet-stream' }), name);
  form.append('user', user(assistant));
  const response = await fetch(`${base(assistant)}/files/upload`, { method: 'POST', headers: headers(assistant, false), body: form });
  if (!response.ok) throw await errorFrom(response, '文件上传失败');
  const result = await response.json() as { id: string; name?: string; size?: number; mime_type?: string; extension?: string };
  return {
    id: result.id, uploadFileId: result.id, name: result.name || name, size: result.size || bytes.byteLength,
    mimeType: result.mime_type || mimeType, url: '', transferMethod: 'local_file', type: inferFileType(result.mime_type || mimeType),
  };
}

function inferFileType(mime: string) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

export async function fetchSuggestedQuestions(assistant: Assistant, messageId: string): Promise<string[]> {
  const result = await jsonRequest<{ result?: string; data?: unknown[] }>(assistant, `/messages/${encodeURIComponent(messageId)}/suggested?user=${encodeURIComponent(user(assistant))}`);
  return result.result === 'success' && Array.isArray(result.data) ? result.data.filter((item): item is string => typeof item === 'string') : [];
}

export async function sendDifyMessageFeedback(assistant: Assistant, messageId: string, rating: MessageFeedbackRating, content: string) {
  await jsonRequest(assistant, `/messages/${encodeURIComponent(messageId)}/feedbacks`, {
    method: 'POST', body: JSON.stringify({ rating, user: user(assistant), content }),
  });
}

export async function submitDifyHitl(assistant: Assistant, formToken: string, inputs: Record<string, string>, action: string) {
  await jsonRequest(assistant, `/form/human_input/${encodeURIComponent(formToken)}`, {
    method: 'POST', body: JSON.stringify({ inputs, action, user: user(assistant) }),
  });
}

/** Reconnects to a paused Workflow after human input and consumes the remaining SSE events. */
export async function resumeDifyWorkflow(assistant: Assistant, taskId: string): Promise<DifyRunResult> {
  const response = await fetch(`${base(assistant)}/workflow/${encodeURIComponent(taskId)}/events?user=${encodeURIComponent(user(assistant))}`, {
    headers: headers(assistant, false),
  });
  if (!response.ok) throw await errorFrom(response, '工作流恢复失败');
  if (!response.body) throw new Error('工作流恢复接口未返回事件流。');
  const parser = new DifySseParser();
  const accumulator = new DifyEventAccumulator(base(assistant));
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  const consume = (events: DifySseEvent[]) => events.forEach((event) => accumulator.consume(event));
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    consume(parser.push(decoder.decode(value, { stream: true })));
  }
  consume(parser.finish(decoder.decode()));
  if (accumulator.hitl?.formToken) accumulator.hitl = await enrichHitl(assistant, accumulator.hitl);
  return accumulator.result();
}

export async function listDifyConversations(assistant: Assistant): Promise<Array<Pick<Conversation, 'difyConversationId' | 'title' | 'createdAt' | 'updatedAt' | 'inputs'>>> {
  const result = await jsonRequest<{ data?: Array<Record<string, unknown>> }>(assistant, `/conversations?user=${encodeURIComponent(user(assistant))}&limit=100&sort_by=-updated_at`);
  return (result.data || []).map((item) => ({
    difyConversationId: String(item.id || ''), title: String(item.name || '新会话'),
    inputs: item.inputs && typeof item.inputs === 'object' ? item.inputs as Record<string, unknown> : {},
    createdAt: new Date(Number(item.created_at || Date.now() / 1000) * 1000).toISOString(),
    updatedAt: new Date(Number(item.updated_at || item.created_at || Date.now() / 1000) * 1000).toISOString(),
  }));
}

export async function listDifyMessages(assistant: Assistant, conversationId: string, localConversationId: string): Promise<Message[]> {
  const result = await jsonRequest<{ data?: Array<Record<string, unknown>> }>(
    assistant,
    `/messages?user=${encodeURIComponent(user(assistant))}&conversation_id=${encodeURIComponent(conversationId)}&limit=100`,
  );
  return [...(result.data || [])].reverse().flatMap((item) => {
    const createdAt = new Date(Number(item.created_at || Date.now() / 1000) * 1000).toISOString();
    const files = Array.isArray(item.message_files) ? item.message_files as Array<Record<string, unknown>> : [];
    const attachments: MessageAttachment[] = files.map((file) => ({
      id: String(file.id || file.related_id || `${conversationId}-${Math.random()}`),
      name: String(file.name || file.filename || '文件'),
      url: normalizeRemoteUrl(assistant, String(file.url || file.remote_url || '')),
      mimeType: typeof file.mime_type === 'string' ? file.mime_type : undefined,
      size: typeof file.size === 'number' ? file.size : undefined,
    }));
    const query = typeof item.query === 'string' ? item.query : '';
    const answer = typeof item.answer === 'string' ? item.answer : '';
    const id = String(item.id || `${conversationId}-${createdAt}`);
    return [
      ...(query ? [{ id: `${id}-query`, conversationId: localConversationId, role: 'user' as const, content: query, attachments, createdAt, status: 'ok' as const }] : []),
      ...(answer ? [{
        id: `${id}-answer`, conversationId: localConversationId, role: 'assistant' as const, content: answer,
        difyMessageId: id, createdAt, status: 'ok' as const,
        feedbackRating: item.feedback === 'like' ? 'like' as const : item.feedback === 'dislike' ? 'dislike' as const : null,
      }] : []),
    ];
  });
}

function normalizeRemoteUrl(assistant: Assistant, value: string) {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return new URL(value, `${base(assistant)}/`).toString();
}

export async function renameDifyConversation(assistant: Assistant, conversationId: string, title: string) {
  await jsonRequest(assistant, `/conversations/${encodeURIComponent(conversationId)}/name`, {
    method: 'POST', body: JSON.stringify({ name: title, auto_generate: false, user: user(assistant) }),
  });
}

export async function deleteDifyConversation(assistant: Assistant, conversationId: string) {
  await jsonRequest(assistant, `/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE', body: JSON.stringify({ user: user(assistant) }),
  });
}

export async function createDifyAnnotation(assistant: Assistant, question: string, answer: string): Promise<Annotation> {
  const result = await jsonRequest<{ id?: string }>(assistant, '/apps/annotations', {
    method: 'POST', body: JSON.stringify({ question, answer }),
  });
  return { id: result.id || `annotation-${Date.now()}`, assistantId: assistant.id, question, answer, createdAt: new Date().toISOString() };
}

export async function listDifyAnnotations(assistant: Assistant): Promise<Annotation[]> {
  const result = await jsonRequest<{ data?: Array<Record<string, unknown>> }>(assistant, '/apps/annotations?page=1&limit=100');
  return (result.data || []).map((item) => ({
    id: String(item.id || ''), assistantId: assistant.id,
    question: String(item.question || ''), answer: String(item.answer || ''),
    createdAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : undefined,
  })).filter((item) => item.id);
}

export async function deleteDifyAnnotation(assistant: Assistant, annotationId: string) {
  await jsonRequest(assistant, `/apps/annotations/${encodeURIComponent(annotationId)}`, { method: 'DELETE' });
}

export { defaultCapabilities };
