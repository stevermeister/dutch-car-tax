import { TranslationService } from './../translation.service';
import { Directive, Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { CarTaxService, FuelTypes, Grid, Provinces } from './car-tax.service';
import { ActivatedRoute } from '@angular/router';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/pluck';
import 'rxjs/add/operator/merge';


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
  public motorcycleWeight = 701;
  public lightTruckWeight = 3500;
  public heavyTruckWeight = 4500;
  public price$: Observable<number>;
  public selectedLanguageClassIcon = 'flag-icon-gb';
  public timePeriod = 'timePeriod';
  public selectProvincePlaceholder = 'selectProvincePlaceholder';

  constructor(
    public _carTaxService: CarTaxService,
    private _activatedRoute: ActivatedRoute,
    private _translationService: TranslationService) {

    this.fuelTypes = this._carTaxService.getFuelTypes();
    this.provinces = this._carTaxService.getProvinces();
    this.grid = this._carTaxService.getTaxGrid();

  }

  ngOnInit() {

    this.carTaxControl = new FormGroup({
      provinceKey: new FormControl('NH', Validators.required),
      fuelType: new FormControl('Benzine', Validators.required),
      volume: new FormControl('1551', Validators.required)
    });

    this._activatedRoute.queryParams
      .take(1)
      .subscribe((queryParams) => {
        ['provinceKey', 'fuelType', 'volume'].forEach((item) => {
          if (queryParams[item]) {
            this.carTaxControl.controls[item].setValue(queryParams[item]);
          }
        });
      });

    this.price$ = this.carTaxControl.valueChanges
      .merge(this._activatedRoute.queryParams
        .take(1)
        .map(queryParams => {

          const values = {};
          Object.keys(this.carTaxControl.value).forEach(key => {

            if (!queryParams[key]) {
              values[key] = this.carTaxControl.value[key];
            } else {
              values[key] = queryParams[key];
            }
          });

          return values;
        }))
      .map((vehicleValues: FormValue) => {

        return this.getPrice(vehicleValues);
      });


    this._activatedRoute.params.pluck('language').filter(Boolean).subscribe((language: string) => {

      this._translationService.switchLanguage(language);
      this.selectedLanguageClassIcon = this._translationService.getLanguageIconClass(language);
    });

  }


  getPrice(value: FormValue): number {

    if (value.volume < 551) {
      return this.grid[value.provinceKey][0].split('#')[this.fuelTypes.indexOf(value.fuelType) + 1];
    }
    const provinceGrid = this.grid[value.provinceKey];
    const index = Math.floor(value.volume / 100 - 4);
    const weight = provinceGrid[index].split('#')[0];

    if (value.volume < weight) {
      return provinceGrid[index - 1].split('#')[this.fuelTypes.indexOf(value.fuelType) + 1];
    }

    return provinceGrid[index].split('#')[this.fuelTypes.indexOf(value.fuelType) + 1];
  }




}
