import type { RefObject } from 'react';
import { LoaderCircle, Paperclip, Send, Square, X } from 'lucide-react';
import type { MessageAttachment } from '../../../shared/types/app';

type Props = {
  inputRef: RefObject<HTMLTextAreaElement | null>; value: string; isSending: boolean; canSend: boolean;
  disabled: boolean; mode?: string; allowUpload: boolean; files: MessageAttachment[]; uploading: boolean;
  accept?: string; onChange: (value: string) => void; onSend: () => void; onStop: () => void;
  onChooseFiles: (files: File[]) => void; onRemoveFile: (id: string) => void;
};

export function MessageComposer(props: Props) {
  const { inputRef, value, isSending, canSend, disabled, mode, allowUpload, files, uploading, accept,
    onChange, onSend, onStop, onChooseFiles, onRemoveFile } = props;
  return <form className="composer" onSubmit={(event) => { event.preventDefault(); if (!isSending) onSend(); }}>
    {files.length ? <div className="composer-files">{files.map((file) => <span key={file.id}>{file.name}<button type="button" title="移除" onClick={() => onRemoveFile(file.id)}><X size={13} /></button></span>)}</div> : null}
    <div className="composer-main">
      <div className={`composer-input-wrap ${allowUpload ? 'has-upload' : ''}`}>
        <textarea ref={inputRef} value={value} rows={3} placeholder={disabled ? '请先创建会话' : mode === 'workflow' ? '可填写运行说明，也可直接运行工作流' : '输入问题，按 Enter 发送'} disabled={disabled} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!isSending && canSend) onSend(); }
        }} />
        {allowUpload ? <label className={`upload-button ${disabled || uploading ? 'disabled' : ''}`} title="添加文件">
          {uploading ? <LoaderCircle className="spin" size={16} /> : <Paperclip size={16} />}
          <span>{uploading ? '正在上传…' : '添加文件'}</span>
          <input type="file" multiple hidden disabled={disabled || uploading} accept={accept} onChange={(event) => { onChooseFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
        </label> : null}
      </div>
      <button className={`send-button ${isSending ? 'stop' : ''}`} type={isSending ? 'button' : 'submit'} disabled={isSending ? false : !canSend} title={isSending ? '停止生成' : '发送'} onClick={() => isSending && onStop()}>
        {isSending ? <Square size={18} /> : <Send size={20} />}
      </button>
    </div>
  </form>;
}
