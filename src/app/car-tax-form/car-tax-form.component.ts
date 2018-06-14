import { CookieService } from './../cookie.service';
import { TranslationService } from './../translation.service';
import { Directive, Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { CarTaxService, FuelTypes, Grid, Provinces } from './car-tax.service';
import { ActivatedRoute, Router } from '@angular/router';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/pluck';
import 'rxjs/add/operator/skip';
import 'rxjs/add/observable/concat';
import 'rxjs/add/operator/delay';


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
  public ObservableQueryParams;
  public ObservableValueChanges;


  constructor(
    public _formBuilder: FormBuilder,
    public _carTaxService: CarTaxService,
    private _activatedRoute: ActivatedRoute,
    private _translationService: TranslationService,
    private _router: Router,
    private _cookieService: CookieService) {

    this.fuelTypes = this._carTaxService.getFuelTypes();
    this.provinces = this._carTaxService.getProvinces();
    this.grid = this._carTaxService.getTaxGrid();

  }

  ngOnInit() {

    this.carTaxControl = this._formBuilder.group({
      provinceKey: 'NH',
      fuelType: 'Benzine',
      volume: '1551'
    });

    this._activatedRoute.queryParams
      .take(1)
      .filter(queryParams => !Boolean(Object.keys(queryParams).length))
      .subscribe((queryParams) => {

        this._router.navigate([], { relativeTo: this._activatedRoute, queryParams: this.carTaxControl.value });
      });

    this.ObservableQueryParams = this._activatedRoute.queryParams
      .take(1)
      .delay(1)
      .map((queryParams) => {

        const vehicleValues = {};

        Object.keys(this.carTaxControl.value).forEach((controlName) => {
          if (queryParams[controlName]) {
            this.carTaxControl.controls[controlName].setValue(queryParams[controlName]);
            vehicleValues[controlName] = queryParams[controlName];
          } else {
            vehicleValues[controlName] = this.carTaxControl.controls[controlName].value;
          }
        });

        return this.getPrice(vehicleValues as FormValue);
      });

    this.ObservableValueChanges = this.carTaxControl.valueChanges
      .map((vehicleValues: FormValue) => {

        return this.getPrice(vehicleValues);
      });

    this.price$ = Observable.concat(this.ObservableQueryParams, this.ObservableValueChanges);

    this._activatedRoute.params.pluck('language').filter(Boolean).subscribe((language: string) => {
      this._translationService.switchLanguage(language);
      this.selectedLanguageClassIcon = this._translationService.getLanguageIconClass(language);
      this._cookieService.setCookie('language', language, 365);
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
