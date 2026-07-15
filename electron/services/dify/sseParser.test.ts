import { describe, expect, it } from 'vitest';
import { DifySseParser } from './sseParser';

describe('DifySseParser', () => {
  it('parses events split across chunks', () => {
    const parser = new DifySseParser();
    expect(parser.push('data: {"event":"mess')).toEqual([]);
    expect(parser.push('age","answer":"你')).toEqual([]);
    expect(parser.push('好"}\n\n')).toEqual([{ event: 'message', answer: '你好' }]);
  });

  it('supports CRLF, comments and DONE', () => {
    const parser = new DifySseParser();
    expect(parser.push(': ping\r\ndata: {"event":"ping"}\r\n\r\ndata: [DONE]\r\n\r\n')).toEqual([{ event: 'ping' }]);
  });

  it('reports malformed JSON with a useful error', () => {
    const parser = new DifySseParser();
    expect(() => parser.push('data: {bad}\n\n')).toThrow('Dify SSE 数据解析失败');
  });
});
