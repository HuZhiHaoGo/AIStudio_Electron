// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeDocumentViewer } from './OfficeDocumentViewer';

vi.mock('xlsx', () => ({
  read: () => ({ SheetNames: ['工作表一', '名称特别长的工作表二'], Sheets: { 工作表一: {}, 名称特别长的工作表二: {} } }),
  utils: { sheet_to_html: (_sheet: unknown, options?: { id?: string }) => `<table data-id="${options?.id || ''}"><tr><td>内容</td></tr></table>` },
}));

describe('OfficeDocumentViewer Excel navigation', () => {
  afterEach(cleanup);
  beforeEach(() => window.localStorage.clear());

  it('switches sheets with arrows, preserves the sheet, and has no download action', async () => {
    render(<OfficeDocumentViewer asset={{ bytes: new Uint8Array(), mimeType: 'application/vnd.ms-excel' }} filename="测试.xls" documentKey="doc-1" kind="excel" />);
    const previous = await screen.findByRole('button', { name: '上一个工作表' });
    const next = screen.getByRole('button', { name: '下一个工作表' });
    expect((previous as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('下载原始文件')).toBeNull();
    fireEvent.click(next);
    await waitFor(() => expect(screen.getByTitle('名称特别长的工作表二').classList.contains('active')).toBe(true));
    expect(window.localStorage.getItem('aistudio.source-sheet.doc-1')).toBe('名称特别长的工作表二');
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });
});
