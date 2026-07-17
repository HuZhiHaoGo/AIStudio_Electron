import { describe, expect, it } from 'vitest';
import type { Message } from '../../shared/types/app';
import { migrateStoredMessages } from './messageMigration';

describe('citation history migration', () => {
  it('restores legacy citation text and page as a persisted snapshot', () => {
    const message = {
      id: 'message-1', conversationId: 'conversation-1', role: 'assistant', content: '回答', createdAt: '2026-01-01',
      citations: [{ number: 1, documentName: '旧手册.pdf', segmentContent: '历史原文', position: 7 }],
    } as unknown as Message;
    const [restored] = migrateStoredMessages([message]);
    expect(restored.citations?.[0]).toMatchObject({
      chunkId: 'legacy-message-1-1', documentName: '旧手册.pdf', content: '历史原文', pageStart: 7,
    });
  });
});
