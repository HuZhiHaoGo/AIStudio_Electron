import DOMPurify from 'dompurify';
import { Download, FileWarning } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { RagflowAsset } from '../../../shared/types/citation';
import type { SourceDocumentKind } from './sourceDocumentType';
import { sourceDocumentKindLabel } from './sourceDocumentType';

function downloadAsset(asset: RagflowAsset, filename: string) {
  const bytes = Uint8Array.from(asset.bytes);
  const blob = new Blob([bytes.buffer], { type: asset.mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = asset.filename || filename || '原始文档';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function DownloadAction({ asset, filename }: { asset: RagflowAsset; filename: string }) {
  return <button className="source-download-button" type="button" onClick={() => downloadAsset(asset, filename)}>
    <Download size={16} />下载原始文件
  </button>;
}

export function OfficeDocumentViewer({ asset, filename, kind }: { asset: RagflowAsset; filename: string; kind: SourceDocumentKind }) {
  const [html, setHtml] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetHtml, setSheetHtml] = useState<Record<string, string>>({});
  const [activeSheet, setActiveSheet] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(kind === 'word' || kind === 'excel');
  const bytes = useMemo(() => Uint8Array.from(asset.bytes), [asset.bytes]);

  useEffect(() => {
    let active = true;
    setError('');
    setHtml('');
    setSheetNames([]);
    setSheetHtml({});
    setActiveSheet('');
    setImageUrl('');
    setLoading(kind === 'word' || kind === 'excel');

    if (kind === 'image') {
      const url = URL.createObjectURL(new Blob([bytes.buffer], { type: asset.mimeType || 'image/*' }));
      setImageUrl(url);
      setLoading(false);
      return () => { active = false; URL.revokeObjectURL(url); };
    } else if (kind === 'word') {
      // 明确使用浏览器构建；Node 构建只接受本地文件/Buffer，不能处理 IPC 传来的 ArrayBuffer。
      void import('mammoth/mammoth.browser.js').then((mammoth) => mammoth.convertToHtml({ arrayBuffer: bytes.buffer })).then((result) => {
        if (active) setHtml(DOMPurify.sanitize(result.value, { ADD_ATTR: ['target'] }));
      }).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Word 文档解析失败。')).finally(() => active && setLoading(false));
    } else if (kind === 'excel') {
      void import('xlsx').then((xlsx) => {
        const workbook = xlsx.read(bytes, { type: 'array', cellDates: true });
        const names = workbook.SheetNames;
        const pages = Object.fromEntries(names.map((name) => [name, DOMPurify.sanitize(xlsx.utils.sheet_to_html(workbook.Sheets[name], { id: undefined }))]));
        if (active) {
          setSheetNames(names);
          setSheetHtml(pages);
          setActiveSheet(names[0] || '');
        }
      }).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Excel 文档解析失败。')).finally(() => active && setLoading(false));
    }
    return () => { active = false; };
  }, [asset.mimeType, bytes, kind]);

  if (loading) return <div className="pdf-status">正在解析 {sourceDocumentKindLabel(kind)} 原始文档…</div>;
  if (error) return <div className="source-document-fallback"><FileWarning size={30} /><strong>{sourceDocumentKindLabel(kind)} 文档暂时无法预览</strong><p>{error}</p><DownloadAction asset={asset} filename={filename} /></div>;

  if (kind === 'word') return <div className="office-document-viewer"><div className="office-document-actions"><DownloadAction asset={asset} filename={filename} /></div><article className="word-document" dangerouslySetInnerHTML={{ __html: html }} /></div>;
  if (kind === 'excel') return <div className="office-document-viewer">
    <div className="office-document-actions">
      <div className="sheet-tabs">{sheetNames.map((name) => <button type="button" className={name === activeSheet ? 'active' : ''} title={name} key={name} onClick={() => setActiveSheet(name)}>{name}</button>)}</div>
      <DownloadAction asset={asset} filename={filename} />
    </div>
    {activeSheet ? <div className="excel-document" dangerouslySetInnerHTML={{ __html: sheetHtml[activeSheet] }} /> : <div className="pdf-status">该工作簿没有可显示的工作表。</div>}
  </div>;
  if (kind === 'image') return <div className="office-document-viewer"><div className="office-document-actions"><DownloadAction asset={asset} filename={filename} /></div><div className="source-image-document"><img src={imageUrl} alt={filename} /></div></div>;
  if (kind === 'text') return <div className="office-document-viewer"><div className="office-document-actions"><DownloadAction asset={asset} filename={filename} /></div><pre className="source-text-document">{new TextDecoder().decode(bytes)}</pre></div>;

  return <div className="source-document-fallback"><FileWarning size={30} /><strong>该文件格式暂不支持直接预览</strong><p>你仍然可以下载原始文件，并使用系统中的对应软件打开。</p><DownloadAction asset={asset} filename={filename} /></div>;
}
