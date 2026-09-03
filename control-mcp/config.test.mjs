import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import test from 'node:test';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, env) {
  return new Promise((resolve) => {
    execFile(command, args, { env: { ...process.env, ...env }, cwd: skillRoot }, (error, stdout, stderr) => {
      resolve({ code: error?.code ?? 0, stdout, stderr });
    });
  });
}

test('example MCP config preserves existing servers and adds browser-chrome-control', async () => {
  const config = JSON.parse(await readFile(path.join(skillRoot, 'mcp', 'browser-chrome.mcp.json'), 'utf8'));
  assert.deepEqual(Object.keys(config.mcpServers).sort(), [
    'browser-chrome-control',
    'browser-chrome-headed',
    'browser-chrome-headless',
  ]);
  assert.match(config.mcpServers['browser-chrome-control'].command, /browser-chrome-control-mcp|control-mcp\.sh/);
  assert.deepEqual(config.mcpServers['browser-chrome-control'].args, []);
  assert.equal(config.mcpServers['browser-chrome-headed'].args[0], 'headed');
  assert.equal(config.mcpServers['browser-chrome-headless'].args[0], 'headless');
});

test('install-local preserves existing servers and writes all local entries', async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'browser-chrome-install-test-'));
  const target = path.join(base, 'skill-target');
  const mcpJson = path.join(base, 'mcp.json');
  const existing = {
    mcpServers: { 'existing-server': { command: 'keep-me', args: ['--unchanged'] } },
    metadata: { preserved: true },
  };
  await writeFile(mcpJson, `${JSON.stringify(existing)}\n`);
  const result = await run('bash', ['scripts/install-local.sh'], {
    PI_AGENT_DIR: path.join(base, 'pi-agent'),
    BROWSER_CHROME_SKILL_TARGET: target,
    BROWSER_CHROME_MCP_JSON: mcpJson,
  });
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  const generated = JSON.parse(await readFile(mcpJson, 'utf8'));
  assert.deepEqual(generated.mcpServers['existing-server'], existing.mcpServers['existing-server']);
  assert.deepEqual(generated.metadata, existing.metadata);
  assert.deepEqual(JSON.parse(await readFile(`${mcpJson}.bak`, 'utf8')), existing);
  assert.ok(generated.mcpServers['browser-chrome-control']);
  assert.ok(generated.mcpServers['browser-chrome-headed']);
  assert.ok(generated.mcpServers['browser-chrome-headless']);
  assert.match(generated.mcpServers['browser-chrome-control'].command, /control-mcp\.sh$/);
  assert.match(generated.mcpServers['browser-chrome-headed'].command, /mcp\.sh$/);
  assert.match(generated.mcpServers['browser-chrome-headless'].command, /mcp\.sh$/);
  await access(path.join(target, 'control-mcp', 'server.mjs'), constants.R_OK);
  await access(path.join(target, 'scripts', 'control-mcp.sh'), constants.X_OK);
});
