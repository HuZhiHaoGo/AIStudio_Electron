import { useEffect, useMemo, useState } from 'react';
import type { Citation, RagflowAsset } from '../../../shared/types/citation';
import { difyApiClient } from '../../services/difyApiClient';
import { OfficeDocumentViewer } from './OfficeDocumentViewer';
import { PdfViewer } from './PdfViewer';
import { detectSourceDocumentKind } from './sourceDocumentType';

function friendlyLoadError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : '';
  if (/HTTP 404/i.test(message)) return '没有找到原始文档，它可能已从知识库中删除。';
  if (/HTTP 401|HTTP 403/i.test(message)) return '当前没有读取原始文档的权限。';
  return '原始文档获取失败，请检查 RAGFlow 代理服务后重试。';
}

export function SourceDocumentViewer({ citation }: { citation: Citation }) {
  const [asset, setAsset] = useState<RagflowAsset | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setAsset(null);
    setError('');
    setLoading(true);
    if (!citation.datasetId || !citation.documentId) {
      setError('当前引用缺少原始文档标识。');
      setLoading(false);
      return;
    }
    void difyApiClient.loadRagflowDocument({
      datasetId: citation.datasetId,
      documentId: citation.documentId,
      filename: citation.documentName,
    })
      .then((result) => active && setAsset(result))
      .catch((reason) => {
        console.error('RAGFlow source document load failed:', reason);
        if (active) setError(friendlyLoadError(reason));
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [citation.datasetId, citation.documentId, citation.documentName]);

  const kind = useMemo(() => asset ? detectSourceDocumentKind(asset, citation.documentName) : 'unknown', [asset, citation.documentName]);
  if (loading) return <div className="pdf-status">正在加载原始文档…</div>;
  if (error || !asset) return <div className="pdf-status error">{error || '没有获取到原始文档。'}</div>;
  if (kind === 'pdf') return <PdfViewer citation={citation} asset={asset} />;
  return <OfficeDocumentViewer asset={asset} filename={citation.documentName} documentKey={citation.documentId || citation.documentName} kind={kind} />;
}
