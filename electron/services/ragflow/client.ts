import type { Citation, RagflowAsset } from '../../../shared/types/citation';
import { normalizeRagflowCitations } from './adapter';

const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/;

function config() {
  // 桌面版默认连接本机代理；显式环境变量仍可覆盖为内网或远程地址。
  const rawUrl = (process.env.RAGFLOW_PROXY_URL || 'http://127.0.0.1:8008').trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('RAGFLOW_PROXY_URL 格式无效。');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('RAGFlow Proxy 仅支持 HTTP 或 HTTPS。');
  return {
    baseUrl: url.toString().replace(/\/$/, ''),
    token: process.env.RAGFLOW_PROXY_TOKEN || process.env.PROXY_API_TOKEN || '',
    timeout: Math.max(1_000, Number(process.env.RAGFLOW_PROXY_TIMEOUT || 20_000)),
  };
}

function validateId(value: string, label: string) {
  if (!SAFE_ID.test(value)) throw new Error(`${label} 格式无效。`);
  return value;
}

async function proxyFetch(path: string, init?: RequestInit) {
  const current = config();
  const response = await fetch(`${current.baseUrl}${path}`, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(current.timeout),
    headers: {
      ...(current.token ? { Authorization: `Bearer ${current.token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`RAGFlow Proxy 请求失败：HTTP ${response.status}`);
  return response;
}

export async function enrichRagflowCitations(citations: Citation[]): Promise<Citation[]> {
  const groups = new Map<string, Citation[]>();
  for (const citation of citations) {
    if (!citation.retrievalId || !citation.chunkId) continue;
    groups.set(citation.retrievalId, [...(groups.get(citation.retrievalId) || []), citation]);
  }
  if (!groups.size) return citations;

  const enriched: Citation[] = [];
  for (const [retrievalId, items] of groups) {
    try {
      const response = await proxyFetch('/api/v1/citations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retrieval_id: retrievalId, chunk_ids: items.map((item) => item.chunkId) }),
      });
      const payload = await response.json() as { citations?: unknown[] };
      const normalized = normalizeRagflowCitations(payload.citations || []);
      const byChunkId = new Map(normalized.map((citation) => [citation.chunkId, citation]));
      enriched.push(...items.map((item) => byChunkId.get(item.chunkId) || {
        ...item,
        detailError: '引用详情已过期或不存在，当前展示 Dify 返回的基础引用。',
      }));
    } catch (error) {
      console.warn('RAGFlow citation enrichment failed:', error instanceof Error ? error.message : 'unknown error');
      enriched.push(...items.map((item) => ({ ...item, detailError: '引用详情加载失败，已保留 Dify 返回的基础引用。' })));
    }
  }

  const untouched = citations.filter((citation) => !citation.retrievalId || !citation.chunkId);
  return [...enriched, ...untouched].map((citation, index) => ({ ...citation, number: index + 1 }));
}

export async function loadRagflowImage(imageId: string, datasetId?: string): Promise<RagflowAsset> {
  const query = datasetId ? `?dataset_id=${encodeURIComponent(validateId(datasetId, 'datasetId'))}` : '';
  const response = await proxyFetch(`/api/v1/images/${encodeURIComponent(validateId(imageId, 'imageId'))}${query}`, { headers: { Accept: 'image/*' } });
  return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: response.headers.get('content-type') || 'image/jpeg' };
}

export async function loadRagflowDocument(datasetId: string, documentId: string): Promise<RagflowAsset> {
  const response = await proxyFetch(`/api/v1/documents/${encodeURIComponent(validateId(datasetId, 'datasetId'))}/${encodeURIComponent(validateId(documentId, 'documentId'))}`, {
    headers: { Accept: 'application/pdf,application/octet-stream' },
  });
  const disposition = response.headers.get('content-disposition') || '';
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: response.headers.get('content-type') || 'application/pdf', filename };
}
