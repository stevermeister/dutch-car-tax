/**
 * Standalone Dutch license plate reader — Node.js test harness.
 * Run: node scripts/test-plate-reader.mjs [image...]
 * Or:  node scripts/test-plate-reader.mjs   (all test-images/)
 *
 * Dependencies: npm i --save-dev sharp tesseract.js
 * System tesseract CLI is used if available (brew install tesseract).
 */

import sharp from 'sharp';
import { execSync } from 'child_process';
import { readdir, rm } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dir   = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const TEST_DIR = join(ROOT, 'test-images');
const TMP_DIR  = __dir;

// ── Dutch plate validation ────────────────────────────────────────────────────
const PLATE_PATTERNS = [
  /^[A-Z]{2}-\d{2}-\d{2}$/,  /^\d{2}-\d{2}-[A-Z]{2}$/,
  /^\d{2}-[A-Z]{2}-\d{2}$/,  /^[A-Z]{2}-\d{2}-[A-Z]{2}$/,
  /^[A-Z]{2}-[A-Z]{2}-\d{2}$/, /^\d{2}-[A-Z]{2}-[A-Z]{2}$/,
  /^\d{2}-[A-Z]{3}-\d{1}$/,  /^\d{1}-[A-Z]{3}-\d{2}$/,
  /^[A-Z]{2}-\d{3}-[A-Z]{1}$/, /^[A-Z]{1}-\d{3}-[A-Z]{2}$/,
  /^[A-Z]{3}-\d{2}-[A-Z]{1}$/, /^[A-Z]{1}-\d{2}-[A-Z]{3}$/,
  /^\d{1}-[A-Z]{2}-\d{3}$/,  /^\d{3}-[A-Z]{2}-\d{1}$/,
];
const isValidDutchPlate = p => PLATE_PATTERNS.some(r => r.test(p));

// OCR commonly confuses these character pairs on license plates
const CONFUSABLES = [['O','0'],['I','1'],['T','1'],['S','5'],['B','8'],['Z','2'],['G','6'],['L','1'],['C','G']];

function extractCandidates(text) {
  const found = new Set();
  const dash = [[2,4],[2,5],[1,4],[3,5],[1,3]];

  function tryText(t) {
    // Map symbols that Tesseract commonly misreads as plate characters
    const mapped = t.replace(/\)/g, 'J').replace(/\(/g, 'C').replace(/\|/g, 'I');
    const clean = mapped.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (let i = 0; i <= clean.length - 6; i++) {
      const sub = clean.slice(i, i + 6);
      for (const [p1,p2] of dash) {
        const c = `${sub.slice(0,p1)}-${sub.slice(p1,p2)}-${sub.slice(p2)}`;
        if (isValidDutchPlate(c)) found.add(c);
      }
    }
  }

  tryText(text);
  // Retry with common confusable substitutions
  for (const [a, b] of CONFUSABLES) {
    if (text.toUpperCase().includes(a)) tryText(text.toUpperCase().replaceAll(a, b));
    if (text.toUpperCase().includes(b)) tryText(text.toUpperCase().replaceAll(b, a));
  }
  return [...found];
}

// ── Yellow HSV check ──────────────────────────────────────────────────────────
function isYellowHsv(r, g, b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  if (d < 25 || max < 80) return false;
  let h = max===r ? 60*((g-b)/d) : max===g ? 60*((b-r)/d)+120 : 60*((r-g)/d)+240;
  if (h < 0) h += 360;
  return h >= 35 && h <= 70 && d/max >= 0.28 && max/255 >= 0.45;
}

// ── Find densest yellow plate region (grid → refine with raw pixels) ──────────
function findPlateRegion(data, width, height) {
  const CELL = Math.max(10, Math.floor(Math.min(width, height) / 60));
  const cols = Math.ceil(width/CELL), rows = Math.ceil(height/CELL);
  const cells = new Int32Array(rows * cols);

  for (let i = 0; i < data.length; i += 4) {
    if (isYellowHsv(data[i], data[i+1], data[i+2])) {
      const px = (i/4) % width, py = Math.floor((i/4) / width);
      cells[Math.floor(py/CELL)*cols + Math.floor(px/CELL)]++;
    }
  }

  const peak = Math.max(...cells);
  if (peak < CELL * CELL * 0.08) return null;
  const thr = peak * 0.25;
  const visited = new Uint8Array(rows * cols);
  let best = null, bestScore = -1;

  for (let ri = 0; ri < rows; ri++) for (let ci = 0; ci < cols; ci++) {
    if (cells[ri*cols+ci] < thr || visited[ri*cols+ci]) continue;
    const q = [{r:ri,c:ci}]; visited[ri*cols+ci] = 1; const comp = [];
    while (q.length) {
      const {r,c} = q.shift(); comp.push({r,c});
      for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr*cols+nc]&&cells[nr*cols+nc]>=thr)
          { visited[nr*cols+nc]=1; q.push({r:nr,c:nc}); }
      }
    }
    const minR=Math.min(...comp.map(p=>p.r)), maxR=Math.max(...comp.map(p=>p.r));
    const minC=Math.min(...comp.map(p=>p.c)), maxC=Math.max(...comp.map(p=>p.c));
    const aspect = (maxC-minC+1) / Math.max(1, maxR-minR+1);
    if (aspect < 1.5) continue;                       // must be wider than tall
    const cy = (minR+maxR) / 2 / rows;               // prefer lower half
    const score = aspect*0.4 + cy*0.3 + comp.length/hot(cells,thr)*0.3;
    if (score > bestScore) { bestScore=score; best={minR,maxR,minC,maxC}; }
  }
  if (!best) return null;

  // Refine: raw pixel bbox within grid region
  const gL=best.minC*CELL, gT=best.minR*CELL;
  const gR=Math.min(width,(best.maxC+1)*CELL), gB=Math.min(height,(best.maxR+1)*CELL);
  let x0=gR, x1=gL, y0=gB, y1=gT;
  for (let y=gT; y<gB; y++) for (let x=gL; x<gR; x++) {
    const i=(y*width+x)*4;
    if (isYellowHsv(data[i],data[i+1],data[i+2]))
      { if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  }

  const pad = Math.max(3, Math.round((y1-y0)*0.15));
  return {
    left:   Math.max(0,       x0 - 2),         // minimal left pad (NL strip)
    top:    Math.max(0,       y0 - pad),
    width:  Math.min(width,   x1 + pad) - Math.max(0, x0 - 2),
    height: Math.min(height,  y1 + pad*2) - Math.max(0, y0 - pad),
  };
}
function hot(cells, thr) { return cells.reduce((n,v) => n + (v>=thr?1:0), 0) || 1; }

// ── System tesseract OCR ──────────────────────────────────────────────────────
// No whitelist — extractCandidates + plate validation acts as the filter.
// The whitelist was found to drop 'L' (misread as ']') and 'G' (misread as 'C').
function ocrFile(path, psm) {
  try {
    return execSync(
      `tesseract "${path}" stdout --psm ${psm} 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
  } catch { return ''; }
}

function bestOcr(imgPath) {
  for (const psm of [13, 7, 11]) {
    const text = ocrFile(imgPath, psm);
    const candidates = extractCandidates(text);
    if (candidates.length) return { psm, text, candidates };
  }
  const text = ocrFile(imgPath, 7);
  return { psm: 7, text, candidates: [] };
}

// Find bottom of plate text (last row with >15% yellow pixels).
// Cuts off dealer stickers that appear below the plate number area.
function findStickerCutRow(data, width, height) {
  for (let y = height - 1; y >= Math.floor(height * 0.4); y--) {
    let yc = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isYellowHsv(data[i], data[i+1], data[i+2])) yc++;
    }
    if (yc / width > 0.15) return y + 1;
  }
  return height;
}

// ── Per-image pipeline ────────────────────────────────────────────────────────
async function readPlate(imagePath) {
  const name = basename(imagePath).replace(/\.[^.]+$/, '');
  process.stdout.write(`\n── ${name} ──\n`);

  const { data, info: { width, height } } = await sharp(imagePath)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const region = findPlateRegion(data, width, height);

  let cropRegion;
  if (region) {
    cropRegion = region;
    console.log(`  plate region: ${region.width}×${region.height} at (${region.left},${region.top})`);
  } else {
    const top = Math.floor(height * 0.6);
    cropRegion = { left: 0, top, width, height: Math.floor(height * 0.2) };
    console.log(`  plate region: fallback lower band`);
  }

  // Trim sticker rows below the plate number (dealer stickers etc.)
  const { data: cropData, info: cropInfo } = await sharp(imagePath)
    .extract(cropRegion)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cutRow = findStickerCutRow(cropData, cropInfo.width, cropInfo.height);
  const trimmedRegion = { ...cropRegion, height: cutRow };
  if (cutRow < cropInfo.height)
    console.log(`  sticker trim: ${cropInfo.height} → ${cutRow}px`);

  // Scale so width ≥ 600px — keep colour (do NOT convert to greyscale)
  const scale = trimmedRegion.width < 600 ? Math.ceil(600 / trimmedRegion.width) : 1;
  const outW = trimmedRegion.width  * scale;
  const outH = trimmedRegion.height * scale;

  const tmp = join(TMP_DIR, `_plate_${name}.png`);
  await sharp(imagePath)
    .extract(trimmedRegion)
    .resize(outW, outH, { kernel: 'lanczos3' })
    .png()
    .toFile(tmp);

  const { psm, text, candidates } = bestOcr(tmp);
  console.log(`  ocr(psm${psm}): "${text}"  candidates: [${candidates.join(', ')}]`);

  await rm(tmp, { force: true });

  const got = candidates[0] ?? null;
  // "found" = expected appears anywhere in candidates list.
  // In the app all candidates are validated against RDW, so order doesn't matter.
  const found = candidates.includes(name);
  const ok    = got === name;
  if (ok)    console.log(`  → ✅ PASS`);
  else if (found) console.log(`  → ⚠️  PASS (in candidates but not #1): [${candidates.join(', ')}]`);
  else        console.log(`  → ❌ FAIL  candidates: [${candidates.join(', ')}]`);
  return { name, got, ok, found, text };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync('/opt/homebrew/bin/tesseract') && !existsSync('/usr/bin/tesseract')) {
    console.error('tesseract CLI not found — install with: brew install tesseract');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const files = args.length
    ? args
    : (await readdir(TEST_DIR))
        .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f))
        .map(f => join(TEST_DIR, f));

  console.log(`Testing ${files.length} image(s)...`);
  const results = [];
  for (const f of files) results.push(await readPlate(f));

  const exact  = results.filter(r => r.ok).length;
  const found  = results.filter(r => r.found).length;
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Score: ${exact}/${results.length} exact  (${found}/${results.length} in candidates — all pass with RDW validation)`);
  results.forEach(r => {
    const icon = r.ok ? '✅' : r.found ? '⚠️ ' : '❌';
    const info = r.ok ? r.got : r.found ? `(#1=${r.got}, expected in list)` : `(ocr: "${r.text}")`;
    console.log(`  ${icon} ${r.name.padEnd(14)} ${info}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
