// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../shared/types/citation';
import { CitationList } from './CitationList';

const citation: Citation = {
  number: 1,
  chunkId: 'chunk-1',
  datasetId: 'dataset-1',
  documentId: 'document-1',
  documentName: '员工手册.pdf',
  pageStart: 12,
  content: '这是一段足够长的引用原文。'.repeat(20),
  score: 0.82,
};

describe('CitationList', () => {
  it('renders nothing when there are no citations', () => {
    const { container } = render(<CitationList citations={[]} onViewSource={() => undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a rich citation card and supports source viewing', () => {
    const onViewSource = vi.fn();
    render(<CitationList citations={[citation]} onViewSource={onViewSource} />);
    expect(screen.queryByText('员工手册.pdf')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /参考来源/ }));
    expect(screen.getByText('员工手册.pdf')).toBeTruthy();
    expect(screen.getByText('第 12 页')).toBeTruthy();
    expect(screen.getByText('检索分数 82.0%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看原文' }));
    expect(onViewSource).toHaveBeenCalledWith(citation);
    fireEvent.click(screen.getByRole('button', { name: /参考来源/ }));
    expect(screen.queryByText('员工手册.pdf')).toBeNull();
  });
});
