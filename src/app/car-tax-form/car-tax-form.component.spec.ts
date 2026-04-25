import { calculatePrice, FUEL_CONFIG, FormValue } from './car-tax-form.component';
import { GRID } from '../../assets/data/grid';

describe('calculatePrice (2026 MRB rates)', () => {

  function price(provinceKey: string, fuelType: string, volume: number): number {
    return calculatePrice(GRID, { provinceKey, fuelType, volume } as FormValue);
  }

  // Reference value from belastingdienst.nl: Benzine, 1551–1650 kg = €280 (DR)
  it('DR Benzine 1551 = 280 (reference from belastingdienst.nl)', () => {
    expect(price('DR', 'Benzine', 1551)).toBe(280);
  });

  it('DR Benzine 1600 = 280 (same bracket as 1551)', () => {
    expect(price('DR', 'Benzine', 1600)).toBe(280);
  });

  it('DR Benzine 1650 = 280 (top of bracket)', () => {
    expect(price('DR', 'Benzine', 1650)).toBe(280);
  });

  it('DR Benzine 1651 moves to next bracket', () => {
    expect(price('DR', 'Benzine', 1651)).toBeGreaterThan(280);
  });

  // Bracket below 551
  it('NH Benzine 500 uses the lowest bracket', () => {
    expect(price('NH', 'Benzine', 500)).toBe(32);
  });

  it('NH Benzine 1 uses the lowest bracket', () => {
    expect(price('NH', 'Benzine', 1)).toBe(32);
  });

  // Bracket boundary at 551
  it('NH Benzine 550 still in lowest bracket', () => {
    expect(price('NH', 'Benzine', 550)).toBe(32);
  });

  it('NH Benzine 551 enters the 551–650 bracket', () => {
    expect(price('NH', 'Benzine', 551)).toBeGreaterThan(32);
  });

  // Bracket boundary: 1550 vs 1551
  it('NH Benzine 1550 is in the 1451–1550 bracket', () => {
    const at1550 = price('NH', 'Benzine', 1550);
    const at1551 = price('NH', 'Benzine', 1551);
    expect(at1551).toBeGreaterThan(at1550);
  });

  // All fuel types for NH at 1551
  it('NH Diesel 1551 matches grid', () => {
    expect(price('NH', 'Diesel', 1551)).toBe(535);
  });

  it('NH LPG3 1551 matches grid', () => {
    expect(price('NH', 'LPG3', 1551)).toBe(418);
  });

  it('NH LPG 1551 matches grid', () => {
    expect(price('NH', 'LPG', 1551)).toBe(566);
  });

  it('NH Elektrisch 1551 = 70% of Benzine', () => {
    const benzine = price('NH', 'Benzine', 1551);
    const electric = price('NH', 'Elektrisch', 1551);
    expect(electric).toBe(Math.round(benzine * 0.70));
  });

  // Legacy Hybride maps to same as Benzine
  it('Hybride and Benzine return the same price', () => {
    expect(price('NH', 'Hybride', 1551)).toBe(price('NH', 'Benzine', 1551));
  });

  // Province spread at the 1551 bracket: NH has lowest, ZH highest
  it('ZH Benzine 1551 > DR Benzine 1551 (ZH has highest opcenten)', () => {
    expect(price('ZH', 'Benzine', 1551)).toBeGreaterThan(price('DR', 'Benzine', 1551));
  });

  it('NH Benzine 1551 <= all other provinces (NH has lowest opcenten)', () => {
    const nhPrice = price('NH', 'Benzine', 1551);
    ['DR', 'FL', 'FR', 'GL', 'GR', 'LI', 'NB', 'OV', 'UT', 'ZL', 'ZH'].forEach(p => {
      expect(price(p, 'Benzine', 1551)).toBeGreaterThanOrEqual(nhPrice);
    });
  });

  // FUEL_CONFIG sanity
  it('FUEL_CONFIG has entries for all supported fuel types', () => {
    ['Benzine', 'Diesel', 'Elektrisch', 'LPG3', 'LPG', 'Hybride'].forEach(fuel => {
      expect(FUEL_CONFIG[fuel]).toBeDefined();
    });
  });
});
