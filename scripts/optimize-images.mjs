// One-off image optimizer: converts PNGs to WebP and caps oversized dimensions.
// Run with: node scripts/optimize-images.mjs
import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Max display widths — nothing on the site renders wider than these, so
// there's no reason to ship 2500px source files.
const targets = [
  { dir: 'public/Graphics', maxWidth: 1600, quality: 78 }, // full-bleed section art (incl. footer)
  { dir: 'public/Graphics/Artists', maxWidth: 900, quality: 80 }, // portraits
  { dir: 'src/assets/images', maxWidth: 1200, quality: 80 }, // gallery/artwork
  { dir: 'public', maxWidth: 512, quality: 80 }, // root-level logos / favicon
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isFile() && extname(e.name).toLowerCase() === '.png') {
      files.push(join(dir, e.name));
    }
  }
  return files;
}

let totalBefore = 0;
let totalAfter = 0;

for (const { dir, maxWidth, quality } of targets) {
  const abs = join(root, dir);
  let files;
  try {
    files = await walk(abs);
  } catch {
    continue;
  }
  for (const file of files) {
    const before = (await stat(file)).size;
    const out = join(dirname(file), basename(file, '.png') + '.webp');
    const img = sharp(file);
    const meta = await img.metadata();
    const pipeline = img.clone();
    if (meta.width && meta.width > maxWidth) {
      pipeline.resize({ width: maxWidth });
    }
    await pipeline.webp({ quality, effort: 6 }).toFile(out);
    const after = (await stat(out)).size;
    totalBefore += before;
    totalAfter += after;
    const rel = file.replace(root + '\\', '').replace(root + '/', '');
    console.log(
      `${rel}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (${Math.round((1 - after / before) * 100)}% smaller)`,
    );
  }
}

console.log(
  `\nTOTAL: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`,
);
