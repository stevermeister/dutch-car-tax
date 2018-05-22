import { Injectable } from '@angular/core';

@Injectable()
export class TranslationService {

  public language = 'rus';
  private _languages = ['eng', 'nl', 'rus', 'fr'];
  public dictionary = {

    'fr': {
      language: 'french',
      values: {
        'Benzine': 'Essence',
        'Diesel': 'Diesel',
        'LPG3': 'GPL3',
        'LPG': 'GPL3'
      }
    },
    'rus': {
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



  translate(key: string): string {
    //console.log(this.dictionary);
    return this.dictionary[this.language].values[key];
    //return;

  }
}


