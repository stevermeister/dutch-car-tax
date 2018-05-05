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

    this._renderer.setStyle(this._el.nativeElement, 'font', 'normal normal normal 30px/1 FontAwesome');
  }

  increaseIconSize(value: number): void {

    // if (value > this.previousValue) {
    //   this.carSize = this.carSize  +  0.5;
    //   this._renderer.setStyle(this._el.nativeElement, 'font-size', this.carSize + 'px');
    //   this.previousValue = value;
    //   return;
    // } else {
    //   this.carSize = this.carSize  -  0.5;
    //   this._renderer.setStyle(this._el.nativeElement, 'font-size', this.carSize + 'px');
    //   this.previousValue = value;
    // }

    this._renderer.setStyle(this._el.nativeElement, 'font-size', 30 + value / 150 + 'px');

  }

}
