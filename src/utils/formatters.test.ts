import { describe, expect, it } from 'vitest';
import { formatFileSize } from './formatters';

describe('formatFileSize', () => {
  it('formats empty and byte values', () => {
    expect(formatFileSize()).toBe('');
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes and megabytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
