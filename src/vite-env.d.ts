/// <reference types="vite/client" />

import type { DifyApiBridge } from '../shared/types/ipc';

declare global {
  interface Window {
    difyApi: DifyApiBridge;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: {
        className?: string;
        src?: string;
      };
    }
  }
}

export {};
