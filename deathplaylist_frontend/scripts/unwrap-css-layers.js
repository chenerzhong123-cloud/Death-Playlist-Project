import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const distDir = 'dist/assets';
const files = readdirSync(distDir).filter(f => f.endsWith('.css'));

for (const file of files) {
  const filePath = join(distDir, file);
  let css = readFileSync(filePath, 'utf8');

  // Remove @layer wrappers: "@layer name {" and matching "}"
  // Handles nested braces by counting depth
  let result = '';
  let i = 0;
  while (i < css.length) {
    const layerMatch = css.slice(i).match(/^@layer\s+\w+\s*\{/);
    if (layerMatch) {
      // Skip past "@layer name {"
      i += layerMatch[0].length;
      // Find matching closing brace
      let depth = 1;
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        if (depth > 0) result += css[i];
        i++;
      }
      // depth === 0 means we consumed the closing }, skip it
    } else {
      result += css[i];
      i++;
    }
  }

  writeFileSync(filePath, result);
  console.log(`Unwrapped @layer in ${file} (${css.length} → ${result.length} bytes)`);
}
