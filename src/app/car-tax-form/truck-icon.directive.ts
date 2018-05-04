import { Directive, Renderer2, ElementRef, AfterViewInit, OnChanges, Input } from '@angular/core';

@Directive({
  selector: 'mat-slider'
})
export class TruckIconDirective implements AfterViewInit, OnChanges {

  @Input() volumeValue: number;

  constructor(private _el: ElementRef, private _renderer: Renderer2, ) {
  }

  ngOnChanges() {
    this.increaseIconSize(this.volumeValue);
  }

  ngAfterViewInit() {

    this._renderer.setStyle(this._el.nativeElement, 'font', 'normal normal normal 54px/1 FontAwesome');
  }

  increaseIconSize(value: number): void {



    if (value < 1200) {
      return;
    }
    this._renderer.setStyle(this._el.nativeElement, 'font-size', value / 30 + 'px');

  }

}
