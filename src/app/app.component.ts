import { CookieService } from './cookie.service';
import { Component, OnInit } from '@angular/core';
import { TranslationService } from './translation.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(private _cookieService: CookieService, private _translationService: TranslationService, private _router: Router) {

  }

  ngOnInit() {

    let language = this._cookieService.getCookie('language');

    // if (!language) {
    //   language = this._translationService.getCurrentLanguage();
    // }

    this._translationService.switchLanguage(language);
    this._router.config.push({ path: '', redirectTo: language, pathMatch: 'full' }, );


  }

}


