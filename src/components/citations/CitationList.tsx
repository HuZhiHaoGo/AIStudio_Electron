import { BookOpen, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { Citation } from '../../../shared/types/citation';
import { CitationCard } from './CitationCard';

export function CitationList({ citations, onViewSource }: { citations?: Citation[]; onViewSource: (citation: Citation) => void }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  if (!citations?.length) return null;
  return <section className="citation-list" aria-label={`参考来源，共 ${citations.length} 条`}>
    <button className="citation-list-toggle" type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((current) => !current)}>
      <BookOpen size={17} />
      <strong>参考来源</strong>
      <span>{citations.length}</span>
      <ChevronDown className={expanded ? 'expanded' : ''} size={18} />
    </button>
    {expanded ? <div id={contentId}>{citations.map((citation) => <CitationCard key={`${citation.retrievalId || 'local'}-${citation.chunkId}-${citation.number}`} citation={citation} onViewSource={onViewSource} />)}</div> : null}
  </section>;
}
