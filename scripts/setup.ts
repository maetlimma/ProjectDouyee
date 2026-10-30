import { resolve } from 'node:path';
import { migrate } from './migrate';

const projectRoot = resolve(import.meta.dir, '..');
const docker = Bun.spawn(['docker', 'compose', 'up', '-d', '--wait'], {
  cwd: projectRoot,
  stdout: 'inherit',
  stderr: 'inherit'
});
const dockerExit = await docker.exited;
if (dockerExit !== 0) process.exit(dockerExit);

await migrate('up');
