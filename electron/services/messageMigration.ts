import type { Message } from '../../shared/types/app';
import { normalizeRagflowCitation } from './ragflow/adapter';

export function migrateStoredMessages(messages: Message[]): Message[] {
  return messages.map((message) => ({
    ...message,
    attachments: message.attachments || [],
    suggestedQuestions: message.suggestedQuestions || [],
    feedbackRating: message.feedbackRating ?? null,
    feedbackContent: message.feedbackContent || '',
    traces: message.traces || [],
    citations: (message.citations || []).map((citation, index) => {
      const legacy = citation as typeof citation & { segmentContent?: string; position?: number };
      return normalizeRagflowCitation({
        ...citation,
        chunk_id: citation.chunkId || `legacy-${message.id}-${index + 1}`,
        content: citation.content || legacy.segmentContent || '',
        page: citation.pageStart ?? legacy.position,
      }, index + 1);
    }),
  }));
}
