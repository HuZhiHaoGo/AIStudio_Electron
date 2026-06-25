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
          className="attachment-link"
          key={attachment.id}
          type="button"
          onClick={() => onDownloadFile(attachment.url, attachment.name)}
        >
          <Download size={16} />
          <span>{attachment.name}</span>
          {attachment.size ? <small>{formatFileSize(attachment.size)}</small> : null}
        </button>
      ))}
    </div>
  );
}
