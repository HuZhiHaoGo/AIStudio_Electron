import { useEffect, useRef } from 'react';

export type ActionDialogField = {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
  required?: boolean;
};

type ActionDialogProps = {
  title: string;
  description?: string;
  confirmText?: string;
  fields: ActionDialogField[];
  busy?: boolean;
  onChange: (name: string, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ActionDialog({
  title,
  description,
  confirmText = '确定',
  fields,
  busy = false,
  onChange,
  onCancel,
  onConfirm,
}: ActionDialogProps) {
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const canConfirm = fields.every((field) => !field.required || field.value.trim());

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <form className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" onSubmit={(event) => {
        event.preventDefault();
        if (canConfirm && !busy) onConfirm();
      }}>
        <header>
          <h2 id="action-dialog-title">{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>

        <div className="action-dialog-fields">
          {fields.map((field, index) => (
            <label key={field.name}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea
                  ref={index === 0 ? firstInputRef as React.RefObject<HTMLTextAreaElement> : undefined}
                  value={field.value}
                  rows={4}
                  required={field.required}
                  disabled={busy}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              ) : (
                <input
                  ref={index === 0 ? firstInputRef as React.RefObject<HTMLInputElement> : undefined}
                  value={field.value}
                  required={field.required}
                  disabled={busy}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        <footer>
          <button className="secondary-action" type="button" disabled={busy} onClick={onCancel}>取消</button>
          <button className="primary-action" type="submit" disabled={!canConfirm || busy}>
            {busy ? '正在处理…' : confirmText}
          </button>
        </footer>
      </form>
    </div>
  );
}
