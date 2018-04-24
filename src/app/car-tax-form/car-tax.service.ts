import { FuelTypes } from './car-tax.service';
import { Observable } from 'rxjs/Rx';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


export type FuelTypes = string[];
export type Provinces = {
  key: string;
  title: string;
};

export type Grid = {
  DR: number[],
  FL: string[],
  FR: string[],
  GL: string[],
  GR: string[],
  LI: string[],
  NB: string[],
  NH: string[],
  OV: string[],
  UT: string[],
  ZL: string[],
  ZH: string[]
};



@Injectable()
export class CarTaxService {

  constructor(private _http: HttpClient) {
  }

  getFuelTypes(): Observable<FuelTypes> {

    return this._http.get<any>('./assets/json/fuelTypes.json');
  }


  getFuelProvinces() {

    return this._http.get<any>('./assets/json/provinces.json');
  }


  getTaxGrid() {

    return this._http.get<any>('./assets/json/grid.json');
  }


}
