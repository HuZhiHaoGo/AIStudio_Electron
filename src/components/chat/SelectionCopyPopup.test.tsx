// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionCopyPopup, selectedMessageText } from './SelectionCopyPopup';

function mockSelection(anchorNode: Node, text = '选中的内容') {
  const selection = {
    isCollapsed: false, rangeCount: 1, anchorNode, focusNode: anchorNode,
    toString: () => text,
    getRangeAt: () => ({ getBoundingClientRect: () => ({ left: 100, right: 180, top: 100, bottom: 120, width: 80, height: 20 }) }),
    removeAllRanges: vi.fn(),
  } as unknown as Selection;
  vi.spyOn(window, 'getSelection').mockReturnValue(selection);
  return selection;
}

describe('SelectionCopyPopup', () => {
  it('ignores text outside a message body', () => {
    const element = document.createElement('p');
    element.textContent = '普通界面文字';
    document.body.appendChild(element);
    expect(selectedMessageText(mockSelection(element.firstChild!))).toBeNull();
    element.remove();
    vi.restoreAllMocks();
  });

  it('copies only the selected message text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const scope = document.createElement('div');
    scope.className = 'message-copy-scope';
    scope.textContent = '完整消息中的选中内容';
    document.body.appendChild(scope);
    mockSelection(scope.firstChild!, '选中内容');
    render(<SelectionCopyPopup />);
    document.dispatchEvent(new Event('selectionchange'));
    fireEvent.click(await screen.findByRole('button', { name: '复制选中文字' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('选中内容'));
    scope.remove();
    vi.restoreAllMocks();
  });
});
