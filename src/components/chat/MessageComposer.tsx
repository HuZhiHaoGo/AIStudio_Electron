import type { RefObject } from 'react';
import { Send, Square } from 'lucide-react';

type MessageComposerProps = {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  isSending: boolean;
  canSend: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
};

export function MessageComposer({
  inputRef,
  value,
  isSending,
  canSend,
  disabled,
  onChange,
  onSend,
  onStop,
}: MessageComposerProps) {
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSending) {
          onSend();
        }
      }}
    >
      <textarea
        ref={inputRef}
        value={value}
        rows={3}
        placeholder={disabled ? '请先创建会话' : '输入问题，按 Enter 发送'}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!isSending) {
              onSend();
            }
          }
        }}
      />
      <button
        className={`send-button ${isSending ? 'stop' : ''}`}
        type={isSending ? 'button' : 'submit'}
        disabled={isSending ? false : !canSend}
        title={isSending ? '停止生成' : '发送'}
        onClick={() => {
          if (isSending) {
            onStop();
          }
        }}
      >
        {isSending ? <Square size={18} /> : <Send size={20} />}
      </button>
    </form>
  );
}
