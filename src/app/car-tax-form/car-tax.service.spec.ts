import { TestBed, inject } from '@angular/core/testing';

import { CarTaxService } from './car-tax.service';

describe('CarTaxService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CarTaxService]
    });
  });

  it('should be created', inject([CarTaxService], (service: CarTaxService) => {
    expect(service).toBeTruthy();
  }));
});
