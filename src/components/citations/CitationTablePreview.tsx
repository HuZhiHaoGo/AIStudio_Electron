import DOMPurify from 'dompurify';
import type { CitationTable } from '../../../shared/types/citation';
import { MarkdownMessage } from '../markdown/MarkdownMessage';

export function CitationTablePreview({ tables }: { tables?: CitationTable[] }) {
  if (!tables?.length) return null;
  return <div className="citation-table-list" aria-label="引用表格">
    {tables.map((table, index) => <section className="citation-table" key={table.id}>
      <strong>表格 {index + 1}</strong>
      {table.markdown ? <MarkdownMessage content={table.markdown} /> : null}
      {!table.markdown && table.html ? <div className="citation-table-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(table.html, { USE_PROFILES: { html: true } }) }} /> : null}
    </section>)}
  </div>;
}

