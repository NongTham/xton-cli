import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = process.cwd();
const cli = join(root, 'src', 'index.ts');

async function invoke(...args: string[]) {
  return run(process.execPath, ['--import', 'tsx', cli, ...args], { cwd: root });
}

test('prints help', async () => {
  const result = await invoke('--help');
  assert.match(result.stdout, /Scaffold and manage XtonCore/);
});

test('initializes TypeScript project with current runtime contract', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'xton-cli-'));
  try {
    await invoke('init', 'bot', '--yes', '--directory', folder);
    const packageJson = JSON.parse(await readFile(join(folder, 'bot', 'package.json'), 'utf8'));
    const entry = await readFile(join(folder, 'bot', 'src', 'index.ts'), 'utf8');
    assert.equal(packageJson.dependencies.xtoncore, '^3.0.2');
    assert.match(entry, /await ClientHandler\.create/);
    assert.match(entry, /DISCORD_TOKEN/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('generates JavaScript button and job templates', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'xton-cli-'));
  try {
    await invoke('generate', 'button', 'confirm', '-J', '-d', folder);
    await invoke('generate', 'job', 'hourly', '-J', '-d', folder);
    assert.match(await readFile(join(folder, 'src', 'components', 'buttons', 'confirm.js'), 'utf8'), /module\.exports.*type: 'button'/s);
    assert.match(await readFile(join(folder, 'src', 'jobs', 'hourly.js'), 'utf8'), /cron: '0 \* \* \* \*'/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('refuses overwrite without force', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'xton-cli-'));
  try {
    const target = join(folder, 'src', 'commands', 'general', 'ping.js');
    await invoke('generate', 'command', 'ping', '-J', '-d', folder);
    await writeFile(target, 'sentinel');
    await assert.rejects(() => invoke('generate', 'command', 'ping', '-J', '-d', folder));
    await invoke('generate', 'command', 'ping', '-J', '-d', folder, '--force');
    assert.notEqual(await readFile(target, 'utf8'), 'sentinel');
  } finally { await rm(folder, { recursive: true, force: true }); }
});
