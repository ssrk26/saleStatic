import { spawn } from 'child_process';

const serverProc = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '4000' }
});

const clientProc = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
  env: process.env
});

function cleanup() {
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
