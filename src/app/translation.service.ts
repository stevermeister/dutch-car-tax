import { Injectable } from '@angular/core';

@Injectable()
export class TranslationService {

  public language = 'eng';
  private _languages = ['eng', 'nl', 'ru', 'fr'];
  public dictionary = {

    'eng': {
      language: 'english',
      values: {
        'Benzine': 'Benzine',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG'
      }
    },
    'fr': {
      language: 'french',
      values: {
        'Benzine': 'Essence',
        'Diesel': 'Diesel',
        'LPG3': 'GPL3',
        'LPG': 'GPL3'
      }
    },
    'ru': {
      language: 'russian',
      values: {
        'Benzine': 'Бензин',
        'Diesel': 'Дизель',
        'LPG3': 'Газ 3',
        'LPG': 'Газ'
      }
    }

  };

  constructor() { }

  switchLanguage(value): void {

    this.language = value;
  }

  translate(key: string): string {

    return this.dictionary[this.language].values[key];
  }
}


