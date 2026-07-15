const { spawn } = require('node:child_process');

const electronPath = require('electron');
const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [...process.argv.slice(2), '.'], {
  stdio: 'inherit',
  shell: false,
  env: childEnv,
});

child.once('error', (error) => {
  console.error(`Electron 启动失败：${error.message}`);
  process.exitCode = 1;
});

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
