import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const processes = [
  spawn(process.execPath, ['server/index.mjs'], { cwd: projectRoot, stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: projectRoot, stdio: 'inherit' }),
];

const stop = () => {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
process.once('exit', stop);