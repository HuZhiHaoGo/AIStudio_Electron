import type { DifySseEvent } from '../../../shared/types/dify';

/** Incremental parser for Dify's SSE stream. It tolerates CRLF, split UTF-8 chunks and multi-line data fields. */
export class DifySseParser {
  private buffer = '';

  push(text: string): DifySseEvent[] {
    this.buffer += text;
    const blocks = this.buffer.split(/\r?\n\r?\n/);
    this.buffer = blocks.pop() || '';
    return blocks.flatMap((block) => this.parseBlock(block));
  }

  finish(text = ''): DifySseEvent[] {
    this.buffer += text;
    const tail = this.buffer;
    this.buffer = '';
    return tail.trim() ? this.parseBlock(tail) : [];
  }

  private parseBlock(block: string): DifySseEvent[] {
    const payload = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();

    if (!payload || payload === '[DONE]') return [];
    try {
      const value = JSON.parse(payload) as DifySseEvent;
      return value && typeof value === 'object' ? [value] : [];
    } catch (error) {
      throw new Error(`Dify SSE 数据解析失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
