import type { RagflowAsset } from '../../../shared/types/citation';

export type SourceDocumentKind = 'pdf' | 'word' | 'excel' | 'image' | 'text' | 'unknown';

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectSourceDocumentKind(asset: RagflowAsset, fallbackName = ''): SourceDocumentKind {
  const bytes = Uint8Array.from(asset.bytes).subarray(0, 8);
  const mime = (asset.mimeType || '').split(';')[0].trim().toLowerCase();
  const filename = (asset.filename || fallbackName).toLowerCase();

  // 先看文件头，避免代理或服务器把所有文件都标成 application/octet-stream。
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  if (startsWith(bytes, [0xff, 0xd8, 0xff]) || startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image';

  if (mime === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  if (mime.includes('wordprocessingml') || mime === 'application/msword' || /\.docx?$/.test(filename)) return 'word';
  if (mime.includes('spreadsheetml') || mime.includes('excel') || /\.xlsx?$/.test(filename)) return 'excel';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(filename)) return 'image';
  if (mime.startsWith('text/') || /\.(txt|md|csv|json|xml|log)$/.test(filename)) return 'text';
  return 'unknown';
}

export function sourceDocumentKindLabel(kind: SourceDocumentKind) {
  return ({ pdf: 'PDF', word: 'Word', excel: 'Excel', image: '图片', text: '文本', unknown: '文件' } as const)[kind];
}
