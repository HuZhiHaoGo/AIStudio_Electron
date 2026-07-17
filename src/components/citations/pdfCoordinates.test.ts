import { describe, expect, it } from 'vitest';
import { bboxToPixels } from './pdfCoordinates';

describe('PDF citation coordinates', () => {
  it('converts normalized bbox values to page pixels', () => {
    expect(bboxToPixels({ page: 2, x1: 0.1, y1: 0.25, x2: 0.6, y2: 0.5 }, 1000, 1200))
      .toEqual({ left: 100, top: 300, width: 500, height: 300 });
  });
});
