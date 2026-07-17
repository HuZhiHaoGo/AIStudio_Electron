// @vitest-environment jsdom
import {
  cleanup, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Citation, RagflowAsset } from '../../../shared/types/citation';
import { PDF_READING_MODE_KEY, PdfViewer } from './PdfViewer';

const pdfMocks = vi.hoisted(() => {
  const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const getPage = vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render,
  }));
  const document = { numPages: 3, getPage };
  return { document, getPage, render };
});

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({ promise: Promise.resolve(pdfMocks.document), destroy: vi.fn() }),
}));

const citation: Citation = {
  number: 1,
  chunkId: 'chunk-1',
  documentName: '制度.pdf',
  content: '',
  pageStart: 2,
};
const asset: RagflowAsset = { bytes: new Uint8Array([37, 80, 68, 70, 45]), mimeType: 'application/pdf' };

describe('PdfViewer reading modes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    pdfMocks.getPage.mockClear();
    pdfMocks.render.mockClear();
  });

  it('switches between single-page and continuous modes and remembers the choice', async () => {
    render(<PdfViewer citation={citation} asset={asset} />);
    expect(await screen.findByText('2 / 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: '单页' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '连续' }));
    await waitFor(() => expect(screen.getAllByLabelText(/PDF 第 \d 页/)).toHaveLength(3));
    expect(window.localStorage.getItem(PDF_READING_MODE_KEY)).toBe('continuous');
    expect(screen.getByRole('button', { name: '连续' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('3 / 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '单页' }));
    expect(window.localStorage.getItem(PDF_READING_MODE_KEY)).toBe('single');
    expect(screen.getByText('3 / 3')).toBeTruthy();
  });

  it('restores continuous mode from local storage', async () => {
    window.localStorage.setItem(PDF_READING_MODE_KEY, 'continuous');
    render(<PdfViewer citation={citation} asset={asset} />);
    await waitFor(() => expect(screen.getAllByLabelText(/PDF 第 \d 页/)).toHaveLength(3));
    expect(screen.getByRole('button', { name: '连续' }).getAttribute('aria-pressed')).toBe('true');
  });
});
