
import { RouterModule, Routes } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkTableModule } from '@angular/cdk/table';
import {
  MatAutocompleteModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatDialogModule,
  MatDividerModule,
  MatExpansionModule,
  MatGridListModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatSortModule,
  MatStepperModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,

} from '@angular/material';

import { NgModule, Component } from '@angular/core';
import { AppComponent } from './app.component';
import { CarTaxFormComponent } from './car-tax-form/car-tax-form.component';
import { CarTaxService } from './car-tax-form/car-tax.service';
import { HttpClientModule } from '@angular/common/http';
import { TruckIconDirective } from './car-tax-form/truck-icon.directive';

const routes: Routes = [
  { path: '', component: CarTaxFormComponent }
];


@NgModule({
  declarations: [
    AppComponent,
    CarTaxFormComponent,
    TruckIconDirective
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
    RouterModule.forRoot(routes)
  ],

  providers: [CarTaxService],
  bootstrap: [AppComponent]
})
export class AppModule { }
