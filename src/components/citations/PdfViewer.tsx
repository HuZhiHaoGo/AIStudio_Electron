import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';
import type { Citation, RagflowAsset } from '../../../shared/types/citation';
import { bboxToPixels } from './pdfCoordinates';

export function PdfViewer({ citation, asset }: { citation: Citation; asset: RagflowAsset }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(Math.max(1, citation.pageStart || 1));
  const [scale, setScale] = useState(1.15);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | null = null;
    setDocument(null);
    setPage(Math.max(1, citation.pageStart || 1));
    setError('');
    setLoading(true);
    void Promise.resolve().then(() => {
      if (!active) return;
      return import('pdfjs-dist/legacy/build/pdf.mjs').then((library) => {
        library.GlobalWorkerOptions.workerSrc = pdfWorker;
        task = library.getDocument({ data: Uint8Array.from(asset.bytes) });
        return task.promise;
      });
    }).then((pdf) => {
      if (active && pdf) setDocument(pdf);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'PDF 加载失败。')).finally(() => active && setLoading(false));
    return () => { active = false; void task?.destroy(); };
  }, [asset.bytes, citation.pageStart]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    let active = true;
    let renderTask: RenderTask | null = null;
    const targetPage = Math.min(document.numPages, Math.max(1, page));
    if (targetPage !== page) setPage(targetPage);
    void document.getPage(targetPage).then((pdfPage) => {
      if (!active || !canvasRef.current) return;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法创建 PDF 画布。');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      setSize({ width: viewport.width, height: viewport.height });
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
      return renderTask.promise;
    }).catch((reason) => {
      if (active && reason?.name !== 'RenderingCancelledException') setError(reason instanceof Error ? reason.message : 'PDF 页面渲染失败。');
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, page, scale]);

  const boxes = (citation.bbox || []).filter((box) => box.page === page);
  useEffect(() => {
    const firstBox = boxes[0];
    if (!firstBox || !size.height || !scrollAreaRef.current) return;
    scrollAreaRef.current.scrollTo({ top: Math.max(0, firstBox.y1 * size.height - 32), behavior: 'smooth' });
  }, [boxes, size.height]);

  if (loading) return <div className="pdf-status">正在加载原始文档…</div>;
  if (error) return <div className="pdf-status error">{error}</div>;
  return <div className="pdf-viewer">
    <div className="pdf-toolbar" aria-label="PDF 控制栏">
      <button type="button" aria-label="上一页" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={17} /></button>
      <span>{page} / {document?.numPages || 0}</span>
      <button type="button" aria-label="下一页" disabled={!document || page >= document.numPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={17} /></button>
      <i />
      <button type="button" aria-label="缩小" disabled={scale <= 0.6} onClick={() => setScale((value) => Math.max(0.6, value - 0.15))}><Minus size={17} /></button>
      <span>{Math.round(scale * 100)}%</span>
      <button type="button" aria-label="放大" disabled={scale >= 2.5} onClick={() => setScale((value) => Math.min(2.5, value + 0.15))}><Plus size={17} /></button>
    </div>
    <div className="pdf-scroll-area" ref={scrollAreaRef}>
      <div className="pdf-page" style={{ width: size.width, height: size.height }}>
        <canvas ref={canvasRef} />
        {boxes.map((box, index) => <span className="pdf-highlight" key={`${box.page}-${index}`} style={bboxToPixels(box, size.width, size.height)} />)}
      </div>
    </div>
  </div>;
}
