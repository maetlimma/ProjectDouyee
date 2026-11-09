import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Check, Layers3, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Series } from './types';
import { dateLabel, initials, request } from './api';
import { Field } from '../../components/admin/Field';
import { Notice } from '../../components/admin/Notice';
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal';

export function SeriesManager() {
  const [items, setItems] = useState<Series[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [editName, setEditName] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deletingSeries, setDeletingSeries] = useState<Series | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await request<Series[]>('/api/v1/series'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const closeEditModal = useCallback(() => {
    if (modalSaving) return;
    setEditingSeries(null);
    setEditName('');
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!editingSeries) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSeries, closeEditModal]);

  function startEdit(item: Series) {
    setEditingSeries(item);
    setEditName(item.series_name);
    setModalError('');
    setError('');
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await request('/api/v1/series', {
        method: 'POST',
        body: JSON.stringify({ series_code: code.trim(), series_name: name.trim() })
      });
      setSuccess('Series created.');
      setCode('');
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingSeries) return;
    setModalSaving(true);
    setModalError('');
    try {
      await request('/api/v1/series', {
        method: 'PUT',
        body: JSON.stringify({ series_code: editingSeries.series_code, series_name: editName.trim() })
      });
      setSuccess(`Series “${editingSeries.series_code}” updated.`);
      closeEditModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingSeries) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/series', {
        method: 'DELETE',
        body: JSON.stringify({ series_code: deletingSeries.series_code })
      });
      setSuccess('Series deleted.');
      setDeletingSeries(null);
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="ac-page">
      <div className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">REFERENCE DATA</div>
          <h1>Series</h1>
          <p>Manage SeriesType records used to group and classify products.</p>
        </div>
        <div className="ac-heading-count">
          <Layers3 size={16} />{items.length} series
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <form className="ac-form-card ac-resource-form" onSubmit={submitCreate}>
          <div className="ac-card-heading">
            <div className="ac-card-icon green"><Layers3 size={17} /></div>
            <div>
              <h2>Add a series</h2>
              <p>Series code is the product foreign key.</p>
            </div>
          </div>
          <Field label="Series code *" hint="Use the API code, for example “ESD Series”.">
            <input className="ac-input" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ESD Series" />
          </Field>
          <Field label="Series name *">
            <input className="ac-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
          </Field>
          <div className="ac-resource-actions">
            <button className="ac-button ac-button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Plus size={15} />}Create series
            </button>
          </div>
        </form>
        <section className="ac-table-card ac-resource-table">
          <div className="ac-table-title">
            <div>
              <h2>All series</h2>
              <p>Products reference the series code shown here.</p>
            </div>
            <button className="ac-button ac-button-quiet" onClick={() => void load()}>
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading series…</div>
          ) : items.length ? (
            <div className="ac-table-scroll">
              <table className="ac-table">
                <thead><tr><th>Series</th><th>Code</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.series_code}>
                      <td>
                        <div className="ac-product-cell">
                          <span className="ac-series-symbol">{initials(item.series_name)}</span>
                          <span><strong>{item.series_name}</strong><small>Product grouping</small></span>
                        </div>
                      </td>
                      <td><code>{item.series_code}</code></td>
                      <td><span className="ac-date">{dateLabel(item.update_ts)}</span><small className="ac-audit">{item.update_by}</small></td>
                      <td>
                        <div className="ac-row-actions">
                          <button className="ac-icon-button" title="Edit series" onClick={() => startEdit(item)}><Pencil size={15} /></button>
                          <button className="ac-icon-button danger" title="Delete series" onClick={() => { setDeletingSeries(item); setDeleteError(''); }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ac-empty compact">
              <Layers3 size={23} />
              <strong>No series available</strong>
              <span>Add a series before creating products.</span>
            </div>
          )}
        </section>
      </div>

      {editingSeries && (
        <div className="ac-edit-modal-backdrop" onClick={closeEditModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon green" style={{ width: 28, height: 28 }}>
                  <Layers3 size={15} />
                </div>
                <h3>Edit series</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closeEditModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={submitEdit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Series code" hint="Series code is the primary key and cannot be changed.">
                  <input className="ac-input" disabled value={editingSeries.series_code} />
                </Field>
                <Field label="Series name *">
                  <input className="ac-input" required value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                </Field>
              </div>
              <div className="ac-edit-modal-actions">
                <button type="button" className="ac-button ac-button-quiet" onClick={closeEditModal} disabled={modalSaving}>
                  Cancel
                </button>
                <button type="submit" className="ac-button ac-button-primary" disabled={modalSaving}>
                  {modalSaving ? <LoaderCircle className="ac-spin" size={15} /> : <Check size={15} />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletingSeries)}
        title="Delete series"
        itemName={deletingSeries ? `${deletingSeries.series_name} (${deletingSeries.series_code})` : ''}
        description="Are you sure you want to delete this series? Series used by products cannot be deleted."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingSeries(null); }}
      />
    </div>
  );
}
export default SeriesManager;
