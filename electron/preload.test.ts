import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('sandbox preload boundary', () => {
  it('keeps IPC channel values self-contained at runtime', () => {
    const source = fs.readFileSync('electron/preload.ts', 'utf8');

    // 沙箱 preload 的运行时 require 无法加载项目中的相对模块。
    expect(source).not.toContain("import { IPC_CHANNELS } from '../shared/ipc/channels'");
    expect(source).toContain("satisfies typeof import('../shared/ipc/channels').IPC_CHANNELS");
  });
});
