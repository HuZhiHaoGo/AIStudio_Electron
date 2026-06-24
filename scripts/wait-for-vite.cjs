const { spawn } = require('node:child_process');
const net = require('node:net');

// 开发模式有两个进程：
// 1. Vite dev server，提供 React 页面。
// 2. Electron，加载 Vite 页面并显示桌面窗口。
// 这个脚本负责等 Vite 启动成功后，再启动 Electron。

const host = '127.0.0.1';
const port = 5173;
const url = `http://${host}:${port}`;
const timeoutMs = 30000;
const startedAt = Date.now();

function canConnect() {
  // 尝试连接 127.0.0.1:5173，能连上就说明 Vite 已经启动。
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForVite() {
  // 最多等待 30 秒，避免 Vite 启动失败时脚本无限卡住。
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Vite dev server did not start at ${url}`);
}

waitForVite()
  .then(() => {
    // require('electron') 在 Node 环境中返回 electron.exe 的路径。
    const electronPath = require('electron');
    const childEnv = { ...process.env, VITE_DEV_SERVER_URL: url };

    // 有些环境会设置 ELECTRON_RUN_AS_NODE=1，这会导致 Electron 不按桌面程序启动。
    delete childEnv.ELECTRON_RUN_AS_NODE;

    // 启动 Electron，并让它加载 Vite dev server。
    const child = spawn(electronPath, ['.'], {
      stdio: 'inherit',
      shell: false,
      env: childEnv,
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
