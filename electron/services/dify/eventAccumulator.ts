import type { HitlRequest, MessageAttachment, MessageCitation, MessageTrace } from '../../../shared/types/app';
import type { DifyFile, DifyRunResult, DifySseEvent } from '../../../shared/types/dify';
import { createId } from '../../utils/id';

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export class DifyEventAccumulator {
  answer = '';
  finalAnswer = '';
  conversationId?: string;
  messageId?: string;
  taskId?: string;
  attachments: MessageAttachment[] = [];
  traces: MessageTrace[] = [];
  citations: MessageCitation[] = [];
  hitl?: HitlRequest;
  private seenFiles = new Set<string>();

  constructor(private readonly baseUrl: string) {}

  consume(event: DifySseEvent): string {
    this.conversationId = event.conversation_id || this.conversationId;
    this.messageId = event.message_id || this.messageId;
    this.taskId = event.task_id || event.workflow_run_id || this.taskId;
    this.collectFiles(event.files);
    this.collectFiles(event.message_files);
    this.collectFiles(event.data?.files as DifyFile[] | undefined);
    this.collectFiles(object(event.data?.outputs).files as DifyFile[] | undefined);

    if (event.event === 'message' || event.event === 'agent_message') {
      const chunk = this.normalizeLinks(event.answer || '');
      this.answer += chunk;
      return chunk;
    }
    if (event.event === 'message_replace') {
      this.answer = this.normalizeLinks(event.answer || '');
      this.finalAnswer = this.answer;
    }
    if (event.event === 'message_file' && event.url) this.collectFiles([{ id: event.id, url: event.url, name: event.type || '文件' }]);
    if (event.event === 'agent_thought') this.addTrace(event, event.tool ? 'tool' : 'agent-thought', event.tool || 'Agent 思考');
    if (event.event === 'workflow_started') this.addTrace(event, 'workflow', '工作流开始');
    if (event.event === 'workflow_finished') {
      this.addTrace(event, 'workflow', '工作流完成');
      const outputs = object(event.data?.outputs);
      const outputAnswer = outputs.answer;
      if (typeof outputAnswer === 'string') this.finalAnswer = this.normalizeLinks(outputAnswer);
      else if (Object.keys(outputs).length) this.finalAnswer = `\n\n\`\`\`json\n${JSON.stringify(outputs, null, 2)}\n\`\`\``;
    }
    if (event.event === 'workflow_paused') this.addTrace(event, 'workflow', '工作流等待人工处理');
    if (event.event === 'node_started' || event.event === 'node_finished' || event.event === 'node_retry') {
      this.addTrace(event, 'node', String(event.data?.title || event.data?.node_type || '工作流节点'));
    }
    if (event.event.startsWith('iteration_')) this.addTrace(event, 'iteration', String(event.data?.title || '迭代'));
    if (event.event.startsWith('loop_')) this.addTrace(event, 'loop', String(event.data?.title || '循环'));
    if (event.event === 'human_input_required') this.hitl = this.parseHitl(event);
    if (event.event === 'workflow_paused' && this.hitl) this.hitl.taskId = this.taskId;
    if (event.event === 'message_end') this.collectCitations(event.metadata?.retriever_resources);
    if (event.event === 'error') throw new Error(event.message || event.code || 'Dify 流式请求失败');
    return '';
  }

  result(suggestedQuestions: string[] = []): DifyRunResult {
    return {
      answer: this.finalAnswer || this.answer,
      difyConversationId: this.conversationId,
      difyMessageId: this.messageId,
      taskId: this.taskId,
      attachments: this.attachments,
      traces: this.traces,
      citations: this.citations,
      hitl: this.hitl,
      suggestedQuestions,
    };
  }

  private addTrace(event: DifySseEvent, kind: MessageTrace['kind'], fallbackTitle: string) {
    const data = event.data || {};
    const rawStatus = String(data.status || '');
    const status: MessageTrace['status'] = event.event.endsWith('started') ? 'running'
      : event.event === 'workflow_paused' ? 'paused'
      : rawStatus === 'failed' || rawStatus === 'error' ? 'failed' : 'success';
    const id = String(data.id || data.node_id || `${event.event}-${this.traces.length}`);
    const existing = this.traces.find((trace) => trace.id === id);
    const next: MessageTrace = {
      id,
      kind,
      title: String(data.title || fallbackTitle),
      status,
      content: typeof data.text === 'string' ? data.text
        : typeof data.answer === 'string' ? data.answer
        : [event.thought, event.tool_input, event.observation].filter(Boolean).join('\n\n') || undefined,
      metadata: { ...data, ...(event.tool ? { tool: event.tool } : {}) },
      startedAt: typeof data.created_at === 'number' ? data.created_at : event.created_at,
      finishedAt: typeof data.finished_at === 'number' ? data.finished_at : undefined,
    };
    if (existing) Object.assign(existing, next);
    else this.traces.push(next);
  }

  private parseHitl(event: DifySseEvent): HitlRequest {
    const data = event.data || {};
    return {
      formToken: String(data.form_token || ''),
      taskId: event.workflow_run_id || event.task_id,
      formContent: String(data.form_content || '工作流等待人工处理'),
      inputs: (Array.isArray(data.inputs) ? data.inputs : []).map((item) => ({
        outputVariableName: String(item.output_variable_name || item.variable || ''),
        type: typeof item.type === 'string' ? item.type : undefined,
        required: Boolean(item.required),
      })),
      defaultValues: object(data.resolved_default_values) as Record<string, string>,
      actions: (Array.isArray(data.user_actions) ? data.user_actions : []).map((item) => ({
        id: String(item.id || ''), title: String(item.title || item.id || '提交'),
        buttonStyle: typeof item.button_style === 'string' ? item.button_style : undefined,
      })),
      expirationTime: Number(data.expiration_time || Math.floor(Date.now() / 1000) + 3600),
    };
  }

  private collectCitations(resources: Array<Record<string, unknown>> | undefined) {
    for (const item of resources || []) {
      this.citations.push({
        position: typeof item.position === 'number' ? item.position : undefined,
        datasetName: typeof item.dataset_name === 'string' ? item.dataset_name : undefined,
        documentName: typeof item.document_name === 'string' ? item.document_name : undefined,
        segmentContent: String(item.content || item.segment_content || ''),
        score: typeof item.score === 'number' ? item.score : undefined,
      });
    }
  }

  private collectFiles(files?: DifyFile[]) {
    if (!Array.isArray(files)) return;
    for (const file of files) {
      const rawUrl = file.url || file.remote_url;
      if (!rawUrl) continue;
      const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : new URL(rawUrl, this.baseUrl).toString();
      const key = file.related_id || file.id || url;
      if (this.seenFiles.has(key)) continue;
      this.seenFiles.add(key);
      this.attachments.push({
        id: file.related_id || file.id || createId(), name: file.filename || file.name || '下载文件', url,
        mimeType: file.mime_type, size: file.size, transferMethod: file.transfer_method as 'local_file' | 'remote_url' | undefined,
      });
    }
  }

  private normalizeLinks(content: string) {
    return content.replace(/\]\((\/files\/[^)]+)\)/g, (_match, path: string) => `](${new URL(path, this.baseUrl)})`);
  }
}
