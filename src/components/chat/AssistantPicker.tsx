import { useEffect, useRef, useState } from 'react';
import { Bot, Check, ChevronDown } from 'lucide-react';
import type { Assistant } from '../../../shared/types/app';

type Props = {
  assistants: Assistant[];
  value: string;
  syncError?: string;
  onChange: (assistantId: string) => void;
};

const modeNames: Record<Assistant['mode'], string> = {
  chat: '聊天助手',
  'advanced-chat': 'Chatflow',
  'agent-chat': 'Agent',
  workflow: 'Workflow',
  completion: '文本生成',
};

export function AssistantPicker({ assistants, value, syncError, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = assistants.find((assistant) => assistant.id === value);

  useEffect(() => {
    function closeFromOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeFromKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('mousedown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, []);

  return (
    <div className={`assistant-picker ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        className="assistant-picker-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!assistants.length}
        title={syncError || selected?.name || '选择助手'}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="assistant-picker-avatar"><Bot size={17} /></span>
        <span className="assistant-picker-name">{selected?.name || '暂无助手'}</span>
        {syncError ? <span className="assistant-picker-error" aria-label={syncError} /> : null}
        <ChevronDown className="assistant-picker-chevron" size={17} />
      </button>

      {open ? (
        <div className="assistant-picker-menu" role="listbox" aria-label="选择助手">
          {assistants.map((assistant) => {
            const active = assistant.id === value;
            return (
              <button
                className={`assistant-picker-option ${active ? 'active' : ''}`}
                type="button"
                role="option"
                aria-selected={active}
                key={assistant.id}
                onClick={() => {
                  onChange(assistant.id);
                  setOpen(false);
                }}
              >
                <span className="assistant-option-avatar"><Bot size={16} /></span>
                <span className="assistant-option-copy">
                  <strong>{assistant.name}</strong>
                  <small>{modeNames[assistant.mode] || assistant.mode}</small>
                </span>
                {active ? <Check size={17} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
