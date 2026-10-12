import { spawn } from 'bun';

console.log('----------------------------------------------------');
console.log('Starting Dou Yee Clone Catalog Engine...');
console.log('----------------------------------------------------');

// Start backend process
const backendProcess = spawn(['bun', 'run', 'src/index.ts'], {
  cwd: './backend',
  stdout: 'inherit',
  stderr: 'inherit'
});

// Start frontend process
const frontendProcess = spawn(['bun', 'run', 'dev'], {
  cwd: './frontend',
  stdout: 'inherit',
  stderr: 'inherit'
});

console.log('\nServices initiated successfully!');
console.log('- ElysiaJS Backend: http://localhost:3001');
console.log('- Vite React Frontend: http://localhost:5173');
console.log('OTP verification codes will be logged to this console log on admin login.\n');

// Clean up processes on exit
process.on('SIGINT', () => {
  console.log('\nShutting down services...');
  backendProcess.kill();
  frontendProcess.kill();
  process.exit(0);
});
