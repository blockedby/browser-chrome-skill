import { mkdtemp, mkdir, writeFile, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'browser chrome test '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

export async function executable(file, content) {
  await writeFile(file, content);
  await chmod(file, 0o755);
  return file;
}

export async function fakeNpm(base) {
  const file = path.join(base, 'npm fixture');
  return executable(
    file,
    `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
if (process.argv.slice(2).join(' ') !== 'ci --no-audit --no-fund') process.exit(90);
if (!fs.existsSync('package-lock.json')) process.exit(91);
const manifest = JSON.parse(fs.readFileSync('package.json'));
const dir = path.join('node_modules', 'chrome-devtools-mcp');
fs.mkdirSync(dir, {recursive:true});
fs.writeFileSync(path.join(dir,'package.json'), JSON.stringify({version:manifest.dependencies['chrome-devtools-mcp'],type:'module',bin:{'chrome-devtools-mcp':'./cli.mjs'}}));
fs.writeFileSync(path.join(dir,'cli.mjs'), ${JSON.stringify(fixtureMcp)});
`,
  );
}

export async function installFixtureRuntime(root, version = '1.8.0') {
  const dir = path.join(root, 'runtime/node_modules/chrome-devtools-mcp');
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ version, type: 'module', bin: { 'chrome-devtools-mcp': './cli.mjs' } }),
  );
  await writeFile(path.join(dir, 'cli.mjs'), fixtureMcp);
}

const fixtureMcp = `
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';
if (process.argv.includes('--version')) { console.log('1.8.0'); process.exit(0); }
if (process.env.FIXTURE_EXIT) process.exit(Number(process.env.FIXTURE_EXIT));
if (process.env.FIXTURE_STATE) writeFileSync(process.env.FIXTURE_STATE, JSON.stringify({cwd:process.cwd(),pid:process.pid,args:process.argv.slice(2)}));
const lines = createInterface({input:process.stdin});
lines.on('line', line => {
 const r=JSON.parse(line);
 if(r.method==='initialize') console.log(JSON.stringify({jsonrpc:'2.0',id:r.id,result:{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}}));
 if(r.method==='tools/list') console.log(JSON.stringify({jsonrpc:'2.0',id:r.id,result:{tools:[{name:'fixture_tool',description:'fixture',inputSchema:{type:'object'}}]}}));
});
`;
