import DOMPurify from 'dompurify';
import { ChevronLeft, ChevronRight, FileWarning } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RagflowAsset } from '../../../shared/types/citation';
import type { SourceDocumentKind } from './sourceDocumentType';
import { sourceDocumentKindLabel } from './sourceDocumentType';

export function OfficeDocumentViewer({ asset, filename, documentKey, kind }: { asset: RagflowAsset; filename: string; documentKey: string; kind: SourceDocumentKind }) {
  const [html, setHtml] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetHtml, setSheetHtml] = useState<Record<string, string>>({});
  const [activeSheet, setActiveSheet] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(kind === 'word' || kind === 'excel');
  const bytes = useMemo(() => Uint8Array.from(asset.bytes), [asset.bytes]);
  const excelDocumentRef = useRef<HTMLDivElement>(null);
  const sheetTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sheetStorageKey = `aistudio.source-sheet.${documentKey}`;

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
      }).catch((reason) => {
        console.error('Word source preview failed:', reason);
        if (active) setError('文档内容无法解析，请确认原文件没有损坏。');
      }).finally(() => active && setLoading(false));
    } else if (kind === 'excel') {
      void import('xlsx').then((xlsx) => {
        const workbook = xlsx.read(bytes, { type: 'array', cellDates: true });
        const names = workbook.SheetNames;
        const pages = Object.fromEntries(names.map((name) => [name, DOMPurify.sanitize(xlsx.utils.sheet_to_html(workbook.Sheets[name], { id: undefined }))]));
        if (active) {
          setSheetNames(names);
          setSheetHtml(pages);
          const savedSheet = window.localStorage.getItem(sheetStorageKey) || '';
          setActiveSheet(names.includes(savedSheet) ? savedSheet : (names[0] || ''));
        }
      }).catch((reason) => {
        console.error('Excel source preview failed:', reason);
        if (active) setError('工作簿内容无法解析，请确认原文件没有损坏。');
      }).finally(() => active && setLoading(false));
    }
    return () => { active = false; };
  }, [asset.mimeType, bytes, kind, sheetStorageKey]);

  useEffect(() => {
    if (!activeSheet) return;
    sheetTabRefs.current[activeSheet]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    excelDocumentRef.current?.scrollTo?.({ top: 0, left: 0 });
  }, [activeSheet]);

  const activeSheetIndex = sheetNames.indexOf(activeSheet);
  const selectSheet = (index: number) => {
    const name = sheetNames[index];
    if (!name) return;
    setActiveSheet(name);
    window.localStorage.setItem(sheetStorageKey, name);
  };

  if (loading) return <div className="pdf-status">正在解析 {sourceDocumentKindLabel(kind)} 原始文档…</div>;
  if (error) return <div className="source-document-fallback"><FileWarning size={30} /><strong>{sourceDocumentKindLabel(kind)} 文档暂时无法预览</strong><p>{error}</p></div>;

  if (kind === 'word') return <div className="office-document-viewer document-without-toolbar"><article className="word-document" dangerouslySetInnerHTML={{ __html: html }} /></div>;
  if (kind === 'excel') return <div className="office-document-viewer">
    <div className="office-document-actions" aria-label="Excel 工作表选择">
      <button className="sheet-nav-button" type="button" aria-label="上一个工作表" title="上一个工作表" disabled={activeSheetIndex <= 0} onClick={() => selectSheet(activeSheetIndex - 1)}><ChevronLeft size={18} /></button>
      <div className="sheet-tabs">{sheetNames.map((name, index) => <button ref={(element) => { sheetTabRefs.current[name] = element; }} type="button" className={name === activeSheet ? 'active' : ''} title={name} key={name} onClick={() => selectSheet(index)}>{name}</button>)}</div>
      <button className="sheet-nav-button" type="button" aria-label="下一个工作表" title="下一个工作表" disabled={activeSheetIndex < 0 || activeSheetIndex >= sheetNames.length - 1} onClick={() => selectSheet(activeSheetIndex + 1)}><ChevronRight size={18} /></button>
    </div>
    {activeSheet ? <div className="excel-document" ref={excelDocumentRef} dangerouslySetInnerHTML={{ __html: sheetHtml[activeSheet] }} /> : <div className="pdf-status">该工作簿没有可显示的工作表。</div>}
  </div>;
  if (kind === 'image') return <div className="office-document-viewer document-without-toolbar"><div className="source-image-document"><img src={imageUrl} alt={filename} /></div></div>;
  if (kind === 'text') return <div className="office-document-viewer document-without-toolbar"><pre className="source-text-document">{new TextDecoder().decode(bytes)}</pre></div>;

  return <div className="source-document-fallback"><FileWarning size={30} /><strong>该文件格式暂不支持直接预览</strong><p>当前应用没有适用于此文件格式的预览组件。</p></div>;
}
