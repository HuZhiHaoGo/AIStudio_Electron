// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicAssistant } from '../../../shared/types/app';
import { AssistantSettingsView } from './AssistantSettingsView';
import type { AssistantForm } from './types';

const assistant: PublicAssistant = {
  id: 'assistant-1',
  name: '示例助手',
  apiBaseUrl: 'https://dify.example/v1',
  apiKeyMasked: 'app-xx...xxxx',
  userId: 'reader',
  mode: 'chat',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const form: AssistantForm = {
  name: '示例助手',
  apiBaseUrl: 'https://dify.example/v1',
  apiKey: '',
  userId: 'reader',
  mode: 'chat',
};

describe('AssistantSettingsView', () => {
  afterEach(cleanup);

  it('reports assistant selection and form changes without performing persistence', () => {
    const onSelectAssistant = vi.fn();
    const onChangeForm = vi.fn();

    render(
      <AssistantSettingsView
        assistants={[assistant]}
        annotations={[]}
        selectedAssistant={assistant}
        selectedAssistantId={assistant.id}
        form={form}
        isCreating={false}
        isSaving={false}
        notice=""
        error=""
        onCreateDraft={vi.fn()}
        onSelectAssistant={onSelectAssistant}
        onChangeForm={onChangeForm}
        onSave={vi.fn()}
        onRefresh={vi.fn()}
        onDeleteAnnotation={vi.fn()}
        onCloseStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '示例助手' }));
    expect(onSelectAssistant).toHaveBeenCalledWith('assistant-1');

    fireEvent.change(screen.getByLabelText('用户 ID'), { target: { value: 'new-reader' } });
    expect(onChangeForm).toHaveBeenCalledWith({ ...form, userId: 'new-reader' });
  });
});
