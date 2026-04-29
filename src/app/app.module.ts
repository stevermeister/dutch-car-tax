import { RouterModule, Routes } from '@angular/router';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { CarTaxFormComponent } from './car-tax-form/car-tax-form.component';
import { CarTaxService } from './car-tax-form/car-tax.service';
import { HttpClientModule } from '@angular/common/http';
import { TruckIconDirective } from './car-tax-form/truck-icon.directive';

const routes: Routes = [
  { path: '', component: CarTaxFormComponent },
  { path: '**', component: CarTaxFormComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    CarTaxFormComponent,
    TruckIconDirective,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatSliderModule,
    HttpClientModule,
    MatButtonToggleModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RouterModule.forRoot(routes)
  ],
  providers: [CarTaxService, provideClientHydration(withEventReplay())],
  bootstrap: [AppComponent]
})
export class AppModule { }
