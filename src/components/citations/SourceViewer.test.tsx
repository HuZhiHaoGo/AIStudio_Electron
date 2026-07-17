// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../shared/types/citation';
import { SourceViewer } from './SourceViewer';
import { SOURCE_VIEWER_WIDTH_KEY } from './sourceViewerSizing';

vi.mock('./SourceDocumentViewer', () => ({ SourceDocumentViewer: () => <div>document</div> }));

const citation: Citation = { number: 1, chunkId: 'chunk', documentName: '一份很长的原始文件名称.xlsx', content: '' };

describe('SourceViewer', () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1_400 });
  });

  it('resizes with the keyboard and remembers the chosen width', () => {
    const { container } = render(<SourceViewer citation={citation} onClose={vi.fn()} />);
    const viewer = container.querySelector<HTMLElement>('.source-viewer');
    const handle = screen.getByRole('separator', { name: '调整原文预览宽度' });
    expect(viewer?.style.width).toBe('560px');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(viewer?.style.width).toBe('584px');
    expect(window.localStorage.getItem(SOURCE_VIEWER_WIDTH_KEY)).toBe('584');
    fireEvent.doubleClick(handle);
    expect(viewer?.style.width).toBe('560px');
  });

  it('shows the complete filename as a hover title', () => {
    render(<SourceViewer citation={citation} onClose={vi.fn()} />);
    expect(screen.getByTitle(citation.documentName)).toBeTruthy();
  });
});
