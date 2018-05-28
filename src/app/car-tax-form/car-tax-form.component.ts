import { TranslationService } from './../translation.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Directive, Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { CarTaxService, FuelTypes, Grid, Provinces } from './car-tax.service';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/take';
import { ActivatedRoute } from '@angular/router';


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
  public price$;
  public selectedLanguageClassIcon = 'flag-icon-gb';

  constructor(
    public _carTaxService: CarTaxService,
    private _activatedRoute: ActivatedRoute,
    private _translationService: TranslationService) {
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

    this.carTaxControl.setValue({
      'provinceKey': 'NH',
      'fuelType': 'Benzine',
      'volume': '1551'
    });

    this.price$ = Observable.combineLatest(
      this._carTaxService.getFuelTypes(),
      this._carTaxService.getProvinces(),
      this._carTaxService.getTaxGrid(),

      (fuelTypes, provinces, taxGrid) => {

        this.fuelTypes = fuelTypes;
        this.provinces = provinces;
        this.grid = taxGrid;
      }
    ).switchMap(() => {

      return this.carTaxControl.valueChanges
        .merge(this._activatedRoute.queryParams.take(1)
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

          }).do(values => {

            this.carTaxControl.setValue({
              'provinceKey': values['provinceKey'],
              'fuelType': values['fuelType'],
              'volume': values['volume']
            }, { emitEvent: false });

            return values;

          }));
    }).map(value => {

      return this.getPrice(value);

    });
    // .subscribe((price: number) => {

    //   this.price$ = price;
    // });


    this._activatedRoute.params.pluck('language').filter(Boolean).subscribe((language: string) => {

      this._translationService.switchLanguage(language);
      this.selectedLanguageClassIcon = this._translationService.getLanguageIconClass(language);
    });

  }


  getPrice(value: any) {

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
