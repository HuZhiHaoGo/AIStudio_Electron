import { X } from 'lucide-react';
import type { Citation } from '../../../shared/types/citation';
import { SourceDocumentViewer } from './SourceDocumentViewer';

export function SourceViewer({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  return <aside className="source-viewer" aria-label={`查看原文：${citation.documentName}`}>
    <header>
      <div><strong>{citation.documentName}</strong><small>{citation.pageStart ? `跳转到第 ${citation.pageStart} 页` : '原始文档'}</small></div>
      <button type="button" aria-label="关闭原文查看器" onClick={onClose}><X size={19} /></button>
    </header>
    <SourceDocumentViewer citation={citation} />
  </aside>;
}
