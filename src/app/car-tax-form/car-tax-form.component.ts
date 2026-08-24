import { BUILD_TIME } from '../../build-time';
import { concat, Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, delay, filter, take, debounceTime, shareReplay } from 'rxjs/operators';
import { Component, OnInit, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSelect } from '@angular/material/select';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CarTaxService, FuelTypes, Grid, Province } from './car-tax.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RdwService, RdwVehicle, isValidDutchPlate, getEffectiveWeight } from './rdw.service';
import { I18nService } from '../i18n.service';
import { AnalyticsService } from '../analytics.service';
import { FormValue, calculatePrice, isOldtimerExempt } from 'dutch-car-tax-core';

@Component({
  standalone: false,
  selector: 'app-car-tax-form',
  templateUrl: './car-tax-form.component.html',
  styleUrls: ['./car-tax-form.component.scss']
})
export class CarTaxFormComponent implements OnInit {

  public carTaxControl: FormGroup;
  public fuelTypes: FuelTypes;
  public provinces: Province[];
  public grid: Grid;
  public motorcycleWeight = 701;
  public lightTruckWeight = 3500;
  public heavyTruckWeight = 4500;
  public price$: Observable<number>;
  public sliderValue = 1551;
  public ObservableQueryParams: Observable<number>;
  public ObservableValueChanges: Observable<number>;

  public vehicleInfo: RdwVehicle | null = null;
  public detectedFuelType: string | null = null;
  public detectedWeight: number | null = null;
  public isOldtimerVehicle = false;
  public plateInput = '';
  public isLoadingVehicle = false;
  public vehicleNotFound = false;
  public readonly buildTime = BUILD_TIME;

  public displayPrice$: Observable<number>;
  public pricePeriod: 'monthly' | 'quarterly' | 'yearly' = 'quarterly';
  private pricePeriodSubject = new BehaviorSubject<'monthly' | 'quarterly' | 'yearly'>('quarterly');
  public detectedProvinceName: string | null = null;
  public isEditingProvince = false;

  @ViewChild('provinceSelect') provinceSelect?: MatSelect;


  private readonly isBrowser: boolean;

  constructor(
    public _formBuilder: FormBuilder,
    public _carTaxService: CarTaxService,
    private _activatedRoute: ActivatedRoute,
    private _router: Router,
    private _rdwService: RdwService,
    @Inject(PLATFORM_ID) platformId: object,
    public i18n: I18nService,
    private _analytics: AnalyticsService) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.fuelTypes = this._carTaxService.getFuelTypes();
    this.provinces = this._carTaxService.getProvinces();
    this.grid = this._carTaxService.getTaxGrid();
  }

  ngOnInit() {

    this.carTaxControl = this._formBuilder.group({
      provinceKey: 'NH',
      fuelType: 'Benzine',
      volume: this.sliderValue
    });

    this.carTaxControl.get('volume')!.valueChanges.subscribe(v => {
      this.sliderValue = +v;
    });

    if (this.isBrowser) {
      this._activatedRoute.queryParams.pipe(
        take(1),
        filter(queryParams => !Boolean(Object.keys(queryParams).length)))
        .subscribe(() => {
          this._router.navigate([], { relativeTo: this._activatedRoute, queryParams: this.carTaxControl.value });
        });
    }

    this.ObservableQueryParams = this._activatedRoute.queryParams.pipe(
      take(1),
      delay(1),
      map((queryParams) => {
        const vehicleValues = {};
        Object.keys(this.carTaxControl.value).forEach((controlName) => {
          if (queryParams[controlName]) {
            const val = controlName === 'fuelType' && queryParams[controlName] === 'Hybride'
              ? 'Benzine' : queryParams[controlName];
            this.carTaxControl.controls[controlName].setValue(val);
            vehicleValues[controlName] = queryParams[controlName];
          } else {
            vehicleValues[controlName] = this.carTaxControl.controls[controlName].value;
          }
        });
        if (queryParams['volume']) {
          this.sliderValue = +queryParams['volume'];
        }
        return this.getPrice(vehicleValues as FormValue);
      }));

    this.ObservableValueChanges = this.carTaxControl.valueChanges.pipe(
      map((vehicleValues: FormValue) => {
        return this.getPrice(vehicleValues);
      }));

    this.price$ = concat(this.ObservableQueryParams, this.ObservableValueChanges).pipe(shareReplay(1));
    this.displayPrice$ = combineLatest([this.price$, this.pricePeriodSubject]).pipe(
      map(([price, period]) => {
        if (period === 'monthly') return Math.round(price / 3);
        if (period === 'yearly') return Math.round(price * 4);
        return price;
      })
    );

    if (this.isBrowser) {
      this.carTaxControl.valueChanges.pipe(
        debounceTime(50)
      ).subscribe(values => {
        const fuelMatches = !this.detectedFuelType || values.fuelType === this.detectedFuelType;
        const weightMatches = !this.detectedWeight || +values.volume === this.detectedWeight;
        const plate = (this.vehicleInfo && fuelMatches && weightMatches)
          ? this.plateInput.trim().toUpperCase()
          : null;

        this._router.navigate([], {
          relativeTo: this._activatedRoute,
          queryParams: { ...values, plate },
          queryParamsHandling: 'merge'
        });
      });

      this._activatedRoute.queryParams.pipe(take(1)).subscribe(queryParams => {
        if (queryParams['plate']) {
          this.plateInput = queryParams['plate'];
          this.searchVehicle();
        }
      });
    }

    this._rdwService.detectProvinceKey().subscribe(key => {
      if (key) {
        this.carTaxControl.patchValue({ provinceKey: key });
        const province = this.provinces.find(p => p.key === key);
        this.detectedProvinceName = province?.title || key;
      }
    });
  }

  get currentProvinceName(): string {
    const key = this.carTaxControl?.get('provinceKey')?.value;
    return this.provinces.find(p => p.key === key)?.title ?? key ?? '';
  }

  openProvinceEdit(): void {
    this.isEditingProvince = true;
    Promise.resolve().then(() => this.provinceSelect?.open());
  }

  clearVehicle(): void {
    this._analytics.event('plate_clear');
    this.vehicleInfo = null;
    this.detectedFuelType = null;
    this.detectedWeight = null;
    this.vehicleNotFound = false;
    this.isOldtimerVehicle = false;
    this._router.navigate([], {
      relativeTo: this._activatedRoute,
      queryParams: { plate: null },
      queryParamsHandling: 'merge'
    });
    // Nothing else touches carTaxControl here, so force a recompute now that
    // isOldtimerVehicle is reset — otherwise the €0 price would stick around.
    this.carTaxControl.updateValueAndValidity();
  }

  getFuelLabel(fuel: string): string {
    return this.i18n.tr.fuelLabels[fuel] ?? fuel;
  }

  setPricePeriod(period: 'monthly' | 'quarterly' | 'yearly'): void {
    this.pricePeriod = period;
    this.pricePeriodSubject.next(period);
    this._analytics.event('period_select', { period });
  }

  get isPlateValid(): boolean {
    return isValidDutchPlate(this.plateInput);
  }

  searchVehicle(): void {
    if (!this.plateInput || !this.isPlateValid) {
      return;
    }
    this._router.navigate([], {
      relativeTo: this._activatedRoute,
      queryParams: { plate: this.plateInput.trim().toUpperCase() },
      queryParamsHandling: 'merge'
    });
    this.isLoadingVehicle = true;
    this.vehicleNotFound = false;
    this.vehicleInfo = null;
    this.detectedFuelType = null;
    this.detectedWeight = null;
    this.isOldtimerVehicle = false;

    this._analytics.event('plate_search');

    this._rdwService.lookupVehicle(this.plateInput).subscribe(vehicle => {
      this.isLoadingVehicle = false;
      const weight = vehicle ? getEffectiveWeight(vehicle) : null;
      if (vehicle && weight !== null) {
        this.vehicleInfo = vehicle;
        this.isOldtimerVehicle = isOldtimerExempt(vehicle.datum_eerste_toelating, new Date());
        this.detectedWeight = weight;
        const patch: Partial<FormValue> = { volume: weight };
        const fuelType = this.mapRdwFuelType(vehicle.brandstof_types, vehicle);
        if (fuelType) {
          patch.fuelType = fuelType;
          this.detectedFuelType = fuelType;
        }
        this.carTaxControl.patchValue(patch);
        this.sliderValue = weight;
        this._analytics.event('plate_found', { fuel_type: fuelType, weight_kg: weight });
      } else {
        this.vehicleNotFound = true;
        this._analytics.event('plate_not_found');
      }
    });
  }

  private mapRdwFuelType(fuels: string[] | undefined, vehicle?: RdwVehicle | null): string | null {
    if (!fuels || fuels.length === 0) return null;
    const hasElectric = fuels.includes('Elektriciteit');
    const hasNonElectric = fuels.some(f => f !== 'Elektriciteit');
    // Hybrid (incl. self-charging) → same rate as Benzine since 2026, map to Benzine
    if (hasElectric && hasNonElectric) return 'Benzine';
    if (hasElectric && vehicle?.cilinderinhoud && +vehicle.cilinderinhoud > 0) return 'Benzine';
    if (hasElectric) return 'Elektrisch';
    if (fuels.includes('Benzine')) return 'Benzine';
    if (fuels.includes('Diesel')) return 'Diesel';
    if (fuels.includes('LPG')) return 'LPG3';
    if (fuels.some(f => /waterstof/i.test(f))) return 'Elektrisch';
    return null;
  }

  getVehicleYear(vehicle: RdwVehicle): string {
    return vehicle.datum_eerste_toelating?.substring(0, 4) || '';
  }

  formatPrice(val: string): string {
    return val ? parseInt(val, 10).toLocaleString('nl-NL') : '';
  }

  getColorHex(colorName: string): string {
    const map: { [key: string]: string } = {
      'WIT': '#ffffff',
      'ZWART': '#111111',
      'GRIJS': '#9e9e9e',
      'GRIJS/ZILVER': '#9e9e9e',
      'ZILVER': '#c0c0c0',
      'ROOD': '#e53935',
      'BLAUW': '#1e88e5',
      'GROEN': '#43a047',
      'GEEL': '#fdd835',
      'ORANJE': '#fb8c00',
      'BRUIN': '#795548',
      'BEIGE': '#d7ccc8',
      'PAARS': '#7b1fa2'
    };
    return map[colorName] || '#9e9e9e';
  }

  getFuelIcon(fuel: string): string {
    const icons: Record<string, string> = {
      'Benzine':    'local_gas_station',
      'Diesel':     'opacity',
      'Elektrisch': 'flash_on',
      'LPG3':       'whatshot',
      'LPG':        'whatshot',
    };
    return icons[fuel] ?? 'local_gas_station';
  }

  getColorName(rdwColor: string): string {
    const map: Record<string, string> = {
      'WIT':        'White',
      'ZWART':      'Black',
      'GRIJS':      'Grey',
      'GRIJS/ZILVER': 'Silver',
      'ZILVER':     'Silver',
      'ROOD':       'Red',
      'BLAUW':      'Blue',
      'GROEN':      'Green',
      'GEEL':       'Yellow',
      'ORANJE':     'Orange',
      'BRUIN':      'Brown',
      'BEIGE':      'Beige',
      'PAARS':      'Purple',
    };
    return map[rdwColor] ?? rdwColor;
  }

  getVehicleModel(vehicle: RdwVehicle): string {
    const make = vehicle.merk?.trim().toUpperCase() ?? '';
    const model = vehicle.handelsbenaming?.trim() ?? '';
    return model.toUpperCase().startsWith(make) ? model.substring(make.length).trim() : model;
  }

  getPrice(value: FormValue): number {
    if (this.isOldtimerVehicle) return 0;
    return calculatePrice(this.grid, value);
  }
}
