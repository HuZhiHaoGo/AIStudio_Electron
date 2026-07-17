import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Citation } from '../../../shared/types/citation';
import { SourceDocumentViewer } from './SourceDocumentViewer';
import { clampSourceViewerWidth, defaultSourceViewerWidth, SOURCE_VIEWER_WIDTH_KEY } from './sourceViewerSizing';

function initialWidth() {
  const saved = Number(window.localStorage.getItem(SOURCE_VIEWER_WIDTH_KEY));
  return clampSourceViewerWidth(Number.isFinite(saved) && saved > 0 ? saved : defaultSourceViewerWidth(window.innerWidth), window.innerWidth);
}

export function SourceViewer({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const [width, setWidth] = useState(initialWidth);
  const resizing = useRef(false);

  useEffect(() => {
    const fitToWindow = () => setWidth((current) => clampSourceViewerWidth(current, window.innerWidth));
    window.addEventListener('resize', fitToWindow);
    return () => {
      window.removeEventListener('resize', fitToWindow);
      document.body.classList.remove('source-viewer-resizing');
    };
  }, []);

  const updateWidth = (nextWidth: number, persist = false) => {
    const fitted = clampSourceViewerWidth(nextWidth, window.innerWidth);
    setWidth(fitted);
    if (persist) window.localStorage.setItem(SOURCE_VIEWER_WIDTH_KEY, String(fitted));
  };

  return <aside className="source-viewer" style={{ width }} aria-label={`查看原文：${citation.documentName}`}>
    <div
      className="source-viewer-resize-handle"
      role="separator"
      tabIndex={0}
      aria-label="调整原文预览宽度"
      aria-orientation="vertical"
      aria-valuenow={width}
      title="左右拖动调整宽度，双击恢复默认宽度"
      onDoubleClick={() => updateWidth(defaultSourceViewerWidth(window.innerWidth), true)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        updateWidth(width + (event.key === 'ArrowLeft' ? 24 : -24), true);
      }}
      onPointerDown={(event) => {
        resizing.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.classList.add('source-viewer-resizing');
      }}
      onPointerMove={(event) => {
        if (resizing.current) updateWidth(window.innerWidth - event.clientX);
      }}
      onPointerUp={(event) => {
        if (!resizing.current) return;
        resizing.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
        document.body.classList.remove('source-viewer-resizing');
        updateWidth(window.innerWidth - event.clientX, true);
      }}
      onPointerCancel={() => {
        resizing.current = false;
        document.body.classList.remove('source-viewer-resizing');
      }}
    />
    <header>
      <div><strong title={citation.documentName}>{citation.documentName}</strong><small>{citation.pageStart ? `跳转到第 ${citation.pageStart} 页` : '原始文档'}</small></div>
      <button type="button" aria-label="关闭原文查看器" onClick={onClose}><X size={19} /></button>
    </header>
    <SourceDocumentViewer citation={citation} />
  </aside>;
}
