import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { CarTaxService, FuelTypes, Grid, Provinces } from './car-tax.service';

@Component({
  selector: 'app-car-tax-form',
  templateUrl: './car-tax-form.component.html',
  styleUrls: ['./car-tax-form.component.scss']
})
export class CarTaxFormComponent implements OnInit {

  public carTaxControl: FormGroup;
  public fuelTypes: FuelTypes;
  public provinces: Provinces[];
  public grid: Grid;
  public price = 0;

  constructor(private _carTaxService: CarTaxService) {
  }

  ngOnInit() {

    this._carTaxService.getFuelTypes().subscribe((fuelTypes: FuelTypes) => this.fuelTypes = fuelTypes);
    this._carTaxService.getProvinces().subscribe((provinces: Provinces[]) => this.provinces = provinces);
    this._carTaxService.getTaxGrid().subscribe((taxGrid: Grid) => this.grid = taxGrid);


    this.carTaxControl = new FormGroup({
      provinceKey: new FormControl('', Validators.required),
      fuelType: new FormControl('', Validators.required),
      volume: new FormControl('', Validators.required)
    });


    this.carTaxControl.statusChanges.filter((status: string) => status === 'VALID').subscribe(() => {

      const value = this.carTaxControl.value;
      this.price = this.getPrice(value.provinceKey, value.fuelType, value.volume);
    });
  }


  getPrice(provinceKey: string, fuelType: string, volume: number ) {
    const provinceGrid = this.grid[provinceKey];
    let i = 0;
    let ratevolume = provinceGrid[i].split('#')[0];
    let price = provinceGrid[i].split('#')[this.fuelTypes.indexOf(fuelType) + 1];
    while (ratevolume < volume) {
      i++;
      ratevolume = provinceGrid[i].split('#')[0];
      price = provinceGrid[i].split('#')[this.fuelTypes.indexOf(fuelType) + 1];
    }
    return price;
  }

}
