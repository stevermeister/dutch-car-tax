import { Directive, Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { CarTaxService, FuelTypes, Grid, Provinces } from './car-tax.service';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';


export type FormValue = {
  'provinceKey': string;
  'fuelType': string;
  'volume': number;
};


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
  public selectedFuelType: string;
  public price$;


  constructor(private _carTaxService: CarTaxService) {
  }

  public value: number;

  ngOnInit() {

    this._carTaxService.getFuelTypes().subscribe((fuelTypes: FuelTypes) => this.fuelTypes = fuelTypes);
    this._carTaxService.getProvinces().subscribe((provinces: Provinces[]) => this.provinces = provinces);
    this._carTaxService.getTaxGrid().subscribe((taxGrid: Grid) => this.grid = taxGrid);

    this.carTaxControl = new FormGroup({
      provinceKey: new FormControl('', Validators.required),
      fuelType: new FormControl('', Validators.required),
      volume: new FormControl('', Validators.required)
    });

    // this.carTaxControl.valueChanges.subscribe((value: FormValue) => {

    //   this.selectedFuelType = value.fuelType;
    // });

    this.price$ = this.carTaxControl.valueChanges.switchMap((value: FormValue) => {
      return Observable.of(this.getPrice(value));
    });
  }



  setSliderValue(value: number): void {
    this.value = value;
  }


  getPrice(value: FormValue) {

    const provinceGrid = this.grid[value.provinceKey];
    let i = 0;
    let ratevolume = provinceGrid[i].split('#')[0];
    let price = provinceGrid[i].split('#')[this.fuelTypes.indexOf(value.fuelType) + 1];
    while (ratevolume < value.volume) {
      i++;
      ratevolume = provinceGrid[i].split('#')[0];
      price = provinceGrid[i].split('#')[this.fuelTypes.indexOf(value.fuelType) + 1];
    }
    console.log(price);
    return price;
  }

}
