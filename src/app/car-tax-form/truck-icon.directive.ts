import { Directive, Renderer2, ElementRef, AfterViewInit, OnChanges, Input } from '@angular/core';

@Directive({
  selector: 'mat-slider'
})
export class TruckIconDirective implements AfterViewInit, OnChanges {

  @Input() volumeValue: number;
  private previousValue: number;
  private carSize = 30;

  constructor(private _el: ElementRef, private _renderer: Renderer2, ) {
  }

  ngOnChanges() {
    this.increaseIconSize(this.volumeValue);
  }

  ngAfterViewInit() {

    this._renderer.setStyle(this._el.nativeElement, 'font', 'normal normal normal 26px/1 FontAwesome');
  }

  increaseIconSize(value: number): void {

    this._renderer.setStyle(this._el.nativeElement, 'font-size', Math.round(26 + value / 170) + 'px');

  }

}
