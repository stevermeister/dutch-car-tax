import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(private _iconRegistry: MatIconRegistry, private _sanitizer: DomSanitizer) {

    this._iconRegistry.addSvgIcon('france', this._sanitizer.bypassSecurityTrustResourceUrl('./assets/flags/1x1/fr.svg'));
    this._iconRegistry.addSvgIcon('great_britain', this._sanitizer.bypassSecurityTrustResourceUrl('./assets/flags/1x1/gb.svg'));
    this._iconRegistry.addSvgIcon('germany', this._sanitizer.bypassSecurityTrustResourceUrl('./assets/flags/1x1/de.svg'));
  }

}


