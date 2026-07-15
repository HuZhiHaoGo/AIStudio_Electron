import type { HitlRequest, MessageAttachment, MessageCitation, MessageTrace } from './app';

export type DifyFile = {
  id?: string; filename?: string; name?: string; mime_type?: string; size?: number;
  related_id?: string; url?: string | null; remote_url?: string | null; transfer_method?: string;
};

export type DifySseEventName =
  | 'ping' | 'message' | 'agent_message' | 'agent_thought' | 'message_file'
  | 'message_end' | 'tts_message' | 'tts_message_end' | 'message_replace'
  | 'workflow_started' | 'workflow_finished' | 'workflow_paused'
  | 'node_started' | 'node_finished' | 'node_retry'
  | 'iteration_started' | 'iteration_next' | 'iteration_completed'
  | 'loop_started' | 'loop_next' | 'loop_completed'
  | 'human_input_required' | 'error';

export type DifySseEvent = {
  event: DifySseEventName | string;
  task_id?: string;
  message_id?: string;
  conversation_id?: string;
  workflow_run_id?: string;
  answer?: string;
  thought?: string;
  observation?: string;
  tool?: string;
  tool_input?: string;
  message_files?: DifyFile[];
  id?: string;
  type?: string;
  belongs_to?: string;
  url?: string;
  audio?: string;
  created_at?: number;
  code?: string;
  status?: number;
  message?: string;
  metadata?: { retriever_resources?: Array<Record<string, unknown>>; [key: string]: unknown };
  data?: Record<string, unknown> & {
    id?: string; node_id?: string; node_type?: string; title?: string; status?: string;
    text?: string; answer?: string; outputs?: Record<string, unknown>; files?: DifyFile[];
    form_token?: string; form_content?: string; inputs?: Array<Record<string, unknown>>;
    resolved_default_values?: Record<string, string>; user_actions?: Array<Record<string, unknown>>;
    expiration_time?: number;
  };
  files?: DifyFile[];
};

export type DifyRunResult = {
  answer: string;
  difyConversationId?: string;
  difyMessageId?: string;
  taskId?: string;
  attachments: MessageAttachment[];
  suggestedQuestions: string[];
  traces: MessageTrace[];
  citations: MessageCitation[];
  hitl?: HitlRequest;
  canceled?: boolean;
};
