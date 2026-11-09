// Minimal typings for page-flip 2.0.7, which ships without declarations
declare module 'page-flip' {
  export interface FlipSetting {
    startPage: number;
    size: 'fixed' | 'stretch';
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    drawShadow: boolean;
    flippingTime: number;
    usePortrait: boolean;
    autoSize: boolean;
    maxShadowOpacity: number;
    showCover: boolean;
    mobileScrollSupport: boolean;
    showPageCorners: boolean;
    disableFlipByClick: boolean;
  }

  export interface WidgetEvent<T = unknown> {
    data: T;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(block: HTMLElement, setting: Partial<FlipSetting>);
    loadFromImages(imagesHref: string[]): void;
    destroy(): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    turnToPage(page: number): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    getOrientation(): 'portrait' | 'landscape';
    on(eventName: 'flip', callback: (e: WidgetEvent<number>) => void): PageFlip;
    on(eventName: 'changeOrientation', callback: (e: WidgetEvent<'portrait' | 'landscape'>) => void): PageFlip;
    on(eventName: 'init', callback: (e: WidgetEvent<{ page: number; mode: 'portrait' | 'landscape' }>) => void): PageFlip;
  }
}
