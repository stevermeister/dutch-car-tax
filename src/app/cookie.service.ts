import { Injectable } from '@angular/core';

@Injectable()
export class CookieService {

  constructor() { }

  setCookie(name: string, value: string, expireDays: number): void {

    const date: Date = new Date();
    date.setTime(date.getTime() + expireDays * 24 * 60 * 60 * 1000);

    document.cookie = `${name}=${value}; expires=${date.toUTCString()}`;
  }

  getCookie(name: string): string {

    const matches = document.cookie.match(new RegExp(
      '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
    ));

    return matches ? decodeURIComponent(matches[1]) : undefined;
  }


}


