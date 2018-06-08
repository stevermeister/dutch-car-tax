import { CookieService } from './cookie.service';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { TranslationService } from './translation.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(private _cookieService: CookieService, private _translationService: TranslationService) {

  }

  ngOnInit() {
    const language = this._cookieService.getCookie('language');
    this._translationService.switchLanguage(language);
    console.log(this._cookieService.getCookie('language'));
  }
  ngAfterViewInit() {
    // const language = this._cookieService.getCookie('language');
    // this._translationService.switchLanguage(language);
    // console.log(this._cookieService.getCookie('language'));
  }

}


