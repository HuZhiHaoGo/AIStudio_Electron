import { ChevronDown, ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import type { Citation } from '../../../shared/types/citation';
import { CitationImageGallery } from './CitationImageGallery';
import { CitationTablePreview } from './CitationTablePreview';

function pageLabel(citation: Citation) {
  if (citation.pageStart === undefined) return '';
  return citation.pageEnd !== undefined && citation.pageEnd !== citation.pageStart
    ? `第 ${citation.pageStart}–${citation.pageEnd} 页` : `第 ${citation.pageStart} 页`;
}

export function CitationCard({ citation, onViewSource }: { citation: Citation; onViewSource: (citation: Citation) => void }) {
  const [expanded, setExpanded] = useState(false);
  const canViewSource = Boolean(citation.datasetId && citation.documentId);
  const score = citation.rerankScore ?? citation.score;
  return <article className="citation-card">
    <header>
      <span className="citation-number">[{citation.number}]</span>
      <span className="citation-file-icon"><FileText size={17} /></span>
      <div>
        <strong title={citation.documentName}>{citation.documentName}</strong>
        <small>{[citation.datasetName, pageLabel(citation)].filter(Boolean).join(' · ') || '来源文档'}</small>
      </div>
      {score !== undefined ? <span className="citation-score" title="该分数来自检索或重排模型，不代表答案准确率">检索分数 {(score * 100).toFixed(1)}%</span> : null}
    </header>
    {citation.sectionPath?.length ? <p className="citation-section">{citation.sectionPath.join(' / ')}</p> : null}
    {citation.detailError ? <p className="citation-detail-error" role="status">{citation.detailError}</p> : null}
    <p className={`citation-content ${expanded ? 'expanded' : ''}`}>{citation.content}</p>
    {citation.content.length > 180 ? <button className="citation-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
      <ChevronDown size={15} className={expanded ? 'expanded' : ''} />{expanded ? '收起全文' : '展开全文'}
    </button> : null}
    <CitationImageGallery images={citation.images} datasetId={citation.datasetId} />
    <CitationTablePreview tables={citation.tables} />
    <footer>
      <button type="button" disabled={!canViewSource} title={canViewSource ? '在右侧打开原始文档' : '当前引用没有文档标识'} onClick={() => canViewSource && onViewSource(citation)}>
        <ExternalLink size={15} />查看原文
      </button>
    </footer>
  </article>;
}
