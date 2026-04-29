import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Lang, TRANSLATIONS, Translations } from './i18n';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang$ = new BehaviorSubject<Lang>('nl');

  get lang(): Lang { return this._lang$.value; }
  get tr(): Translations { return TRANSLATIONS[this._lang$.value]; }

  setLang(lang: Lang): void {
    this._lang$.next(lang);
  }
}
