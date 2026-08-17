import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apservice-inline-'));
try {
  scripts.forEach((source, index) => {
    const file = path.join(dir, `inline-${index}.js`);
    fs.writeFileSync(file, source);
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`inline script ${index} syntax error:\n${result.stderr || result.stdout}`);
  });
  console.log(`inline script syntax: PASS (${scripts.length} scripts)`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
