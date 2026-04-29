import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { I18nService } from './i18n.service';
import { SeoService } from './seo.service';
import { Lang } from './i18n';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    public i18n: I18nService,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const lang: Lang = e.urlAfterRedirects.startsWith('/en') ? 'en' : 'nl';
        this.i18n.setLang(lang);
        this.seo.apply(lang);
      });

    // Apply on initial SSR render (NavigationEnd already fired before subscription)
    const url = this.router.url;
    const lang: Lang = url.startsWith('/en') ? 'en' : 'nl';
    this.i18n.setLang(lang);
    this.seo.apply(lang);
  }
}
