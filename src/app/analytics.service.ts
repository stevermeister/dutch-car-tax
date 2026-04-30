import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare function gtag(...args: unknown[]): void;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  pageView(url: string): void {
    if (!this.isBrowser || typeof gtag === 'undefined') return;
    gtag('event', 'page_view', { page_location: url });
  }

  event(name: string, params?: Record<string, unknown>): void {
    if (!this.isBrowser || typeof gtag === 'undefined') return;
    gtag('event', name, params ?? {});
  }
}
