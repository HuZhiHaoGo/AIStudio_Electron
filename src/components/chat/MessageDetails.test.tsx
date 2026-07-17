// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '../../../shared/types/app';
import { UserMessageActions } from './MessageDetails';

const message: Message = {
  id: 'message-1', conversationId: 'conversation-1', role: 'user', content: '请查询报销标准', createdAt: '2026-07-17',
};

describe('UserMessageActions', () => {
  it('copies user content and sends the message to edit', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const onEdit = vi.fn();
    render(<UserMessageActions message={message} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: '复制内容' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(message.content));
    fireEvent.click(screen.getByRole('button', { name: '再次编辑' }));
    expect(onEdit).toHaveBeenCalledWith(message);
  });
});
