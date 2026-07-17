import { describe, expect, it } from 'vitest';
import { parseStructuredDifyAnswer } from './eventAccumulator';

describe('structured Dify answer', () => {
  it('parses valid JSON with citations', () => {
    expect(parseStructuredDifyAnswer('{"answer":"结论[1]","citations":[{"number":1,"chunk_id":"c1"}]}'))
      .toEqual({ answer: '结论[1]', citations: [{ number: 1, chunk_id: 'c1' }] });
  });

  it('falls back for invalid model JSON', () => {
    expect(parseStructuredDifyAnswer('{bad json')).toBeNull();
    expect(parseStructuredDifyAnswer('普通回答')).toBeNull();
  });
});
