export const SOURCE_VIEWER_MIN_WIDTH = 380;
export const SOURCE_VIEWER_DEFAULT_WIDTH = 560;
export const SOURCE_VIEWER_MAIN_MIN_WIDTH = 440;
export const SOURCE_VIEWER_WIDTH_KEY = 'aistudio.source-viewer-width';

export function clampSourceViewerWidth(width: number, viewportWidth: number) {
  const maximum = Math.max(SOURCE_VIEWER_MIN_WIDTH, viewportWidth - SOURCE_VIEWER_MAIN_MIN_WIDTH);
  return Math.round(Math.min(maximum, Math.max(SOURCE_VIEWER_MIN_WIDTH, width)));
}

export function defaultSourceViewerWidth(viewportWidth: number) {
  return clampSourceViewerWidth(SOURCE_VIEWER_DEFAULT_WIDTH, viewportWidth);
}
