import { useEffect, useRef, useState } from 'react';

export function useScrollToBottom() {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const showScrollToBottomRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  function isNearBottom(element: HTMLDivElement) {
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceToBottom < 96;
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior });
  }

  function setScrollToBottomVisibility(isVisible: boolean) {
    showScrollToBottomRef.current = isVisible;
    setShowScrollToBottom(isVisible);
  }

  function updateMessagesScrollState() {
    const element = messagesRef.current;

    if (!element) {
      return;
    }

    const nearBottom = isNearBottom(element);
    const nextShowScrollToBottom = !nearBottom;
    shouldStickToBottomRef.current = nearBottom;

    if (showScrollToBottomRef.current !== nextShowScrollToBottom) {
      setScrollToBottomVisibility(nextShowScrollToBottom);
    }
  }

  function handleMessagesScroll() {
    if (scrollRafRef.current !== null) {
      return;
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateMessagesScrollState();
    });
  }

  return {
    messagesRef,
    messagesEndRef,
    shouldStickToBottomRef,
    showScrollToBottom,
    setScrollToBottomVisibility,
    scrollMessagesToBottom,
    handleMessagesScroll,
  };
}
