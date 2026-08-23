import { calculatePrice, FUEL_CONFIG, FormValue, isOldtimerExempt } from './car-tax-form.component';
import { GRID } from '../../assets/data/grid';

describe('calculatePrice (2026 MRB rates, massa rijklaar basis since 1 July 2026)', () => {

  function price(provinceKey: string, fuelType: string, volume: number): number {
    return calculatePrice(GRID, { provinceKey, fuelType, volume } as FormValue);
  }

  // Reference: official belastingdienst.nl 2026 JS tariff file (massa ledig voertuig basis).
  // Bracket lower bounds are 100 kg higher on the massa rijklaar basis, so the reference
  // 1551 kg bracket now starts at 1651 kg.
  // NH benzine 1651–1750 kg = €280 (NH has the lowest opcenten: 82.1%)
  it('NH Benzine 1651 = 280 (reference from belastingdienst.nl 2026)', () => {
    expect(price('NH', 'Benzine', 1651)).toBe(280);
  });

  it('DR Benzine 1651 = 291 (2026 official rate)', () => {
    expect(price('DR', 'Benzine', 1651)).toBe(291);
  });

  it('DR Benzine 1700 = 291 (same bracket as 1651)', () => {
    expect(price('DR', 'Benzine', 1700)).toBe(291);
  });

  it('DR Benzine 1750 = 291 (top of bracket)', () => {
    expect(price('DR', 'Benzine', 1750)).toBe(291);
  });

  it('DR Benzine 1751 moves to next bracket', () => {
    expect(price('DR', 'Benzine', 1751)).toBeGreaterThan(291);
  });

  // Bracket below 651
  it('NH Benzine 600 uses the lowest bracket', () => {
    expect(price('NH', 'Benzine', 600)).toBe(33);
  });

  it('NH Benzine 1 uses the lowest bracket', () => {
    expect(price('NH', 'Benzine', 1)).toBe(33);
  });

  // Bracket boundary at 651
  it('NH Benzine 650 still in lowest bracket', () => {
    expect(price('NH', 'Benzine', 650)).toBe(33);
  });

  it('NH Benzine 651 enters the 651–750 bracket', () => {
    expect(price('NH', 'Benzine', 651)).toBeGreaterThan(33);
  });

  // Bracket boundary: 1650 vs 1651
  it('NH Benzine 1650 is in the 1551–1650 bracket', () => {
    const at1650 = price('NH', 'Benzine', 1650);
    const at1651 = price('NH', 'Benzine', 1651);
    expect(at1651).toBeGreaterThan(at1650);
  });

  // All fuel types for NH at 1651
  it('NH Diesel 1651 matches grid', () => {
    expect(price('NH', 'Diesel', 1651)).toBe(549);
  });

  it('NH LPG3 1651 matches grid', () => {
    expect(price('NH', 'LPG3', 1651)).toBe(432);
  });

  it('NH LPG 1651 matches grid', () => {
    expect(price('NH', 'LPG', 1651)).toBe(579);
  });

  it('NH Elektrisch 1651 = 70% of Benzine (floored, matching belastingdienst.nl)', () => {
    const benzine = price('NH', 'Benzine', 1651);
    const electric = price('NH', 'Elektrisch', 1651);
    expect(electric).toBe(Math.floor(benzine * 0.70));
  });

  // Legacy Hybride maps to same as Benzine
  it('Hybride and Benzine return the same price', () => {
    expect(price('NH', 'Hybride', 1651)).toBe(price('NH', 'Benzine', 1651));
  });

  // Province spread at the 1651 bracket: NH has lowest, ZH highest
  it('ZH Benzine 1651 > DR Benzine 1651 (ZH has highest opcenten)', () => {
    expect(price('ZH', 'Benzine', 1651)).toBeGreaterThan(price('DR', 'Benzine', 1651));
  });

  it('NH Benzine 1651 <= all other provinces (NH has lowest opcenten)', () => {
    const nhPrice = price('NH', 'Benzine', 1651);
    ['DR', 'FL', 'FR', 'GL', 'GR', 'LI', 'NB', 'OV', 'UT', 'ZL', 'ZH'].forEach(p => {
      expect(price(p, 'Benzine', 1651)).toBeGreaterThanOrEqual(nhPrice);
    });
  });

  // Weight basis migration (effective 1 July 2026): massa_rijklaar is ~100 kg above the old
  // massa_ledig_voertuig basis, so the same physical vehicle must produce the same euro amount.
  it('NH Benzine 1100 kg rijklaar returns the same quarterly amount as 1000 kg did before the change', () => {
    expect(price('NH', 'Benzine', 1100)).toBe(119);
  });

  // FUEL_CONFIG sanity
  it('FUEL_CONFIG has entries for all supported fuel types', () => {
    ['Benzine', 'Diesel', 'Elektrisch', 'LPG3', 'LPG', 'Hybride'].forEach(fuel => {
      expect(FUEL_CONFIG[fuel]).toBeDefined();
    });
  });
});

describe('isOldtimerExempt (oldtimerregeling: 40 years or older = exempt)', () => {
  const now = new Date(2026, 7, 5); // 2026-08-05, matches "today" during development

  it('a car registered exactly 40 years ago today is exempt', () => {
    expect(isOldtimerExempt('19860805', now)).toBe(true);
  });

  it('a car registered 41 years ago is exempt', () => {
    expect(isOldtimerExempt('19850101', now)).toBe(true);
  });

  it('a car that turns 40 tomorrow is not yet exempt', () => {
    expect(isOldtimerExempt('19860806', now)).toBe(false);
  });

  it('a car registered 10 years ago is not exempt', () => {
    expect(isOldtimerExempt('20160101', now)).toBe(false);
  });

  it('missing registration date is not exempt', () => {
    expect(isOldtimerExempt(undefined, now)).toBe(false);
    expect(isOldtimerExempt('', now)).toBe(false);
  });

  it('malformed registration date is not exempt', () => {
    expect(isOldtimerExempt('1986', now)).toBe(false);
  });
});
