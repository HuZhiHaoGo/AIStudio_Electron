import { describe, expect, it } from 'vitest';
import type { Citation } from '../../../shared/types/citation';
import { validateAndRenumberCitations } from './citationValidator';

const citation = (number: number, chunkId: string): Citation => ({ number, chunkId, documentName: '文档', content: `内容-${chunkId}` });

describe('citation validation', () => {
  it('removes unknown and duplicate chunks and renumbers answer markers', () => {
    const result = validateAndRenumberCitations('结论[2]，无效[9]', [citation(2, 'b'), citation(3, 'b'), citation(9, 'x')], new Set(['b']));
    expect(result.answer).toBe('结论[1]，无效');
    expect(result.citations.map((item) => item.chunkId)).toEqual(['b']);
    expect(result.citations[0].number).toBe(1);
  });
});

