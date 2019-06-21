import { CookieService } from './cookie.service';

import { RouterModule, Routes } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkTableModule } from '@angular/cdk/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LOCALE_ID, NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { CarTaxFormComponent } from './car-tax-form/car-tax-form.component';
import { CarTaxService } from './car-tax-form/car-tax.service';
import { HttpClientModule } from '@angular/common/http';
import { TruckIconDirective } from './car-tax-form/truck-icon.directive';
import { TranslatePipe } from './translate.pipe';
import { TranslationService } from './translation.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [
  { path: ':language', component: CarTaxFormComponent }
];


@NgModule({
  declarations: [
    AppComponent,
    CarTaxFormComponent,
    TruckIconDirective,
    TranslatePipe
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
    RouterModule.forRoot(routes, { useHash: true })
  ],

  providers: [{ provide: LOCALE_ID, useValue: 'ru' }, CarTaxService, TranslationService, CookieService],
  bootstrap: [AppComponent]
})
export class AppModule { }
