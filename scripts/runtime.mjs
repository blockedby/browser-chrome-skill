import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Resolve from the installed skill, never from the caller's project or npm cache.
const runtime = new URL('../runtime/', import.meta.url);

try {
  const manifest = JSON.parse(await readFile(new URL('package.json', runtime), 'utf8'));
  const packageRoot = new URL('node_modules/chrome-devtools-mcp/', runtime);
  const installed = JSON.parse(await readFile(new URL('package.json', packageRoot), 'utf8'));
  if (installed.version !== manifest.dependencies['chrome-devtools-mcp']) {
    throw new Error('Installed MCP version differs from the runtime manifest');
  }
  const entry = new URL(installed.bin['chrome-devtools-mcp'], packageRoot);
  await access(entry);
  if (process.argv[2] !== '--check') {
    process.argv[1] = fileURLToPath(entry);
    await import(entry.href);
  }
} catch (error) {
  console.error(`browser-chrome: ${error.message}`);
  console.error(`Repair the runtime with: bash "${fileURLToPath(new URL('install-runtime.sh', import.meta.url))}"`);
  process.exitCode = 1;
}
