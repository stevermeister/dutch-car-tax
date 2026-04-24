import { Directive, ElementRef, OnChanges, Input } from '@angular/core';

@Directive({
  standalone: false,
  selector: 'mat-slider'
})
export class TruckIconDirective implements OnChanges {

  @Input() volumeValue: number;

  constructor(private _el: ElementRef) {}

  ngOnChanges() {
    if (this.volumeValue) {
      const fontSize = 26 + this.volumeValue / 170;
      this._el.nativeElement.style.setProperty('--thumb-icon-size', `${fontSize}px`);
    }
  }
}
