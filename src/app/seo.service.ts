import { Injectable, Inject, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Lang, TRANSLATIONS, BASE_URL } from './i18n';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly renderer: Renderer2;

  constructor(
    private title: Title,
    private meta: Meta,
    rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  apply(lang: Lang): void {
    const tr = TRANSLATIONS[lang];
    const otherLang: Lang = lang === 'nl' ? 'en' : 'nl';
    const otherUrl = TRANSLATIONS[otherLang].canonicalUrl;

    // html lang attribute
    this.document.documentElement.lang = lang;

    // title + description
    this.title.setTitle(tr.metaTitle);
    this.meta.updateTag({ name: 'description', content: tr.metaDescription });

    // Open Graph
    this.meta.updateTag({ property: 'og:type',               content: 'website' });
    this.meta.updateTag({ property: 'og:title',              content: tr.h1 });
    this.meta.updateTag({ property: 'og:description',        content: tr.metaDescription });
    this.meta.updateTag({ property: 'og:url',                content: tr.canonicalUrl });
    this.meta.updateTag({ property: 'og:image',              content: `${BASE_URL}/assets/og.png` });
    this.meta.updateTag({ property: 'og:image:width',        content: '1200' });
    this.meta.updateTag({ property: 'og:image:height',       content: '630' });
    this.meta.updateTag({ property: 'og:locale',             content: tr.ogLocale });
    this.meta.updateTag({ property: 'og:locale:alternate',   content: tr.ogLocaleAlternate });

    // Twitter
    this.meta.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title',       content: tr.h1 });
    this.meta.updateTag({ name: 'twitter:description', content: tr.metaDescription });
    this.meta.updateTag({ name: 'twitter:image',       content: `${BASE_URL}/assets/og.png` });

    // canonical + hreflang
    this.setLink('canonical', tr.canonicalUrl);
    this.setHreflang(lang, tr.canonicalUrl, otherLang, otherUrl);

    // JSON-LD
    this.setJsonLd(lang, tr);
  }

  private setLink(rel: string, href: string): void {
    let el = this.document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = this.renderer.createElement('link');
      this.renderer.appendChild(this.document.head, el);
    }
    this.renderer.setAttribute(el, 'rel', rel);
    this.renderer.setAttribute(el, 'href', href);
  }

  private setHreflang(lang: Lang, url: string, otherLang: Lang, otherUrl: string): void {
    this.document.querySelectorAll('link[hreflang]').forEach(el => el.remove());

    const pairs: Array<[string, string]> = [
      [lang, url],
      [otherLang, otherUrl],
      ['x-default', TRANSLATIONS['nl'].canonicalUrl],
    ];
    pairs.forEach(([hl, href]) => {
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'alternate');
      this.renderer.setAttribute(link, 'hreflang', hl);
      this.renderer.setAttribute(link, 'href', href);
      this.renderer.appendChild(this.document.head, link);
    });
  }

  private setJsonLd(lang: Lang, tr: typeof TRANSLATIONS[Lang]): void {
    this.document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());

    const webApp = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Dutch Cartax',
      url: `${BASE_URL}/`,
      description: tr.metaDescription,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      inLanguage: ['nl', 'en'],
    };

    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tr.faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };

    [webApp, faqPage].forEach(schema => {
      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'type', 'application/ld+json');
      script.textContent = JSON.stringify(schema);
      this.renderer.appendChild(this.document.head, script);
    });
  }
}
