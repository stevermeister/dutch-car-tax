import { Injectable } from '@angular/core';

@Injectable()
export class TranslationService {

  public currentLanguage = 'gb';
  private _dictionary = {

    'gb': {
      flagIconClass: 'flag-icon-gb',
      values: {
        'Benzine': 'Petrol',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG',
        'timePeriod': 'per quarter',
        'selectProvincePlaceholder': 'Select Province'
      }
    },
    'fr': {
      flagIconClass: 'flag-icon-fr',
      values: {
        'Benzine': 'Essence',
        'Diesel': 'Diésel',
        'LPG3': 'GPL3',
        'LPG': 'GPL3',
        'timePeriod': 'pour le trimestre',
        'selectProvincePlaceholder': 'Selectionnez Province'
      }
    },
    'ru': {
      flagIconClass: 'flag-icon-ru',
      values: {
        'Benzine': 'Бензин',
        'Diesel': 'Дизель',
        'LPG3': 'Газ 3',
        'LPG': 'Газ',
        'timePeriod': 'за квартал',
        'selectProvincePlaceholder': 'Выберите провинцию'
      }
    },
    'de': {
      flagIconClass: 'flag-icon-de',
      values: {
        'Benzine': 'Motorenbenzin',
        'Diesel': 'Diesel',
        'LPG3': 'Flüssiggas3',
        'LPG': 'Flüssiggas',
        'timePeriod': 'pro Quartal',
        'selectProvincePlaceholder': 'Wählen Provinz'
      }
    },
    'es': {
      flagIconClass: 'flag-icon-es',
      values: {
        'Benzine': 'Gasolina',
        'Diesel': 'Diésel',
        'LPG3': 'GPL3',
        'LPG': 'GLP',
        'timePeriod': 'por trimestre',
        'selectProvincePlaceholder': 'Seleccione Provincia'
      }

    },
    'nl': {
      flagIconClass: 'flag-icon-nl',
      values: {
        'Benzine': 'Benzine',
        'Diesel': 'Diesel',
        'LPG3': 'LPG3',
        'LPG': 'LPG',
        'timePeriod': 'per tijdvak van 3 maanden',
        'selectProvincePlaceholder': 'Selecteer Provincie'
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
    console.log('key', key);
    return this._dictionary[this.currentLanguage].values[key];
  }
}


