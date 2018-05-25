import { Injectable } from '@angular/core';

@Injectable()
export class TranslationService {

  public currentLanguage = 'gb';
  private _dictionary = {

    'gb': {
      flagIconClass: 'flag-icon-gb',
      values: {
        'Benzine': 'Benzine',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG'
      }
    },
    'fr': {
      flagIconClass: 'flag-icon-fr',
      values: {
        'Benzine': 'Essence',
        'Diesel': 'Diesel',
        'LPG3': 'GPL3',
        'LPG': 'GPL3'
      }
    },
    'ru': {
      flagIconClass: 'flag-icon-ru',
      values: {
        'Benzine': 'Бензин',
        'Diesel': 'Дизель',
        'LPG3': 'Газ 3',
        'LPG': 'Газ'
      }
    },
    'de': {
      flagIconClass: 'flag-icon-de',
      values: {
        'Benzine': 'Benzine',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG'
      }
    },
    'es': {
      flagIconClass: 'flag-icon-es',
      values: {
        'Benzine': 'Benzine',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG'
      }
    },
    'nl': {
      flagIconClass: 'flag-icon-nl',
      values: {
        'Benzine': 'Benzine',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG'
      }
    }


  };

  constructor() { }

  switchLanguage(value): void {

    this.currentLanguage = value;
  }

  getLanguageIconClass(language: string): string {

    return this._dictionary[this.currentLanguage].flagIconClass;
  }

  translate(key: string): string {

    return this._dictionary[this.currentLanguage].values[key];
  }
}


