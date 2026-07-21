import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('rich citation styles', () => {
  it('includes dark-mode styles for cards and the source viewer', () => {
    // 引用样式有独立归属；入口文件只负责声明样式加载顺序。
    const css = fs.readFileSync('src/styles/citations.css', 'utf8');
    const darkMode = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(darkMode).toContain('.citation-card');
    expect(darkMode).toContain('.source-viewer');
  });
});
