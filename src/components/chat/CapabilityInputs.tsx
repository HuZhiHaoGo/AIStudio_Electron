import type { DifyInputField, MessageAttachment } from '../../../shared/types/app';
import { buildFileAccept } from '../../utils/fileAccept';

type Props = {
  fields: DifyInputField[];
  values: Record<string, unknown>;
  disabled: boolean;
  onChange: (values: Record<string, unknown>) => void;
  onUpload: (file: File) => Promise<MessageAttachment>;
};

export function CapabilityInputs({ fields, values, disabled, onChange, onUpload }: Props) {
  if (!fields.length) return null;
  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });
  return (
    <details className="capability-inputs" open>
      <summary>应用输入参数</summary>
      <div className="capability-input-grid">
        {fields.map((field) => (
          <label key={field.variable}>
            <span>{field.label}{field.required ? ' *' : ''}</span>
            {field.type === 'select' ? (
              <select disabled={disabled} required={field.required} value={String(values[field.variable] ?? field.default ?? '')} onChange={(event) => set(field.variable, event.target.value)}>
                <option value="">请选择</option>
                {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.type === 'paragraph' ? (
              <textarea disabled={disabled} required={field.required} maxLength={field.maxLength} value={String(values[field.variable] ?? field.default ?? '')} onChange={(event) => set(field.variable, event.target.value)} />
            ) : field.type === 'number' ? (
              <input type="number" disabled={disabled} required={field.required} value={String(values[field.variable] ?? field.default ?? '')} onChange={(event) => set(field.variable, event.target.value === '' ? '' : Number(event.target.value))} />
            ) : field.type === 'file' || field.type === 'file-list' ? (
              <input type="file" disabled={disabled} required={field.required} multiple={field.type === 'file-list'} accept={buildFileAccept(field.allowedFileExtensions, field.allowedFileTypes)} onChange={async (event) => {
                const uploads = await Promise.all(Array.from(event.target.files || []).map(onUpload));
                const mapped = uploads.map((file) => ({ type: file.type, transfer_method: 'local_file', upload_file_id: file.uploadFileId }));
                set(field.variable, field.type === 'file' ? mapped[0] : mapped);
              }} />
            ) : (
              <input disabled={disabled} required={field.required} maxLength={field.maxLength} value={String(values[field.variable] ?? field.default ?? '')} onChange={(event) => set(field.variable, event.target.value)} />
            )}
          </label>
        ))}
      </div>
    </details>
  );
}
