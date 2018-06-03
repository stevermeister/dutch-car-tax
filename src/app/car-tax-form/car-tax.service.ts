
import { FuelTypes } from './car-tax.service';
import { Observable } from 'rxjs/Rx';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PROVINCES } from '../../assets/data/provinces';
import { GRID } from '../../assets/data/grid';


export type FuelTypes = string[];
export type Provinces = {
  'key': string;
  'title': string;
};

export type Grid = {
  'DR': string[],
  'FL': string[],
  'FR': string[],
  'GL': string[],
  'GR': string[],
  'LI': string[],
  'NB': string[],
  'NH': string[],
  'OV': string[],
  'UT': string[],
  'ZL': string[],
  'ZH': string[]
};



@Injectable()

export class CarTaxService {

  private _fuelTypes: FuelTypes = [
    'Benzine',
    'Diesel',
    'LPG3',
    'LPG'
  ];

  constructor(private _http: HttpClient) {
  }

  getFuelTypes(): FuelTypes {

    return this._fuelTypes;
  }


  getProvinces(): Provinces[] {

    return PROVINCES;
  }


  getTaxGrid(): Grid {

    return GRID;
  }


}
