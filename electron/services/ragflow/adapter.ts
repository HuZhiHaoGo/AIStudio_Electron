import type { Citation, CitationBBox, CitationImage, CitationTable } from '../../../shared/types/citation';

type UnknownObject = Record<string, unknown>;

const asObject = (value: unknown): UnknownObject => value && typeof value === 'object' && !Array.isArray(value)
  ? value as UnknownObject : {};

const firstString = (...values: unknown[]) => values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
const firstNumber = (...values: unknown[]) => {
  const value = values.find((item) => typeof item === 'number' && Number.isFinite(item));
  return typeof value === 'number' ? value : undefined;
};

function normalizePage(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : undefined;
}

function normalizedBox(page: number, x1: number, y1: number, x2: number, y2: number): CitationBBox | undefined {
  if (![x1, y1, x2, y2].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) return undefined;
  if (x2 <= x1 || y2 <= y1) return undefined;
  return { page, x1, y1, x2, y2 };
}

/**
 * Converts explicit object coordinates and already-normalized RAGFlow arrays.
 * Pixel arrays are intentionally retained as rawPositions unless page width
 * and height are supplied; guessing their coordinate space produces bad PDF
 * highlights.
 */
export function normalizeCitationBBoxes(value: unknown, pageWidth?: number, pageHeight?: number): CitationBBox[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const object = asObject(entry);
    if (Object.keys(object).length) {
      const page = normalizePage(object.page ?? object.page_number ?? object.page_num);
      const x1 = Number(object.x1 ?? object.left);
      const y1 = Number(object.y1 ?? object.top);
      const x2 = Number(object.x2 ?? (Number(object.left) + Number(object.width)));
      const y2 = Number(object.y2 ?? (Number(object.top) + Number(object.height)));
      if (page === undefined) return [];
      const direct = normalizedBox(page, x1, y1, x2, y2);
      if (direct) return [direct];
      const width = Number(object.page_width ?? pageWidth);
      const height = Number(object.page_height ?? pageHeight);
      const converted = width > 0 && height > 0 ? normalizedBox(page, x1 / width, y1 / height, x2 / width, y2 / height) : undefined;
      return converted ? [converted] : [];
    }

    if (!Array.isArray(entry) || entry.length < 5) return [];
    const page = normalizePage(entry[0]);
    if (page === undefined) return [];
    // RAGFlow positions use [page, x1, x2, y1, y2].
    const x1 = Number(entry[1]);
    const x2 = Number(entry[2]);
    const y1 = Number(entry[3]);
    const y2 = Number(entry[4]);
    const direct = normalizedBox(page, x1, y1, x2, y2);
    if (direct) return [direct];
    const converted = pageWidth && pageHeight
      ? normalizedBox(page, x1 / pageWidth, y1 / pageHeight, x2 / pageWidth, y2 / pageHeight)
      : undefined;
    return converted ? [converted] : [];
  });
}

function normalizeImages(raw: UnknownObject, page?: number): CitationImage[] {
  const source = raw.images;
  const items = Array.isArray(source) ? source : [raw.image_id ?? raw.img_id].filter(Boolean);
  return items.flatMap((item) => {
    const object = asObject(item);
    const id = firstString(object.id, object.image_id, object.img_id, item);
    if (!id) return [];
    const encoded = encodeURIComponent(id);
    return [{
      id,
      thumbnailUrl: `/api/ragflow/images/${encoded}`,
      previewUrl: `/api/ragflow/images/${encoded}`,
      page: normalizePage(object.page) ?? page,
      caption: firstString(object.caption, object.title),
    }];
  });
}

function normalizeTables(raw: UnknownObject): CitationTable[] {
  const structured = Array.isArray(raw.tables) ? raw.tables.flatMap((item, index) => {
    const object = asObject(item);
    const markdown = firstString(object.markdown, object.content_markdown);
    const html = firstString(object.html, object.content_html);
    if (!markdown && !html) return [];
    return [{ id: firstString(object.id) || `table-${index + 1}`, markdown, html, csvDownloadUrl: firstString(object.csv_download_url) }];
  }) : [];
  if (structured.length) return structured;
  const html = firstString(raw.contentHtml, raw.content_html, asObject(raw.metadata).content_html);
  if (html && /<table(?:\s|>)/i.test(html)) return [{ id: 'table-1', html }];
  const content = firstString(raw.content_markdown, raw.content_with_weight, raw.content, raw.text) || '';
  if (/<table(?:\s|>)/i.test(content)) return [{ id: 'table-1', html: content }];
  const lines = content.split(/\r?\n/);
  const tables: CitationTable[] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].includes('|') || !/^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) continue;
    const block = [lines[index], lines[index + 1]];
    let cursor = index + 2;
    while (cursor < lines.length && lines[cursor].includes('|')) block.push(lines[cursor++]);
    tables.push({ id: `table-${tables.length + 1}`, markdown: block.join('\n') });
    index = cursor - 1;
  }
  return tables;
}

export function normalizeRagflowCitation(value: unknown, number = 1): Citation {
  const raw = asObject(value);
  const metadata = asObject(raw.metadata ?? raw.document_metadata);
  const positions = raw.positions ?? raw.position_int ?? raw.bbox ?? raw.bounding_boxes ?? raw.rawPositions ?? metadata.positions;
  const bbox = normalizeCitationBBoxes(
    positions,
    firstNumber(raw.page_width, metadata.page_width),
    firstNumber(raw.page_height, metadata.page_height),
  );
  const positionPages = Array.isArray(positions) ? positions.flatMap((item) => {
    if (Array.isArray(item)) {
      const page = normalizePage(item[0]);
      return page === undefined ? [] : [page];
    }
    const object = asObject(item);
    const page = normalizePage(object.page ?? object.page_number ?? object.page_num);
    return page === undefined ? [] : [page];
  }) : [];
  const pages = bbox.length ? bbox.map((item) => item.page) : positionPages;
  const fallbackPage = normalizePage(raw.pageStart ?? raw.page ?? raw.page_num ?? raw.page_number ?? metadata.page);
  const fallbackPageEnd = normalizePage(raw.pageEnd) ?? fallbackPage;
  const content = firstString(raw.content_with_weight, raw.content, raw.text, raw.segment_content) || '';
  const chunkId = firstString(raw.chunkId, raw.chunk_id, raw.segment_id, raw.id, metadata.chunk_id, metadata.segment_id) || '';
  const documentName = firstString(raw.documentName, raw.document_name, raw.document_keyword, raw.docnm_kwd, raw.title, metadata.document_name, metadata.title) || '未命名文档';
  const pageStart = pages.length ? Math.min(...pages) : fallbackPage;
  const pageEnd = pages.length ? Math.max(...pages) : fallbackPageEnd;

  return {
    number,
    chunkId,
    retrievalId: firstString(raw.retrievalId, raw.retrieval_id, metadata.retrieval_id),
    documentId: firstString(raw.documentId, raw.document_id, raw.doc_id, metadata.document_id, metadata.doc_id),
    datasetId: firstString(raw.datasetId, raw.dataset_id, raw.kb_id, metadata.dataset_id, metadata.knowledge_id),
    documentName,
    datasetName: firstString(raw.datasetName, raw.dataset_name, raw.knowledge_name, metadata.dataset_name),
    pageStart,
    pageEnd,
    sectionPath: (Array.isArray(raw.sectionPath) ? raw.sectionPath : Array.isArray(raw.section_path) ? raw.section_path : [])
      .filter((item): item is string => typeof item === 'string'),
    content,
    contentMarkdown: firstString(raw.contentMarkdown, raw.content_markdown, metadata.content_markdown),
    contentHtml: firstString(raw.contentHtml, raw.content_html, metadata.content_html),
    score: firstNumber(raw.similarity, raw.score),
    rerankScore: firstNumber(raw.rerankScore, raw.rerank_score, metadata.rerank_score),
    bbox: bbox.length ? bbox : undefined,
    images: normalizeImages(raw, pageStart),
    tables: normalizeTables(raw),
    rawPositions: raw.rawPositions ?? positions,
    detailError: firstString(raw.detailError),
  };
}

export function normalizeRagflowCitations(values: unknown[]): Citation[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const citation = normalizeRagflowCitation(value, seen.size + 1);
    const key = citation.chunkId || `${citation.documentId || citation.documentName}:${citation.content}`;
    if (!citation.content || seen.has(key)) return [];
    seen.add(key);
    return [{ ...citation, number: seen.size }];
  });
}
