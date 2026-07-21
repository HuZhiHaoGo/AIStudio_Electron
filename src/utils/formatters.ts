const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** 统一会话列表和消息区域中的 ISO 时间显示格式。 */
export function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

/** 文件大小和上传限制都来自字节数，因此这里按 1024 进位。 */
export function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
