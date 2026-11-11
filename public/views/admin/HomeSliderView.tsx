import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, GalleryHorizontal, GripVertical, LoaderCircle, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { Group, Product } from './types';
import { request } from './api';
import { Notice } from '../../components/admin/Notice';
import { AuthImage } from '../../components/admin/AuthImage';

type Slide = { product_id: string; sku: string; title: string | null; main_image: string[] | string | null };

const firstImage = (value: Slide['main_image']) => (Array.isArray(value) ? value[0] : value) ?? null;

// Picks which products appear in the public home page slider, and in what order
export function HomeSliderManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(timer);
  }, [success]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groups, current] = await Promise.all([request<Group[]>('/api/v1/product'), request<Slide[]>('/api/v1/home-slides')]);
      setProducts(groups.flatMap((g) => g.products));
      setSlides(current);
      setSaved(current.map((s) => s.product_id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const chosen = useMemo(() => new Set(slides.map((s) => s.product_id)), [slides]);
  const dirty = slides.map((s) => s.product_id).join() !== saved.join();
  const q = query.trim().toLowerCase();
  const available = products.filter(
    (p) => !chosen.has(p.product_id) && (!q || p.sku.toLowerCase().includes(q) || (p.title ?? '').toLowerCase().includes(q))
  );

  const add = (p: Product) => setSlides((list) => [...list, { product_id: p.product_id, sku: p.sku, title: p.title, main_image: p.main_image }]);
  const remove = (id: string) => setSlides((list) => list.filter((s) => s.product_id !== id));
  const move = (from: number, to: number) =>
    setSlides((list) => {
      if (to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  async function save() {
    setSaving(true);
    setError('');
    try {
      const result = await request<Slide[]>('/api/v1/home-slides', {
        method: 'PUT',
        body: JSON.stringify({ product_ids: slides.map((s) => s.product_id) })
      });
      setSlides(result);
      setSaved(result.map((s) => s.product_id));
      setSuccess(result.length ? 'Home slider saved.' : 'Home slider cleared; the site picks products automatically.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ac-page">
      <div className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">HOME PAGE</div>
          <h1>Home Slider</h1>
          <p>Choose the products shown in the home page slider after the brand slide. Leave it empty to show the first 5 products automatically.</p>
        </div>
        <div className="ac-heading-count">
          <GalleryHorizontal size={16} />{slides.length} slide{slides.length === 1 ? '' : 's'}
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <section className="ac-form-card ac-resource-form">
          <div className="ac-card-heading">
            <div className="ac-card-icon green"><Plus size={17} /></div>
            <div>
              <h2>Add products</h2>
              <p>Only products with a main image are shown on the site.</p>
            </div>
          </div>
          <label className="ac-slider-search">
            <Search size={14} />
            <input className="ac-input" placeholder="Search Model or title" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="ac-slider-pick">
            {loading ? (
              <div className="ac-loading"><LoaderCircle className="ac-spin" size={18} />Loading products…</div>
            ) : available.length ? (
              available.map((p) => (
                <button key={p.product_id} type="button" className="ac-slider-option" onClick={() => add(p)} title="Add to slider">
                  <AuthImage path={firstImage(p.main_image)} alt="" className="ac-slider-thumb" />
                  <span><strong>{p.sku}</strong><small>{p.title}</small></span>
                  <Plus size={15} />
                </button>
              ))
            ) : (
              <div className="ac-inline-empty">{q ? 'No matching products.' : 'Every product is already in the slider.'}</div>
            )}
          </div>
        </section>

        <section className="ac-table-card ac-resource-table">
          <div className="ac-table-title">
            <div>
              <h2>Slider order</h2>
              <p>Drag rows or use the arrows to reorder, then save.</p>
            </div>
            <div className="ac-row-actions">
              <button type="button" className="ac-button ac-button-quiet" onClick={() => void load()} disabled={saving} title="Discard changes and reload">
                <RefreshCw size={15} />
              </button>
              <button type="button" className="ac-button ac-button-primary" onClick={() => void save()} disabled={saving || !dirty}>
                {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Save size={15} />}Save
              </button>
            </div>
          </div>
          {slides.length ? (
            <ol className="ac-slider-list">
              {slides.map((s, i) => (
                <li
                  key={s.product_id}
                  className={`ac-slider-row ${dragIndex === i ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== i) {
                      move(dragIndex, i);
                      setDragIndex(i);
                    }
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <GripVertical size={16} className="ac-slider-grip" />
                  <span className="ac-slider-pos">{i + 1}</span>
                  <AuthImage path={firstImage(s.main_image)} alt="" className="ac-slider-thumb" />
                  <span className="ac-slider-name"><strong>{s.sku}</strong><small>{s.title}</small></span>
                  <div className="ac-row-actions">
                    <button type="button" className="ac-icon-button" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={15} /></button>
                    <button type="button" className="ac-icon-button" title="Move down" disabled={i === slides.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={15} /></button>
                    <button type="button" className="ac-icon-button danger" title="Remove from slider" onClick={() => remove(s.product_id)}><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="ac-empty compact">
              <GalleryHorizontal size={23} />
              <strong>Automatic</strong>
              <span>No products chosen; the home page shows the first 5 products with a photo.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomeSliderManager;
