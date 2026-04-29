import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import LicensePlate from 'license-plate';

export function isValidDutchPlate(plate: string): boolean {
  return new LicensePlate(plate).valid();
}

export interface RdwVehicle {
  kenteken: string;
  voertuigsoort: string;
  merk: string;
  handelsbenaming: string;
  eerste_kleur: string;
  inrichting: string;
  aantal_zitplaatsen: string;
  aantal_cilinders: string;
  cilinderinhoud: string;
  massa_rijklaar: string;
  datum_eerste_toelating: string;
  catalogusprijs: string;
  aantal_deuren: string;
  bruto_bpm: string;
  massa_ledig_voertuig: string;
  wam_verzekerd: string;
  vermogen_massarijklaar: string;
  brandstof_types?: string[];
}

const PROVINCE_MAP: Record<string, string> = {
  'drenthe': 'DR',
  'flevoland': 'FL',
  'friesland': 'FR',
  'fryslân': 'FR',
  'gelderland': 'GL',
  'groningen': 'GR',
  'limburg': 'LI',
  'noord-brabant': 'NB',
  'noord-holland': 'NH',
  'overijssel': 'OV',
  'utrecht': 'UT',
  'zeeland': 'ZL',
  'zuid-holland': 'ZH',
};

@Injectable({ providedIn: 'root' })
export class RdwService {

  constructor(
    private _http: HttpClient,
    @Inject(PLATFORM_ID) private _platformId: object
  ) {}

  lookupVehicle(plate: string): Observable<RdwVehicle | null> {
    const kenteken = plate.replace(/-/g, '').toUpperCase();
    const vehicleUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${kenteken}`;
    const fuelUrl = `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${kenteken}`;

    return forkJoin({
      vehicle: this._http.get<RdwVehicle[]>(vehicleUrl).pipe(
        map(r => r?.[0] ?? null),
        catchError(() => of(null))
      ),
      fuel: this._http.get<{ brandstof_omschrijving: string }[]>(fuelUrl).pipe(
        map(r => r?.map(f => f.brandstof_omschrijving) ?? []),
        catchError(() => of([]))
      )
    }).pipe(
      map(({ vehicle, fuel }) => {
        if (!vehicle) return null;
        return { ...vehicle, brandstof_types: fuel };
      })
    );
  }

  // Province boundaries are ~30km across; anything less accurate than that is IP-based noise
  private readonly MAX_GEO_ACCURACY_M = 30000;

  detectProvinceKey(): Observable<string | null> {
    if (!isPlatformBrowser(this._platformId)) {
      return of(null);
    }
    return new Observable<GeolocationPosition>(observer => {
      if (!navigator.geolocation) {
        observer.error('no-geolocation');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => { observer.next(pos); observer.complete(); },
        ()  => { observer.error('denied'); }
      );
    }).pipe(
      switchMap(pos => {
        if (pos.coords.accuracy > this.MAX_GEO_ACCURACY_M) {
          return of<string | null>(null);
        }
        const { latitude: lat, longitude: lon } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=nl`;
        return this._http.get<{ address: { state?: string; 'ISO3166-2-lvl4'?: string } }>(url).pipe(
          map(result => {
            const iso = result?.address?.['ISO3166-2-lvl4'];
            if (iso?.startsWith('NL-')) {
              const code = iso.substring(3);
              const overrides: Record<string, string> = { 'GE': 'GL', 'ZE': 'ZL' };
              return overrides[code] ?? code;
            }
            const state = (result?.address?.state || '').toLowerCase().trim();
            return PROVINCE_MAP[state] ?? null;
          })
        );
      }),
      catchError(() => of(null))
    );
  }
}
