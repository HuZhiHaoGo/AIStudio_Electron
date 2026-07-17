import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Minus, Plus } from 'lucide-react';
import type {
  PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask,
} from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import type { RefObject } from 'react';
import type { Citation, CitationBBox, RagflowAsset } from '../../../shared/types/citation';
import { bboxToPixels } from './pdfCoordinates';

export type PdfReadingMode = 'single' | 'continuous';
export const PDF_READING_MODE_KEY = 'aistudio.pdf-reading-mode';

function savedReadingMode(): PdfReadingMode {
  try {
    return window.localStorage.getItem(PDF_READING_MODE_KEY) === 'continuous' ? 'continuous' : 'single';
  } catch {
    return 'single';
  }
}

function friendlyPdfError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : '';
  if (/password/i.test(message)) return '该 PDF 受到密码保护，当前无法直接预览。';
  if (/invalid pdf|missing pdf|xref|format/i.test(message)) return 'PDF 文件结构无法解析，请确认原文件没有损坏。';
  return 'PDF 文档加载失败，请稍后重试。';
}

function clampPage(value: number, total: number) {
  return Math.min(Math.max(1, value), Math.max(1, total));
}

type ContinuousPageProps = {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  boxes: CitationBBox[];
  scrollRootRef: RefObject<HTMLDivElement | null>;
  onReady: (pageNumber: number, height: number) => void;
};

function ContinuousPdfPage({
  document, pageNumber, scale, boxes, scrollRootRef, onReady,
}: ContinuousPageProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfPage, setPdfPage] = useState<PDFPageProxy | null>(null);
  const [size, setSize] = useState({ width: 0, height: 680 });
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setPdfPage(null);
    setError(false);
    void document.getPage(pageNumber).then((loadedPage) => {
      if (!active) return;
      const viewport = loadedPage.getViewport({ scale });
      setPdfPage(loadedPage);
      setSize({ width: viewport.width, height: viewport.height });
      onReady(pageNumber, viewport.height);
    }).catch((reason) => {
      console.error(`PDF page ${pageNumber} metadata failed:`, reason);
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [document, onReady, pageNumber, scale]);

  useEffect(() => {
    const target = shellRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      root: scrollRootRef.current,
      rootMargin: '1200px 0px',
      threshold: 0,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [scrollRootRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!visible || !pdfPage) {
      canvas.width = 1;
      canvas.height = 1;
      return undefined;
    }
    let active = true;
    let renderTask: RenderTask | null = null;
    const viewport = pdfPage.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) {
      setError(true);
      return undefined;
    }
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
    void renderTask.promise.catch((reason) => {
      if (active && reason?.name !== 'RenderingCancelledException') {
        console.error(`PDF page ${pageNumber} rendering failed:`, reason);
        setError(true);
      }
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [pageNumber, pdfPage, scale, visible]);

  return <div
    className="pdf-page pdf-continuous-page"
    data-pdf-page={pageNumber}
    ref={shellRef}
    style={{ width: size.width || undefined, height: size.height }}
    aria-label={`PDF 第 ${pageNumber} 页`}
  >
    <span className="pdf-page-number">{pageNumber}</span>
    {error ? <div className="pdf-page-error">第 {pageNumber} 页渲染失败</div> : <canvas ref={canvasRef} />}
    {!error && boxes.map((box, index) => <span
      className="pdf-highlight"
      key={`${box.page}-${index}`}
      style={bboxToPixels(box, size.width, size.height)}
    />)}
  </div>;
}

export function PdfViewer({ citation, asset }: { citation: Citation; asset: RagflowAsset }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pendingScrollPageRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const continuousPageHeightsRef = useRef(new Map<number, number>());
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(Math.max(1, citation.pageStart || 1));
  const [scale, setScale] = useState(1.15);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<PdfReadingMode>(savedReadingMode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | null = null;
    setDocument(null);
    setPage(Math.max(1, citation.pageStart || 1));
    pendingScrollPageRef.current = Math.max(1, citation.pageStart || 1);
    continuousPageHeightsRef.current.clear();
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
    }).catch((reason) => {
      console.error('PDF source preview failed:', reason);
      if (active) setError(friendlyPdfError(reason));
    }).finally(() => active && setLoading(false));
    return () => { active = false; void task?.destroy(); };
  }, [asset.bytes, citation.pageStart]);

  useEffect(() => {
    if (!document || mode !== 'single' || !canvasRef.current) return;
    let active = true;
    let renderTask: RenderTask | null = null;
    const targetPage = clampPage(page, document.numPages);
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
      if (active && reason?.name !== 'RenderingCancelledException') {
        console.error('PDF page rendering failed:', reason);
        setError('PDF 页面渲染失败，请尝试切换页面或重新打开原文。');
      }
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, mode, page, scale]);

  const singlePageBoxes = useMemo(
    () => (citation.bbox || []).filter((box) => box.page === page),
    [citation.bbox, page],
  );
  const boxesByPage = useMemo(() => {
    const grouped = new Map<number, CitationBBox[]>();
    for (const box of citation.bbox || []) grouped.set(box.page, [...(grouped.get(box.page) || []), box]);
    return grouped;
  }, [citation.bbox]);

  useEffect(() => {
    if (mode !== 'single') return;
    const root = scrollAreaRef.current;
    if (!root || !size.height) return;
    const firstBox = singlePageBoxes[0];
    root.scrollTo({
      top: firstBox ? Math.max(0, firstBox.y1 * size.height - 32) : 0,
      behavior: firstBox ? 'smooth' : 'auto',
    });
  }, [mode, singlePageBoxes, size.height]);

  const scrollContinuousPage = useCallback((targetPage: number, behavior: ScrollBehavior = 'smooth') => {
    const root = scrollAreaRef.current;
    const target = root?.querySelector<HTMLElement>(`[data-pdf-page="${targetPage}"]`);
    if (!root || !target) return false;
    const firstBox = boxesByPage.get(targetPage)?.[0];
    const pageHeight = continuousPageHeightsRef.current.get(targetPage) || target.offsetHeight;
    const boxOffset = firstBox ? firstBox.y1 * pageHeight : 0;
    root.scrollTo({ top: Math.max(0, target.offsetTop + boxOffset - 18), behavior });
    return true;
  }, [boxesByPage]);

  const handleContinuousPageReady = useCallback((pageNumber: number, height: number) => {
    continuousPageHeightsRef.current.set(pageNumber, height);
    if (pendingScrollPageRef.current !== pageNumber) return;
    pendingScrollPageRef.current = null;
    requestAnimationFrame(() => scrollContinuousPage(pageNumber, 'auto'));
  }, [scrollContinuousPage]);

  useEffect(() => {
    if (!document || mode !== 'continuous') return;
    const target = clampPage(pendingScrollPageRef.current || page, document.numPages);
    pendingScrollPageRef.current = target;
    const frame = requestAnimationFrame(() => scrollContinuousPage(target, 'auto'));
    return () => cancelAnimationFrame(frame);
  }, [document, mode, scale, scrollContinuousPage]);

  const syncContinuousPage = useCallback(() => {
    if (mode !== 'continuous' || !scrollAreaRef.current) return;
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const root = scrollAreaRef.current;
      if (!root) return;
      const rootTop = root.getBoundingClientRect().top + 24;
      const pages = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]'));
      let closestPage = page;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const element of pages) {
        const rect = element.getBoundingClientRect();
        const distance = rect.top <= rootTop && rect.bottom >= rootTop
          ? 0
          : Math.min(Math.abs(rect.top - rootTop), Math.abs(rect.bottom - rootTop));
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = Number(element.dataset.pdfPage) || closestPage;
        }
      }
      setPage((current) => current === closestPage ? current : closestPage);
    });
  }, [mode, page]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const selectMode = (nextMode: PdfReadingMode) => {
    if (nextMode === mode) return;
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
    pendingScrollPageRef.current = page;
    setMode(nextMode);
    try { window.localStorage.setItem(PDF_READING_MODE_KEY, nextMode); } catch { /* Ignore unavailable storage. */ }
  };

  const navigateToPage = (nextPage: number) => {
    if (!document) return;
    const target = clampPage(nextPage, document.numPages);
    setPage(target);
    if (mode === 'continuous') {
      pendingScrollPageRef.current = target;
      requestAnimationFrame(() => scrollContinuousPage(target));
    }
  };

  if (loading) return <div className="pdf-status">正在加载原始文档…</div>;
  if (error) return <div className="pdf-status error">{error}</div>;
  return <div className="pdf-viewer">
    <div className="pdf-toolbar" aria-label="PDF 控制栏">
      <button type="button" aria-label="上一页" disabled={page <= 1} onClick={() => navigateToPage(page - 1)}>
        {mode === 'single' ? <ChevronLeft size={17} /> : <ChevronUp size={17} />}
      </button>
      <span>{page} / {document?.numPages || 0}</span>
      <button type="button" aria-label="下一页" disabled={!document || page >= document.numPages} onClick={() => navigateToPage(page + 1)}>
        {mode === 'single' ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
      </button>
      <div className="pdf-mode-switch" role="group" aria-label="PDF 阅读模式">
        <button type="button" className={mode === 'single' ? 'active' : ''} aria-pressed={mode === 'single'} title="每次显示一页，使用左右按钮翻页" onClick={() => selectMode('single')}>单页</button>
        <button type="button" className={mode === 'continuous' ? 'active' : ''} aria-pressed={mode === 'continuous'} title="页面从上到下排列，使用滚轮连续阅读" onClick={() => selectMode('continuous')}>连续</button>
      </div>
      <i />
      <button type="button" aria-label="缩小" disabled={scale <= 0.6} onClick={() => setScale((value) => Math.max(0.6, value - 0.15))}><Minus size={17} /></button>
      <span>{Math.round(scale * 100)}%</span>
      <button type="button" aria-label="放大" disabled={scale >= 2.5} onClick={() => setScale((value) => Math.min(2.5, value + 0.15))}><Plus size={17} /></button>
    </div>
    <div
      className={`pdf-scroll-area ${mode === 'continuous' ? 'continuous' : 'single'}`}
      ref={scrollAreaRef}
      onScroll={syncContinuousPage}
    >
      {mode === 'single' ? <div className="pdf-page" style={{ width: size.width, height: size.height }}>
        <canvas ref={canvasRef} />
        {singlePageBoxes.map((box, index) => <span className="pdf-highlight" key={`${box.page}-${index}`} style={bboxToPixels(box, size.width, size.height)} />)}
      </div> : <div className="pdf-continuous-pages">
        {document && Array.from({ length: document.numPages }, (_, index) => {
          const pageNumber = index + 1;
          return <ContinuousPdfPage
            key={pageNumber}
            document={document}
            pageNumber={pageNumber}
            scale={scale}
            boxes={boxesByPage.get(pageNumber) || []}
            scrollRootRef={scrollAreaRef}
            onReady={handleContinuousPageReady}
          />;
        })}
      </div>}
    </div>
  </div>;
}
