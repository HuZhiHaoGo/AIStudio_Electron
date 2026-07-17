import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CitationImage } from '../../../shared/types/citation';
import { difyApiClient } from '../../services/difyApiClient';
import { ImagePreviewModal } from './ImagePreviewModal';

function CitationImageItem({ image, datasetId, onPreview }: { image: CitationImage; datasetId?: string; onPreview: (src: string, alt: string) => void }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFailed(false);
    void difyApiClient.loadRagflowImage({ imageId: image.id, datasetId }).then((asset) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(new Blob([Uint8Array.from(asset.bytes)], { type: asset.mimeType }));
      setSrc(objectUrl);
    }).catch(() => active && setFailed(true));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [datasetId, image.id]);

  const alt = image.caption || `引用图片${image.page ? `，第 ${image.page} 页` : ''}`;
  if (failed) return <div className="citation-image-fallback"><ImageOff size={18} /><span>图片加载失败</span></div>;
  return <button className="citation-image-thumb" type="button" disabled={!src} aria-label={`放大${alt}`} onClick={() => src && onPreview(src, alt)}>
    {src ? <img src={src} alt={alt} /> : <span>正在加载图片…</span>}
  </button>;
}

export function CitationImageGallery({ images, datasetId }: { images?: CitationImage[]; datasetId?: string }) {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  if (!images?.length) return null;
  return <>
    <div className="citation-image-gallery" aria-label="引用图片">
      {images.map((image) => <CitationImageItem key={image.id} image={image} datasetId={datasetId} onPreview={(src, alt) => setPreview({ src, alt })} />)}
    </div>
    {preview ? <ImagePreviewModal src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} /> : null}
  </>;
}

