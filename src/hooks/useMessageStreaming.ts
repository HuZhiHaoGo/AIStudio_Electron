import { useEffect, useRef, useState } from 'react';
import { difyApiClient } from '../services/difyApiClient';

export function useMessageStreaming(isSending: boolean) {
  const [streamingContent, setStreamingContent] = useState('');
  const [loadingDots, setLoadingDots] = useState('.');
  const activeStreamIdRef = useRef('');

  useEffect(() => {
    return difyApiClient.onMessageStreamChunk((chunk) => {
      setStreamingContent((current) => {
        if (chunk.streamId !== activeStreamIdRef.current) {
          return current;
        }

        return current + chunk.content;
      });
    });
  }, []);

  useEffect(() => {
    if (!isSending || streamingContent) {
      setLoadingDots('.');
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingDots((current) => (current.length >= 3 ? '.' : `${current}.`));
    }, 420);

    return () => window.clearInterval(timer);
  }, [isSending, streamingContent]);

  return {
    activeStreamIdRef,
    streamingContent,
    setStreamingContent,
    loadingDots,
  };
}
