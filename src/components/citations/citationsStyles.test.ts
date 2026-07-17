import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('rich citation styles', () => {
  it('includes dark-mode styles for cards and the source viewer', () => {
    const css = fs.readFileSync('src/styles.css', 'utf8');
    const darkMode = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(darkMode).toContain('.citation-card');
    expect(darkMode).toContain('.source-viewer');
  });
});
