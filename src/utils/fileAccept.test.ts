import { describe, expect, it } from 'vitest';
import { buildFileAccept } from './fileAccept';

describe('buildFileAccept', () => {
  it('仅允许图片时使用 Dify 返回的图片扩展名', () => {
    expect(buildFileAccept(['.JPG', '.PNG'], ['image'])).toBe('.jpg,.png');
  });

  it('同时允许图片和文档时会补充文档类型', () => {
    const accept = buildFileAccept(['.JPG', '.PNG'], ['image', 'document']);
    expect(accept).toContain('.jpg');
    expect(accept).toContain('.pdf');
    expect(accept).toContain('.docx');
  });

  it('支持音频和视频 MIME 类型', () => {
    expect(buildFileAccept([], ['audio', 'video'])).toBe('audio/*,video/*');
  });
});
