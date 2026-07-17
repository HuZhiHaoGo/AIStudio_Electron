import { X } from 'lucide-react';
import { useEffect } from 'react';

export function ImagePreviewModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);

  return <div className="citation-image-modal" role="dialog" aria-modal="true" aria-label={`查看图片：${alt}`} onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <button type="button" aria-label="关闭图片预览" onClick={onClose}><X size={20} /></button>
    <img src={src} alt={alt} />
  </div>;
}

