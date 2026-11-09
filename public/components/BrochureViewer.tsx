import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PageFlip } from 'page-flip';
import { ChevronLeft, ChevronRight, X, BookOpen } from 'lucide-react';
import { useI18n } from '../i18n';
import { BROCHURE_PAGES } from '../brochure.pages';
import { brochureIsLastView, brochurePageLabel, brochurePageUrls } from '../brochure.logic';

const PAGE_URLS = brochurePageUrls(BROCHURE_PAGES.count);

// Cover image that opens the safety shoes brochure as a page-flip book in a modal
const BrochureViewer: React.FC = () => {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(0);
  const [portrait, setPortrait] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const coverRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const t = (en: string, th: string, zh: string) => (lang === 'th' ? th : lang === 'zh' ? zh : en);

  // The book is created on first open and kept alive while hidden, because page-flip
  // never stops its animation loop and recreating it per open would leak loops.
  useEffect(() => {
    if (!mounted || !hostRef.current) return;
    // page-flip removes its root element on destroy, so give it one React does not own
    const block = document.createElement('div');
    hostRef.current.appendChild(block);

    const book = new PageFlip(block, {
      width: BROCHURE_PAGES.width,
      height: BROCHURE_PAGES.height,
      size: 'stretch',
      minWidth: 280,
      maxWidth: BROCHURE_PAGES.width,
      minHeight: 396,
      maxHeight: BROCHURE_PAGES.height,
      showCover: true,
      usePortrait: true,
      mobileScrollSupport: false,
      maxShadowOpacity: 0.5
    });
    book.on('flip', (e) => setPage(e.data));
    book.on('changeOrientation', (e) => setPortrait(e.data === 'portrait'));
    book.on('init', (e) => setPortrait(e.data.mode === 'portrait'));
    book.loadFromImages(PAGE_URLS);
    // The library fills the canvas white every frame; clear it instead so the
    // empty half beside the cover and back cover stays transparent.
    const internals = (book as unknown as { render?: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement; clear: () => void } }).render;
    if (internals) internals.clear = () => internals.ctx.clearRect(0, 0, internals.canvas.width, internals.canvas.height);
    bookRef.current = book;

    return () => {
      book.destroy();
      // Stop drawing on the detached canvas; the library's rAF loop cannot be cancelled
      const render = (book as unknown as { render?: { render: () => void } }).render;
      if (render) render.render = () => {};
      bookRef.current = null;
    };
  }, [mounted]);

  const close = useCallback(() => {
    setOpen(false);
    coverRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') bookRef.current?.flipNext();
      else if (e.key === 'ArrowLeft') bookRef.current?.flipPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const openBook = () => {
    setMounted(true);
    setOpen(true);
  };

  const title = t('Eurostat Safety Shoes Brochure', 'โบรชัวร์รองเท้าเซฟตี้ Eurostat', 'Eurostat 安全鞋手册');

  return (
    <>
      <button ref={coverRef} type="button" className="site-brochure-cover" onClick={openBook} aria-haspopup="dialog">
        <img src={PAGE_URLS[0]} alt={title} />
        <span className="site-brochure-hint">
          <BookOpen size={16} aria-hidden="true" />
          {t('Open brochure', 'เปิดโบรชัวร์', '打开手册')}
        </span>
      </button>

      {mounted && (
        <div
          className={`site-brochure-modal${open ? ' is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          aria-hidden={!open}
          inert={!open}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <button ref={closeRef} type="button" className="site-brochure-close" onClick={close} aria-label={t('Close', 'ปิด', '关闭')}>
            <X size={22} aria-hidden="true" />
          </button>
          <div ref={hostRef} className="site-brochure-host" />
          <div className="site-brochure-controls">
            <button type="button" onClick={() => bookRef.current?.flipPrev()} disabled={page === 0} aria-label={t('Previous page', 'หน้าก่อนหน้า', '上一页')}>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <span aria-live="polite">{brochurePageLabel(page, BROCHURE_PAGES.count, portrait)}</span>
            <button
              type="button"
              onClick={() => bookRef.current?.flipNext()}
              disabled={brochureIsLastView(page, BROCHURE_PAGES.count, portrait)}
              aria-label={t('Next page', 'หน้าถัดไป', '下一页')}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BrochureViewer;
