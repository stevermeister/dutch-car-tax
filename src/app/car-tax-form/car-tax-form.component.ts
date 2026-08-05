import { BUILD_TIME } from '../../build-time';
import { concat, Observable, BehaviorSubject, combineLatest, firstValueFrom } from 'rxjs';
import { map, delay, filter, take, debounceTime, shareReplay } from 'rxjs/operators';
import { Component, OnInit, ViewChild, Inject, PLATFORM_ID, NgZone, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSelect } from '@angular/material/select';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CarTaxService, FuelTypes, Grid, Provinces } from './car-tax.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RdwService, RdwVehicle, isValidDutchPlate } from './rdw.service';
import { I18nService } from '../i18n.service';
import { AnalyticsService } from '../analytics.service';
import { KentekenScanService } from './kenteken-scan.service';

export type FormValue = {
  'provinceKey': string;
  'fuelType': string;
  'volume': number;
};

// Grid columns: weight#benzine#diesel#lpg3#lpg
// 2026 MRB rates: electric = 70% of benzine, hybrid/PHEV = 100% of benzine (discount abolished)
export const FUEL_CONFIG: Record<string, { col: number; multiplier: number }> = {
  'Benzine':    { col: 1, multiplier: 1.00 },
  'Diesel':     { col: 2, multiplier: 1.00 },
  'Elektrisch': { col: 1, multiplier: 0.70 },
  'LPG3':       { col: 3, multiplier: 1.00 },
  'LPG':        { col: 4, multiplier: 1.00 },
  'Hybride':    { col: 1, multiplier: 1.00 },
};

// Oldtimerregeling: passenger cars 40 years or older are fully exempt from MRB.
export const OLDTIMER_EXEMPT_AGE_YEARS = 40;

export function isOldtimerExempt(datumEersteToelating: string | undefined | null, now: Date): boolean {
  if (!datumEersteToelating || datumEersteToelating.length < 8) return false;
  const year = +datumEersteToelating.substring(0, 4);
  const month = +datumEersteToelating.substring(4, 6);
  const day = +datumEersteToelating.substring(6, 8);
  const firstRegistration = new Date(year, month - 1, day);
  if (isNaN(firstRegistration.getTime())) return false;

  const ageThreshold = new Date(firstRegistration);
  ageThreshold.setFullYear(ageThreshold.getFullYear() + OLDTIMER_EXEMPT_AGE_YEARS);
  return ageThreshold <= now;
}

export function calculatePrice(grid: Grid, value: FormValue): number {
  const { col, multiplier } = FUEL_CONFIG[value.fuelType] ?? { col: 1, multiplier: 1 };

  if (value.volume < 551) {
    return Math.floor(+grid[value.provinceKey][0].split('#')[col] * multiplier);
  }

  const provinceGrid = grid[value.provinceKey];
  const index = Math.floor(value.volume / 100 - 4);
  const weight = +provinceGrid[index].split('#')[0];
  const row = value.volume < weight ? index - 1 : index;

  return Math.floor(+provinceGrid[row].split('#')[col] * multiplier);
}

@Component({
  standalone: false,
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
  public scanState: 'idle' | 'loading' | 'processing' | 'error' = 'idle';
  public scanError: string | null = null;
  public showPrivacyNote = false;
  public isScanEnabled = false;
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
    private _analytics: AnalyticsService,
    private _kentekenScan: KentekenScanService,
    private _zone: NgZone,
    private _cdr: ChangeDetectorRef) {
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
    this._analytics.event('plate_clear', { plate: this.plateInput.trim().toUpperCase() });
    this.vehicleInfo = null;
    this.detectedFuelType = null;
    this.detectedWeight = null;
    this.vehicleNotFound = false;
    this.scanState = 'idle';
    this.scanError = null;
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

  private _nlTapCount = 0;
  private _nlTapTimer: any = null;

  onNlTap(): void {
    this._nlTapCount++;
    clearTimeout(this._nlTapTimer);
    this._nlTapTimer = setTimeout(() => { this._nlTapCount = 0; }, 600);
    if (this._nlTapCount >= 3) {
      this._nlTapCount = 0;
      this.isScanEnabled = true;
    }
  }

  onScanLabelClick(event: Event): void {
    if (this.scanState === 'loading' || this.scanState === 'processing') {
      event.preventDefault();
      return;
    }
    this.showPrivacyNote = true;
    this._kentekenScan.preload();
    // No programmatic .click() needed — the <label for="scanFileInput"> opens
    // the file picker natively, which mobile browsers always trust as a user gesture.
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    this.scanState = this._kentekenScan.isLoaded ? 'processing' : 'loading';
    this.scanError = null;
    this._analytics.event('kenteken_scan_attempted');

    try {
      const { candidates, confidence } = await this._kentekenScan.scanImage(file);

      if (!candidates.length) {
        this._zone.run(() => {
          this.scanState = 'error';
          this.scanError = confidence < 30
            ? 'Foto te onscherp — maak een scherpere foto van het kenteken'
            : 'Kenteken niet herkend, probeer opnieuw';
          this._cdr.detectChanges();
        });
        return;
      }

      // Validate candidates against RDW in parallel — OCR produces multiple
      // valid-looking plates; the first isn't always the real one.
      const top = candidates.slice(0, 6);
      console.log('[Scan] checking candidates against RDW:', top);
      const results = await Promise.all(
        top.map(c => firstValueFrom(this._rdwService.lookupVehicle(c)))
      );
      console.log('[Scan] RDW results:', results.map((v, i) => `${top[i]}:${v ? 'hit' : 'miss'}`));
      const matchIndex = results.findIndex(v => v?.massa_ledig_voertuig);
      const matchedPlate = matchIndex >= 0 ? top[matchIndex] : null;
      console.log('[Scan] matched:', matchedPlate);

      this._zone.run(() => {
        this.plateInput = matchedPlate ?? candidates[0];
        this.scanState = 'idle';
        this._analytics.event('kenteken_scan_success', { plate: this.plateInput });
        this._cdr.detectChanges();
        this.searchVehicle();
      });

    } catch (e) {
      console.error('[KentekenScan] pipeline error:', e);
      this._zone.run(() => {
        this.scanState = 'error';
        this.scanError = 'Kenteken niet herkend, probeer opnieuw';
        this._cdr.detectChanges();
      });
    }
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

    const plate = this.plateInput.trim().toUpperCase();
    this._analytics.event('plate_search', { plate });

    this._rdwService.lookupVehicle(this.plateInput).subscribe(vehicle => {
      this.isLoadingVehicle = false;
      if (vehicle && vehicle.massa_ledig_voertuig) {
        this.vehicleInfo = vehicle;
        this.isOldtimerVehicle = isOldtimerExempt(vehicle.datum_eerste_toelating, new Date());
        const weight = +vehicle.massa_ledig_voertuig;
        this.detectedWeight = weight;
        const patch: Partial<FormValue> = { volume: weight };
        const fuelType = this.mapRdwFuelType(vehicle.brandstof_types, vehicle);
        if (fuelType) {
          patch.fuelType = fuelType;
          this.detectedFuelType = fuelType;
        }
        this.carTaxControl.patchValue(patch);
        this.sliderValue = weight;
        this._analytics.event('plate_found', { plate, fuel_type: fuelType, weight_kg: weight });
      } else {
        this.vehicleNotFound = true;
        this._analytics.event('plate_not_found', { plate });
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

  private readonly FUEL_CONFIG = FUEL_CONFIG;

  getFuelIcon(fuel: string): string {
    const icons: Record<string, string> = {
      'Benzine':    'fa-gas-pump',
      'Diesel':     'fa-tint',
      'Elektrisch': 'fa-bolt',
      'LPG3':       'fa-fire',
      'LPG':        'fa-fire',
    };
    return icons[fuel] ?? 'fa-gas-pump';
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
