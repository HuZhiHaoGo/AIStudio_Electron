const fs = require('node:fs/promises');
const path = require('node:path');

const releaseDir = path.resolve(__dirname, '..', 'release');
const targets = ['win-unpacked', 'win-unpacked.tmp'];

// 删除旧的绿色版打包目录，避免上一次构建残留文件影响本次打包结果。
async function removeTarget(name) {
  const target = path.join(releaseDir, name);

  try {
    await fs.rm(target, { recursive: true, force: true });
    console.log(`Cleaned ${path.relative(process.cwd(), target)}`);
  } catch (error) {
    console.error(`Failed to clean ${target}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

Promise.all(targets.map(removeTarget)).catch((error) => {
  console.error(error);
  process.exit(1);
});
