import { describe, expect, it } from 'vitest';
import { detectSourceDocumentKind } from './sourceDocumentType';

describe('detectSourceDocumentKind', () => {
  it('uses the PDF signature even without a useful content type', () => {
    expect(detectSourceDocumentKind({ bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), mimeType: 'application/octet-stream' })).toBe('pdf');
  });

  it('recognises Word and legacy Excel documents', () => {
    expect(detectSourceDocumentKind({ bytes: new Uint8Array([0x50, 0x4b]), mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe('word');
    expect(detectSourceDocumentKind({ bytes: new Uint8Array([0xd0, 0xcf]), mimeType: 'application/vnd.ms-excel' })).toBe('excel');
  });

  it('falls back to the citation filename', () => {
    expect(detectSourceDocumentKind({ bytes: new Uint8Array(), mimeType: 'application/octet-stream' }, '说明表.xls')).toBe('excel');
  });
});
