export function safeFilename(value?: string) {
  const fallback = '下载文件';
  const name = value?.trim() || fallback;
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || fallback;
}
