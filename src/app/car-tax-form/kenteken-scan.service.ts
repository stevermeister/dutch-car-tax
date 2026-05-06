import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isValidDutchPlate } from './rdw.service';

const OCR_MIN_WIDTH = 500; // upscale if narrower — minimum for reliable Tesseract output

@Injectable({ providedIn: 'root' })
export class KentekenScanService {
  // Worker is created once and kept alive; re-creating it re-downloads eng.traineddata (~4MB)
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
      this._workerReady = this.createWorker();
    }
  }

  private async createWorker(): Promise<any> {
    const mod = await import('tesseract.js') as any;
    const worker = await mod.createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ-',
      tessedit_pageseg_mode: mod.PSM.SINGLE_LINE,
    });
    this._worker = worker;
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

    // Prepare image and initialize worker in parallel — they're independent
    const [processedBlob, worker] = await Promise.all([
      this.prepareImage(file),
      this.getWorker(),
    ]);

    const { data: { text } } = await worker.recognize(processedBlob);
    return this.extractPlateCandidates(text);
  }

  private prepareImage(file: File): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Crop to yellow region; fall back to full image if not found
        const plateCanvas = this.cropYellow(canvas) ?? canvas;
        // Scale up so characters are tall enough for Tesseract (~30px minimum)
        const scaled = this.upscale(plateCanvas);
        // Convert to high-contrast grayscale: yellow bg → white, dark text → black
        this.enhance(scaled);

        scaled.toBlob(b => resolve(b ?? file), 'image/png');
      };

      img.src = url;
    });
  }

  private cropYellow(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, maxX = 0, minY = height, maxY = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Dutch plate yellow (tolerant — JPEG compression shifts values)
      if (r > 180 && g > 140 && b < 80 && r > b + 100 && g > b + 80) {
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
    // Require a plausible plate-shaped region (wider than tall, at least some pixels)
    if (count < 50 || w < 20 || h < 4 || w < h) return null;

    const pad = Math.max(4, Math.round(h * 0.3));
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(width - cx, w + pad * 2);
    const ch = Math.min(height - cy, h + pad * 2);

    const crop = document.createElement('canvas');
    crop.width = cw;
    crop.height = ch;
    crop.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return crop;
  }

  private upscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
    if (canvas.width >= OCR_MIN_WIDTH) return canvas;
    const scale = Math.ceil(OCR_MIN_WIDTH / canvas.width);
    const out = document.createElement('canvas');
    out.width = canvas.width * scale;
    out.height = canvas.height * scale;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  private enhance(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = id.data;
    // Grayscale + threshold: yellow plate bg → white, dark blue text → black
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = gray > 128 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(id, 0, 0);
  }

  extractPlateCandidates(text: string): string[] {
    const found = new Set<string>();
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const dashPatterns: [number, number][] = [
      [2, 4], // 2-2-2  (sidecodes 1–6)
      [2, 5], // 2-3-1  (sidecodes 7, 9)
      [1, 4], // 1-3-2  (sidecodes 8, 10)
      [3, 5], // 3-2-1  (sidecodes 11, 13)
      [1, 3], // 1-2-3  (sidecode 12, 14)
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
