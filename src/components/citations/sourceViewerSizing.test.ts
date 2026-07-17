import { describe, expect, it } from 'vitest';
import { clampSourceViewerWidth, defaultSourceViewerWidth } from './sourceViewerSizing';

describe('source viewer sizing', () => {
  it('keeps both the viewer and chat area usable', () => {
    expect(clampSourceViewerWidth(100, 1200)).toBe(380);
    expect(clampSourceViewerWidth(1000, 1200)).toBe(760);
  });

  it('uses the preferred width when the window is large enough', () => {
    expect(defaultSourceViewerWidth(1600)).toBe(560);
  });
});
