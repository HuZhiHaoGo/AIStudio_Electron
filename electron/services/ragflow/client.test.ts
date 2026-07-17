import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../shared/types/citation';
import { enrichRagflowCitations, loadRagflowImage } from './client';

const baseCitation: Citation = {
  number: 1,
  chunkId: 'chunk-1',
  retrievalId: 'retrieval-1',
  documentName: '手册.pdf',
  content: '基础引用',
};

afterEach(() => {
  delete process.env.RAGFLOW_PROXY_URL;
  vi.unstubAllGlobals();
});

describe('RAGFlow proxy client', () => {
  it('reports image proxy HTTP failures without exposing response details', async () => {
    process.env.RAGFLOW_PROXY_URL = 'http://proxy.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('internal secret', { status: 502 })));
    await expect(loadRagflowImage('image-1')).rejects.toThrow('RAGFlow Proxy 请求失败：HTTP 502');
  });

  it('uses the local desktop proxy when no URL is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    await loadRagflowImage('image-1');
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8008/api/v1/images/image-1');
  });

  it('keeps the base citation when a cached detail has expired', async () => {
    process.env.RAGFLOW_PROXY_URL = 'http://proxy.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"citations":[]}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
    const result = await enrichRagflowCitations([baseCitation]);
    expect(result[0]).toMatchObject({ chunkId: 'chunk-1', content: '基础引用' });
    expect(result[0].detailError).toContain('已过期');
  });
});
