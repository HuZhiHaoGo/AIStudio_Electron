export type CitationBBox = {
  page: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type CitationImage = {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  page?: number;
  caption?: string;
};

export type CitationTable = {
  id: string;
  markdown?: string;
  html?: string;
  csvDownloadUrl?: string;
};

/**
 * A persisted citation snapshot. Display fields are copied from RAGFlow at
 * answer time so historical messages do not depend on a later re-index.
 */
export type Citation = {
  number: number;
  chunkId: string;
  retrievalId?: string;
  documentId?: string;
  datasetId?: string;
  documentName: string;
  datasetName?: string;
  pageStart?: number;
  pageEnd?: number;
  sectionPath?: string[];
  content: string;
  contentMarkdown?: string;
  contentHtml?: string;
  score?: number;
  rerankScore?: number;
  bbox?: CitationBBox[];
  images?: CitationImage[];
  tables?: CitationTable[];
  /** Kept when a RAGFlow version returns an unknown position format. */
  rawPositions?: unknown;
  detailError?: string;
};

export type ChatResponse = {
  messageId: string;
  conversationId: string;
  answer: string;
  citations: Citation[];
};

export type RagflowAsset = {
  bytes: Uint8Array;
  mimeType: string;
  filename?: string;
};
