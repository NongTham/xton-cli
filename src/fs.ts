import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

export async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export function displayPath(path: string, root: string): string {
  return relative(root, path) || '.';
}
