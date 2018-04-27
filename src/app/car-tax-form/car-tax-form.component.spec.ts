import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CarTaxFormComponent } from './car-tax-form.component';

describe('CarTaxFormComponent', () => {
  let component: CarTaxFormComponent;
  let fixture: ComponentFixture<CarTaxFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CarTaxFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CarTaxFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
