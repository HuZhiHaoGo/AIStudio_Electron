import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PopupState = { text: string; left: number; top: number; copied: boolean };

function elementFromNode(node: Node | null) {
  return node instanceof Element ? node : node?.parentElement || null;
}

/** Only accepts a selection whose two ends are inside the same message body. */
export function selectedMessageText(selection: Selection | null) {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const text = selection.toString();
  if (!text.trim()) return null;
  const startScope = elementFromNode(selection.anchorNode)?.closest('.message-copy-scope');
  const endScope = elementFromNode(selection.focusNode)?.closest('.message-copy-scope');
  if (!startScope || startScope !== endScope) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  return { text, rect };
}

export function SelectionCopyPopup() {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const popupRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const selected = selectedMessageText(window.getSelection());
      if (!selected) return setPopup(null);
      const center = selected.rect.left + selected.rect.width / 2;
      const left = Math.min(window.innerWidth - 52, Math.max(52, center));
      const top = selected.rect.top >= 48 ? selected.rect.top - 40 : selected.rect.bottom + 8;
      setPopup({ text: selected.text, left, top, copied: false });
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) setPopup(null);
    };
    const hideOnScroll = () => setPopup(null);
    document.addEventListener('selectionchange', update);
    document.addEventListener('mouseup', update);
    document.addEventListener('keyup', update);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('scroll', hideOnScroll, true);
    return () => {
      document.removeEventListener('selectionchange', update);
      document.removeEventListener('mouseup', update);
      document.removeEventListener('keyup', update);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('scroll', hideOnScroll, true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!popup) return null;
  return createPortal(<button
    ref={popupRef}
    className="selection-copy-popup"
    type="button"
    style={{ left: popup.left, top: popup.top }}
    aria-label={popup.copied ? '选中文字已复制' : '复制选中文字'}
    onMouseDown={(event) => event.preventDefault()}
    onClick={async () => {
      await navigator.clipboard.writeText(popup.text);
      setPopup((current) => current ? { ...current, copied: true } : null);
      hideTimerRef.current = window.setTimeout(() => {
        window.getSelection()?.removeAllRanges();
        setPopup(null);
      }, 900);
    }}
  >
    {popup.copied ? <Check size={15} /> : <Copy size={15} />}
    {popup.copied ? '已复制' : '复制'}
  </button>, document.body);
}
