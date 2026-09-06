import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { executable, tempDir, installFixtureRuntime } from './helpers.mjs';
const exec = promisify(execFile);
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function fixture(t) {
  const base = await tempDir(t);
  const root = path.join(base, 'installed skill');
  await mkdir(root);
  await cp(path.join(source, 'scripts'), path.join(root, 'scripts'), { recursive: true });
  await mkdir(path.join(root, 'runtime'));
  await cp(path.join(source, 'runtime/package.json'), path.join(root, 'runtime/package.json'));
  await installFixtureRuntime(root);
  const opened = path.join(base, 'opened');
  const closed = path.join(base, 'closed');
  await executable(path.join(root, 'scripts/open-headless.sh'), '#!/bin/bash\nprintf opened > "$OPENED"\nprintf "OPEN id=fixture url=http://127.0.0.1:9999\\n"\n');
  await executable(path.join(root, 'scripts/open-headed.sh'), '#!/bin/bash\nprintf opened > "$OPENED"\n');
  await executable(path.join(root, 'scripts/close-headless.sh'), '#!/bin/bash\nprintf "%s" "$1" > "$CLOSED"\n');
  const env = { ...process.env, BROWSER_CHROME_NODE: process.execPath, OPENED: opened, CLOSED: closed, FIXTURE_STATE: path.join(base, 'state.json') };
  return { base, root, opened, closed, env, wrapper: path.join(root, 'scripts/mcp.sh') };
}

async function handshake(child) {
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  const lines = createInterface({ input: child.stdout });
  const replies = [];
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`MCP timeout: ${stderr}`)), 5000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`MCP exited ${code}: ${stderr}`)); });
    lines.on('line', line => {
      try {
        const reply = JSON.parse(line);
        replies.push(reply);
        if (reply.id === 1) {
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
        }
        if (reply.id === 2) { clearTimeout(timer); resolve(replies); }
      } catch (error) { clearTimeout(timer); reject(error); }
    });
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }) + '\n');
  return done;
}

for (const mode of ['headed-connect', 'headed', 'headless']) {
  test(`${mode} preserves cwd and completes stdio MCP without npm`, { timeout: 10000 }, async t => {
    const f = await fixture(t);
    const cwd = path.join(f.base, 'project with spaces');
    await mkdir(cwd);
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { broken: '^1.0.0' }, overrides: { broken: '1.0.0' } }));
    const bin = path.join(f.base, 'bin');
    await mkdir(bin);
    for (const name of ['npm', 'npx']) await executable(path.join(bin, name), '#!/bin/bash\nexit 99\n');
    const child = spawn('bash', [f.wrapper, mode], { cwd, env: { ...f.env, PATH: `${bin}:${process.env.PATH}` } });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    const exited = once(child, 'exit');
    const replies = await handshake(child);
    assert.ok(replies[0].result.capabilities.tools);
    assert.equal(replies[1].result.tools.length, 1);
    const state = JSON.parse(await readFile(f.env.FIXTURE_STATE, 'utf8'));
    assert.equal(state.cwd, cwd);
    assert.ok(state.args.some(arg => arg.startsWith('--browser-url=')));
    child.stdin.end();
    assert.equal((await exited)[0], 0);
    if (mode === 'headed-connect') await assert.rejects(access(f.opened));
    else await access(f.opened);
    if (mode === 'headless') assert.equal(await readFile(f.closed, 'utf8'), 'fixture');
  });
}

test('missing runtime fails before opening Chrome', async t => {
  const f = await fixture(t);
  await rm(path.join(f.root, 'runtime/node_modules'), { recursive: true });
  await assert.rejects(exec('bash', [f.wrapper, 'headless'], { env: f.env }), error => error.code === 1 && error.stdout === '');
  await assert.rejects(access(f.opened));
});

test('wrong runtime version fails before opening Chrome', async t => {
  const f = await fixture(t);
  await installFixtureRuntime(f.root, '0.0.0');
  await assert.rejects(exec('bash', [f.wrapper, 'headless'], { env: f.env }), error => error.code === 1);
  await assert.rejects(access(f.opened));
});

test('server failure preserves exit status and cleans up headless', async t => {
  const f = await fixture(t);
  await assert.rejects(exec('bash', [f.wrapper, 'headless'], { env: { ...f.env, FIXTURE_EXIT: '42' } }), error => error.code === 42);
  assert.equal(await readFile(f.closed, 'utf8'), 'fixture');
});

test('SIGTERM to wrapper stops its server and cleans up headless', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  const child = spawn('bash', [f.wrapper, 'headless'], { env: f.env });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  const exited = once(child, 'exit');
  await handshake(child);
  const state = JSON.parse(await readFile(f.env.FIXTURE_STATE, 'utf8'));
  child.kill('SIGTERM');
  assert.equal((await exited)[0], 143);
  assert.equal(await readFile(f.closed, 'utf8'), 'fixture');
  assert.throws(() => process.kill(state.pid, 0), { code: 'ESRCH' });
});
