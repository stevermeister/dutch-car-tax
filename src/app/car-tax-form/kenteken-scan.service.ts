import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isValidDutchPlate } from './rdw.service';

const OCR_MIN_WIDTH = 800;
const LOG = (...a: any[]) => console.log('[KentekenScan]', ...a);

@Injectable({ providedIn: 'root' })
export class KentekenScanService {
  private _workerReady: Promise<any> | null = null;
  private _worker: any = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get isLoaded(): boolean {
    return this._worker !== null;
  }

  preload(): void {
    if (this.isBrowser && !this._workerReady) {
      LOG('preload: starting worker init');
      this._workerReady = this.createWorker();
    }
  }

  private async createWorker(): Promise<any> {
    const t0 = performance.now();
    LOG('worker: importing tesseract.js module…');
    const { createWorker } = await import('tesseract.js');
    LOG(`worker: module ready in ${(performance.now() - t0).toFixed(0)}ms — creating worker (downloads eng.traineddata ~4MB)…`);
    const t1 = performance.now();
    const worker = await createWorker('eng');
    LOG(`worker: createWorker done in ${(performance.now() - t1).toFixed(0)}ms — setting params…`);
    await worker.setParameters({
      // No whitelist: Tesseract misreads L→] and G→C; the whitelist would
      // silently drop those. extractPlateCandidates + RDW validation is the filter.
      // PSM 13 (raw line) outperforms PSM 7 on plate crops in testing.
      tessedit_pageseg_mode: '13',
    });
    this._worker = worker;
    LOG(`worker: fully ready — total ${(performance.now() - t0).toFixed(0)}ms`);
    return worker;
  }

  private getWorker(): Promise<any> {
    if (!this._workerReady) {
      this._workerReady = this.createWorker();
    }
    return this._workerReady;
  }

  async scanImage(file: File): Promise<{ candidates: string[]; confidence: number }> {
    if (!this.isBrowser) return { candidates: [], confidence: 0 };
    LOG(`scanImage: file="${file.name}" size=${(file.size / 1024).toFixed(0)}KB type=${file.type}`);

    const t0 = performance.now();
    const [processedBlob, worker] = await Promise.all([
      this.prepareImage(file),
      this.getWorker(),
    ]);
    LOG(`prepareImage + getWorker in ${(performance.now() - t0).toFixed(0)}ms — blob ${(processedBlob.size / 1024).toFixed(0)}KB`);

    LOG('OCR: recognize starting (psm13 + psm7)…');
    const t1 = performance.now();

    await worker.setParameters({ tessedit_pageseg_mode: '13' });
    const { data: { text: text13, confidence } } = await worker.recognize(processedBlob);
    LOG(`OCR psm13: done in ${(performance.now() - t1).toFixed(0)}ms  confidence=${confidence?.toFixed(1)}`);
    LOG('OCR psm13 text:', JSON.stringify(text13));

    await worker.setParameters({ tessedit_pageseg_mode: '7' });
    const { data: { text: text7 } } = await worker.recognize(processedBlob);
    LOG('OCR psm7 text:', JSON.stringify(text7));

    // Merge candidates from both passes — PSM 13 leads, PSM 7 catches plates
    // where PSM 13 produces wrong candidates (e.g. large bold fonts on close crops)
    const seen = new Set<string>();
    const candidates: string[] = [];
    for (const c of [...this.extractPlateCandidates(text13), ...this.extractPlateCandidates(text7)]) {
      if (!seen.has(c)) { seen.add(c); candidates.push(c); }
    }
    LOG('candidates:', candidates);
    return { candidates, confidence: confidence ?? 0 };
  }

  private prepareImage(file: File): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onerror = (e) => {
        LOG('prepareImage: img.onerror — using raw file', e);
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.onload = () => {
        URL.revokeObjectURL(url);
        LOG(`prepareImage: image loaded ${img.naturalWidth}×${img.naturalHeight}px`);

        // Cap input at 1500px — gallery photos from modern phones can be 12MP+,
        // which blows the mobile browser memory budget when getImageData is called.
        const MAX = 1500;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (scale < 1) LOG(`prepareImage: downscaled ×${scale.toFixed(2)} → ${canvas.width}×${canvas.height}`);

        // 1. Try HSV-based yellow crop (handles pure yellow through amber/gold)
        let plateCanvas = this.cropYellow(canvas);

        // 2. Fallback: center-vertical strip — plates rarely appear at top/bottom edge
        if (!plateCanvas) {
          plateCanvas = this.cropCenterBand(canvas);
          LOG('cropYellow failed — using center-band fallback');
        }

        // 3. Trim dealer sticker rows that appear below the plate number area
        plateCanvas = this.trimStickerRows(plateCanvas);

        const scaled = this.upscale(plateCanvas);
        LOG(`after upscale: ${scaled.width}×${scaled.height}px`);
        this.enhance(scaled);

        scaled.toBlob(b => {
          LOG(`prepareImage: final blob ${((b?.size ?? 0) / 1024).toFixed(0)}KB`);
          resolve(b ?? file);
        }, 'image/png');
      };

      img.src = url;
    });
  }

  // Finds the densest yellow cluster using a grid → connected-components approach,
  // then refines to a raw-pixel bounding box. Handles cars with scattered yellow
  // reflections or trim that would fool a simple bounding-box scan.
  private findPlateRegion(
    data: Uint8ClampedArray, width: number, height: number
  ): { left: number; top: number; width: number; height: number } | null {
    const CELL = Math.max(10, Math.floor(Math.min(width, height) / 60));
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const cells = new Int32Array(rows * cols);

    for (let i = 0; i < data.length; i += 4) {
      if (this.isYellowHsv(data[i], data[i + 1], data[i + 2])) {
        const px = (i / 4) % width;
        const py = Math.floor((i / 4) / width);
        cells[Math.floor(py / CELL) * cols + Math.floor(px / CELL)]++;
      }
    }

    const peak = Math.max(...cells);
    if (peak < CELL * CELL * 0.08) return null;
    const thr = peak * 0.25;
    const visited = new Uint8Array(rows * cols);
    let best: { minR: number; maxR: number; minC: number; maxC: number } | null = null;
    let bestScore = -1;
    const hotCount = cells.reduce((n, v) => n + (v >= thr ? 1 : 0), 0) || 1;

    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        if (cells[ri * cols + ci] < thr || visited[ri * cols + ci]) continue;
        const q: { r: number; c: number }[] = [{ r: ri, c: ci }];
        visited[ri * cols + ci] = 1;
        const comp: { r: number; c: number }[] = [];
        while (q.length) {
          const { r, c } = q.shift()!;
          comp.push({ r, c });
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                !visited[nr * cols + nc] && cells[nr * cols + nc] >= thr) {
              visited[nr * cols + nc] = 1;
              q.push({ r: nr, c: nc });
            }
          }
        }
        const minR = Math.min(...comp.map(p => p.r)), maxR = Math.max(...comp.map(p => p.r));
        const minC = Math.min(...comp.map(p => p.c)), maxC = Math.max(...comp.map(p => p.c));
        const aspect = (maxC - minC + 1) / Math.max(1, maxR - minR + 1);
        if (aspect < 1.5) continue;
        const cy = (minR + maxR) / 2 / rows;
        const score = aspect * 0.4 + cy * 0.3 + comp.length / hotCount * 0.3;
        if (score > bestScore) { bestScore = score; best = { minR, maxR, minC, maxC }; }
      }
    }
    if (!best) return null;

    // Refine to raw pixel bbox within the winning grid region
    const gL = best.minC * CELL, gT = best.minR * CELL;
    const gR = Math.min(width, (best.maxC + 1) * CELL);
    const gB = Math.min(height, (best.maxR + 1) * CELL);
    let x0 = gR, x1 = gL, y0 = gB, y1 = gT;
    for (let y = gT; y < gB; y++) {
      for (let x = gL; x < gR; x++) {
        const i = (y * width + x) * 4;
        if (this.isYellowHsv(data[i], data[i + 1], data[i + 2])) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }

    const pad = Math.max(3, Math.round((y1 - y0) * 0.15));
    return {
      left:   Math.max(0, x0 - 2),
      top:    Math.max(0, y0 - pad),
      width:  Math.min(width, x1 + pad) - Math.max(0, x0 - 2),
      height: Math.min(height, y1 + pad * 2) - Math.max(0, y0 - pad),
    };
  }

  private cropYellow(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const region = this.findPlateRegion(data, width, height);
    if (!region) {
      LOG('cropYellow: no dense yellow cluster found');
      return null;
    }
    LOG(`cropYellow: plate region ${region.width}×${region.height} at (${region.left},${region.top})`);
    const crop = document.createElement('canvas');
    crop.width = region.width;
    crop.height = region.height;
    crop.getContext('2d')!.drawImage(canvas, region.left, region.top, region.width, region.height, 0, 0, region.width, region.height);
    return crop;
  }

  // Returns true for Dutch plate yellow through gold/amber (hue 35–70°).
  // Skin tones are H ≈ 15–25°, orange ≈ 20–35°, so both are excluded.
  private isYellowHsv(r: number, g: number, b: number): boolean {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta < 25 || max < 80) return false;          // unsaturated or too dark

    let h: number;
    if (max === r)      h = 60 * ((g - b) / delta);
    else if (max === g) h = 60 * ((b - r) / delta) + 120;
    else                h = 60 * ((r - g) / delta) + 240;
    if (h < 0) h += 360;

    const s = delta / max;   // saturation 0–1
    const v = max / 255;     // value 0–1

    return h >= 35 && h <= 70 && s >= 0.28 && v >= 0.45;
  }

  // When no yellow is found, take the middle 50% of the image height.
  // In most car photos the plate occupies the horizontal center band.
  private cropCenterBand(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const y0 = Math.floor(canvas.height * 0.25);
    const h  = Math.floor(canvas.height * 0.50);
    LOG(`cropCenterBand: y=${y0} h=${h} (full width ${canvas.width})`);
    const crop = document.createElement('canvas');
    crop.width = canvas.width;
    crop.height = h;
    crop.getContext('2d')!.drawImage(canvas, 0, y0, canvas.width, h, 0, 0, canvas.width, h);
    return crop;
  }

  // Finds the last row where >15% of pixels are yellow — everything below
  // that is a dealer sticker or other noise and gets cropped off.
  private trimStickerRows(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cutRow = height;
    for (let y = height - 1; y >= Math.floor(height * 0.4); y--) {
      let yellowCount = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (this.isYellowHsv(data[i], data[i + 1], data[i + 2])) yellowCount++;
      }
      if (yellowCount / width > 0.15) { cutRow = y + 1; break; }
    }
    if (cutRow >= height) return canvas;
    LOG(`trimStickerRows: ${height} → ${cutRow}px`);
    const trimmed = document.createElement('canvas');
    trimmed.width = width;
    trimmed.height = cutRow;
    trimmed.getContext('2d')!.drawImage(canvas, 0, 0);
    return trimmed;
  }

  private upscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
    if (canvas.width >= OCR_MIN_WIDTH) {
      LOG(`upscale: skipped (${canvas.width}px >= ${OCR_MIN_WIDTH}px)`);
      return canvas;
    }
    const scale = Math.ceil(OCR_MIN_WIDTH / canvas.width);
    LOG(`upscale: ${canvas.width}×${canvas.height} → ×${scale}`);
    const out = document.createElement('canvas');
    out.width  = canvas.width  * scale;
    out.height = canvas.height * scale;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  private enhance(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const id  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d   = id.data;
    // Contrast-stretch each channel individually — keeps colour so Tesseract's
    // internal Otsu threshold works on the yellow plate background correctly.
    // Converting to greyscale here kills recognition quality on yellow plates.
    for (let i = 0; i < d.length; i += 4) {
      d[i]     = Math.max(0, Math.min(255, Math.round((d[i]     - 50) * 255 / 160)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round((d[i + 1] - 50) * 255 / 160)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round((d[i + 2] - 50) * 255 / 160)));
    }
    ctx.putImageData(id, 0, 0);
  }

  private static readonly CONFUSABLES: [string, string][] = [
    ['O','0'],['I','1'],['T','1'],['S','5'],['B','8'],['Z','2'],['G','6'],['L','1'],['C','G'],['J','I'],
  ];

  extractPlateCandidates(text: string): string[] {
    const found = new Set<string>();
    const dashPatterns: [number, number][] = [
      [2, 4], [2, 5], [1, 4], [3, 5], [1, 3],
    ];

    const tryText = (t: string) => {
      // Map symbols Tesseract commonly misreads as plate characters
      const mapped = t.replace(/\)/g, 'J').replace(/\(/g, 'C').replace(/\|/g, 'I');
      const clean = mapped.toUpperCase().replace(/[^A-Z0-9]/g, '');
      for (let i = 0; i <= clean.length - 6; i++) {
        const sub = clean.slice(i, i + 6);
        for (const [p1, p2] of dashPatterns) {
          const candidate = `${sub.slice(0, p1)}-${sub.slice(p1, p2)}-${sub.slice(p2)}`;
          if (isValidDutchPlate(candidate)) found.add(candidate);
        }
      }
    };

    tryText(text);
    for (const [a, b] of KentekenScanService.CONFUSABLES) {
      const upper = text.toUpperCase();
      if (upper.includes(a)) tryText(upper.replaceAll(a, b));
      if (upper.includes(b)) tryText(upper.replaceAll(b, a));
    }

    return [...found];
  }
}
