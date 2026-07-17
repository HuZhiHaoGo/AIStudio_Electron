import { describe, expect, it } from 'vitest';
import { normalizeCitationBBoxes, normalizeRagflowCitations } from './adapter';

describe('RAGFlow citation adapter', () => {
  it('normalizes version-compatible chunk fields and removes duplicates', () => {
    const citations = normalizeRagflowCitations([
      { id: 'chunk-1', doc_id: 'doc-1', kb_id: 'kb-1', docnm_kwd: '手册.pdf', content_with_weight: '正文', similarity: 0.82, image_id: 'img-1' },
      { chunk_id: 'chunk-1', content: '重复正文', document_name: '手册.pdf' },
    ]);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({ chunkId: 'chunk-1', documentId: 'doc-1', datasetId: 'kb-1', documentName: '手册.pdf', content: '正文', score: 0.82 });
    expect(citations[0].images?.[0].id).toBe('img-1');
  });

  it('normalizes explicit pixel boxes only when page dimensions are known', () => {
    expect(normalizeCitationBBoxes([{ page: 2, x1: 100, y1: 200, x2: 300, y2: 400, page_width: 1000, page_height: 2000 }]))
      .toEqual([{ page: 2, x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.2 }]);
    expect(normalizeCitationBBoxes([[2, 100, 300, 200, 400]])).toEqual([]);
  });
});

