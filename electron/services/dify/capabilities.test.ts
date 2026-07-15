import { describe, expect, it } from 'vitest';
import { parseCapabilities } from './capabilities';

describe('parseCapabilities', () => {
  it('normalizes dynamic fields and feature flags', () => {
    const value = parseCapabilities({
      opening_statement: '欢迎',
      suggested_questions: ['从哪里开始？'],
      suggested_questions_after_answer: { enabled: true },
      speech_to_text: { enabled: true },
      file_upload: { enabled: true, allowed_file_types: ['document'], allowed_file_extensions: ['pdf'], number_limits: 3 },
      user_input_form: [
        { 'text-input': { variable: 'name', label: '姓名', required: true, max_length: 20 } },
        { select: { variable: 'level', label: '级别', required: false, options: ['A', 'B'] } },
      ],
    }, 'advanced-chat');
    expect(value.openingStatement).toBe('欢迎');
    expect(value.supportsFileUpload).toBe(true);
    expect(value.supportsSuggestedQuestions).toBe(true);
    expect(value.inputFields).toHaveLength(2);
    expect(value.inputFields[0]).toMatchObject({ variable: 'name', required: true, maxLength: 20 });
  });

  it('exposes workflow and HITL capabilities for workflow apps', () => {
    const value = parseCapabilities({}, 'workflow');
    expect(value.supportsWorkflow).toBe(true);
    expect(value.supportsHitl).toBe(true);
    expect(value.supportsConversation).toBe(false);
  });
});
