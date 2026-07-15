import { Download } from 'lucide-react';
import type { MessageAttachment } from '../../../shared/types/app';

type MessageAttachmentsProps = {
  attachments?: MessageAttachment[];
  formatFileSize: (size?: number) => string;
  onDownloadFile: (url: string, filename?: string) => void;
};

export function MessageAttachments({ attachments, formatFileSize, onDownloadFile }: MessageAttachmentsProps) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className="message-attachments" aria-label="附件">
      {attachments.map((attachment) => (
        <button
          className={`attachment-link ${attachment.url ? '' : 'disabled'}`}
          key={attachment.id}
          type="button"
          disabled={!attachment.url}
          title={attachment.url ? '下载文件' : '文件已上传'}
          onClick={() => attachment.url && onDownloadFile(attachment.url, attachment.name)}
        >
          <Download size={16} />
          <span>{attachment.name}</span>
          {attachment.size ? <small>{formatFileSize(attachment.size)}</small> : null}
        </button>
      ))}
    </div>
  );
}
