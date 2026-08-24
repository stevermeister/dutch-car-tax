import { Injectable } from '@angular/core';
import { GRID, PROVINCES, FuelTypes, Grid, Province } from 'dutch-car-tax-core';

export type { FuelTypes, Grid, Province };

@Injectable()
export class CarTaxService {

  private _fuelTypes: FuelTypes = [
    'Benzine',
    'Diesel',
    'Elektrisch',
    'LPG3',
    'LPG',
  ];

  getFuelTypes(): FuelTypes {
    return this._fuelTypes;
  }

  getProvinces(): Province[] {
    return PROVINCES;
  }

  getTaxGrid(): Grid {
    return GRID;
  }

}
