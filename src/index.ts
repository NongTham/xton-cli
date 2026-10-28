#!/usr/bin/env node
import { Command } from 'commander';
import prompts from 'prompts';
import { mkdir, readdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { exists, writeText } from './fs.js';
import { commandTemplate, moduleTemplate, projectEntry, type Language } from './templates.js';

const VERSION = '4.0.0';
const TYPES = ['command', 'event', 'validation', 'button', 'modal', 'selectmenu', 'job', 'locale'] as const;
type GeneratorType = typeof TYPES[number];
type Options = { typescript?: boolean; javascript?: boolean; yes?: boolean; force?: boolean; directory?: string; category?: string };

function languageFrom(options: Options): Language {
  if (options.javascript && options.typescript) throw new Error('Choose either --javascript or --typescript');
  return options.javascript ? 'javascript' : 'typescript';
}

function safeName(value: string): string {
  const name = basename(value).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
  if (!name) throw new Error('Name must contain letters, numbers, hyphens, or underscores');
  return name;
}

async function isNonEmptyDirectory(path: string): Promise<boolean> {
  if (!(await exists(path))) return false;
  return (await readdir(path)).length > 0;
}

async function initProject(projectName = 'my-xton-bot', options: Options): Promise<void> {
  const language = options.yes ? languageFrom(options) : ((await prompts({
    type: 'select', name: 'language', message: 'Project language?', choices: [
      { title: 'TypeScript', value: 'typescript' }, { title: 'JavaScript', value: 'javascript' }
    ], initial: options.javascript ? 1 : 0
  })).language as Language || languageFrom(options));
  const root = resolve(options.directory || '.', safeName(projectName));
  if (await isNonEmptyDirectory(root) && !options.force) throw new Error(`${root} is not empty; use --force to continue`);
  const ext = language === 'typescript' ? 'ts' : 'js';
  const directories = [
    'src/commands', 'src/events', 'src/validations', 'src/components/buttons',
    'src/components/modals', 'src/components/selectmenus', 'src/jobs', 'src/locales'
  ];
  await Promise.all(directories.map((directory) => writeText(join(root, directory, '.gitkeep'), '')));
  await writeText(join(root, 'src', `index.${ext}`), projectEntry(language));
  await writeText(join(root, 'src', 'commands', `ping.${ext}`), commandTemplate(language, 'ping'));
  await writeText(join(root, 'src', 'events', `ready.${ext}`), moduleTemplate(language, 'event', 'ready'));
  await writeText(join(root, 'src', 'locales', 'en-US.json'), moduleTemplate(language, 'locale', 'en-US'));
  const packageJson = {
    name: safeName(projectName), private: true,
    scripts: { start: language === 'typescript' ? 'tsx src/index.ts' : 'node src/index.js', build: language === 'typescript' ? 'tsc' : 'node --check src/index.js' },
    dependencies: { 'discord.js': '^14.16.3', xtoncore: '^3.0.2' },
    devDependencies: language === 'typescript' ? { '@types/node': '^22.0.0', tsx: '^4.19.0', typescript: '^5.7.0' } : {}
  };
  await writeText(join(root, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  if (language === 'typescript') {
    await writeText(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, esModuleInterop: true, skipLibCheck: true, outDir: 'dist' }, include: ['src/**/*.ts'] }, null, 2) + '\n');
  }
  await writeText(join(root, '.env.example'), 'DISCORD_TOKEN=your-bot-token\nOWNER_ID=your-user-id\n');
  await writeText(join(root, 'README.md'), `# ${safeName(projectName)}\n\nDiscord bot powered by XtonCore.\n\nCopy .env.example to .env and set DISCORD_TOKEN before starting.\n`);
  console.log(`Created ${root}`);
}

async function generate(kind: string, name = 'example', options: Options): Promise<void> {
  if (!TYPES.includes(kind as GeneratorType)) throw new Error(`Unknown generator type "${kind}". Choose: ${TYPES.join(', ')}`);
  const language = languageFrom(options);
  const safe = safeName(name);
  const ext = kind === 'locale' ? 'json' : language === 'typescript' ? 'ts' : 'js';
  const base = resolve(options.directory || '.');
  const folder = kind === 'command' ? join(base, 'src', 'commands', options.category || 'general')
    : kind === 'button' || kind === 'modal' || kind === 'selectmenu' ? join(base, 'src', 'components', kind === 'selectmenu' ? 'selectmenus' : `${kind}s`)
    : join(base, 'src', `${kind}s`);
  const path = join(folder, `${safe}.${ext}`);
  if (await exists(path) && !options.force) throw new Error(`${path} already exists; use --force to overwrite`);
  await writeText(path, moduleTemplate(language, kind, safe));
  console.log(`Created ${path}`);
}

const program = new Command();
program.name('xton').description('Scaffold and manage XtonCore Discord.js projects').version(VERSION);
program.command('init [projectName]').option('-T, --typescript').option('-J, --javascript').option('-y, --yes').option('-d, --directory <path>').option('-f, --force').action(initProject);
program.command('generate').alias('gen').argument('<kind>').argument('[name]').option('-T, --typescript').option('-J, --javascript').option('-d, --directory <path>').option('-f, --force').option('-c, --category <category>').action(generate);
program.parseAsync().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
