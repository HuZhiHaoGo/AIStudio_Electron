import type { CitationBBox } from '../../../shared/types/citation';

export function bboxToPixels(box: CitationBBox, pageWidth: number, pageHeight: number) {
  return {
    left: box.x1 * pageWidth,
    top: box.y1 * pageHeight,
    width: (box.x2 - box.x1) * pageWidth,
    height: (box.y2 - box.y1) * pageHeight,
  };
}
