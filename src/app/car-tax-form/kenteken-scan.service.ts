import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isValidDutchPlate } from './rdw.service';

@Injectable({ providedIn: 'root' })
export class KentekenScanService {
  private _mod: any = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get isLoaded(): boolean {
    return this._mod !== null;
  }

  preload(): void {
    if (this.isBrowser && !this._mod) {
      import('tesseract.js').then(m => { this._mod = m; }).catch(() => {});
    }
  }

  async scanImage(file: File): Promise<string[]> {
    if (!this.isBrowser) return [];

    const croppedBlob = await this.cropYellowRegion(file);

    if (!this._mod) {
      this._mod = await import('tesseract.js');
    }

    const { createWorker, PSM } = this._mod;
    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ',
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });

    try {
      const { data: { text } } = await worker.recognize(croppedBlob);
      return this.extractPlateCandidates(text);
    } finally {
      await worker.terminate();
    }
  }

  private cropYellowRegion(file: File): Promise<Blob> {
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

        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = width, maxX = 0, minY = height, maxY = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Dutch plate yellow: high R+G, low B
          if (r > 200 && g > 160 && b < 80 && r > b + 120 && g > b + 100) {
            const px = (i / 4) % width;
            const py = Math.floor((i / 4) / width);
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
            count++;
          }
        }

        const yellowW = maxX - minX;
        const yellowH = maxY - minY;
        if (count < 500 || yellowW < 60 || yellowH < 10) {
          canvas.toBlob(b => resolve(b ?? file), 'image/jpeg', 0.92);
          return;
        }

        const pad = 30;
        const cx = Math.max(0, minX - pad);
        const cy = Math.max(0, minY - pad);
        const cw = Math.min(width - cx, yellowW + pad * 2);
        const ch = Math.min(height - cy, yellowH + pad * 2);

        const crop = document.createElement('canvas');
        crop.width = cw;
        crop.height = ch;
        crop.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        crop.toBlob(b => resolve(b ?? file), 'image/jpeg', 0.92);
      };

      img.src = url;
    });
  }

  extractPlateCandidates(text: string): string[] {
    const found = new Set<string>();
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // All Dutch plates are 6 alphanumeric chars; valid dash groupings by char position
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
        if (isValidDutchPlate(candidate)) {
          found.add(candidate);
        }
      }
    }

    return [...found];
  }
}
