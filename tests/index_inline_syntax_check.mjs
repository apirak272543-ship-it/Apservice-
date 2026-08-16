import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((code) => code.trim());
let parsed = 0;
for (const [index, code] of scripts.entries()) {
  try {
    // Parse only; do not execute browser code.
    Function(code);
    parsed += 1;
  } catch (error) {
    console.error(`Inline script ${index + 1} syntax error: ${error.message}`);
    process.exitCode = 1;
  }
}
if (process.exitCode) process.exit(1);
console.log(`Parsed ${parsed} inline scripts successfully.`);
