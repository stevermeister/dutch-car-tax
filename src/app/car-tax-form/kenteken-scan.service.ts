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
    const mod = await import('tesseract.js') as any;
    LOG(`worker: module ready in ${(performance.now() - t0).toFixed(0)}ms — creating worker (downloads eng.traineddata ~4MB)…`);
    const t1 = performance.now();
    const worker = await mod.createWorker('eng');
    LOG(`worker: createWorker done in ${(performance.now() - t1).toFixed(0)}ms — setting params…`);
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ-',
      tessedit_pageseg_mode: mod.PSM.SINGLE_LINE,
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

  async scanImage(file: File): Promise<string[]> {
    if (!this.isBrowser) return [];
    LOG(`scanImage: file="${file.name}" size=${(file.size / 1024).toFixed(0)}KB type=${file.type}`);

    const t0 = performance.now();
    const [processedBlob, worker] = await Promise.all([
      this.prepareImage(file),
      this.getWorker(),
    ]);
    LOG(`prepareImage + getWorker in ${(performance.now() - t0).toFixed(0)}ms — blob ${(processedBlob.size / 1024).toFixed(0)}KB`);

    LOG('OCR: recognize starting…');
    const t1 = performance.now();
    const { data: { text, confidence } } = await worker.recognize(processedBlob);
    LOG(`OCR: done in ${(performance.now() - t1).toFixed(0)}ms  confidence=${confidence?.toFixed(1)}`);
    LOG('OCR raw text:', JSON.stringify(text));

    const candidates = this.extractPlateCandidates(text);
    LOG('candidates:', candidates);
    return candidates;
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

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);

        // 1. Try HSV-based yellow crop (handles pure yellow through amber/gold)
        let plateCanvas = this.cropYellow(canvas);

        // 2. Fallback: center-vertical strip — plates rarely appear at top/bottom edge
        if (!plateCanvas) {
          plateCanvas = this.cropCenterBand(canvas);
          LOG('cropYellow failed — using center-band fallback');
        }

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

  // HSV yellow detection: robust across pure yellow (RAL1016) and gold/amber
  // plates lit under various conditions. Hue 35–70° covers both without
  // picking up skin tones (H ≈ 15–25°), orange (H ≈ 20–35°), or white/grey.
  private cropYellow(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, maxX = 0, minY = height, maxY = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (this.isYellowHsv(r, g, b)) {
        const px = (i / 4) % width;
        const py = Math.floor((i / 4) / width);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        count++;
      }
    }

    const w = maxX - minX;
    const h = maxY - minY;
    LOG(`cropYellow: yellowPixels=${count}  bbox=${w}×${h}  (minX=${minX} minY=${minY})`);

    if (count < 50 || w < 20 || h < 4 || w < h) {
      LOG(`cropYellow: rejected (count<50=${count < 50} w<20=${w < 20} h<4=${h < 4} w<h=${w < h})`);
      return null;
    }

    const pad = Math.max(4, Math.round(h * 0.3));
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(width - cx, w + pad * 2);
    const ch = Math.min(height - cy, h + pad * 2);
    LOG(`cropYellow: cropping to ${cw}×${ch} at (${cx},${cy}) pad=${pad}`);

    const crop = document.createElement('canvas');
    crop.width = cw;
    crop.height = ch;
    crop.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
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
    // Contrast-stretch grayscale [50, 210] → [0, 255].
    // Soft stretch preserves edge detail and avoids the polarity inversion
    // caused by hard binarization on the NL indicator strip.
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, Math.round((gray - 50) * 255 / 160)));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(id, 0, 0);
  }

  extractPlateCandidates(text: string): string[] {
    const found = new Set<string>();
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const dashPatterns: [number, number][] = [
      [2, 4], // 2-2-2
      [2, 5], // 2-3-1
      [1, 4], // 1-3-2
      [3, 5], // 3-2-1
      [1, 3], // 1-2-3
    ];

    for (let i = 0; i <= clean.length - 6; i++) {
      const sub = clean.slice(i, i + 6);
      for (const [p1, p2] of dashPatterns) {
        const candidate = `${sub.slice(0, p1)}-${sub.slice(p1, p2)}-${sub.slice(p2)}`;
        if (isValidDutchPlate(candidate)) found.add(candidate);
      }
    }

    return [...found];
  }
}
