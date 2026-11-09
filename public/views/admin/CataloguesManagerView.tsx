import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, Check, FileText, LoaderCircle, Pencil, Plus, RefreshCw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { Catalogue } from './types';
import { dateLabel, request, token } from './api';
import { Field } from '../../components/admin/Field';
import { Notice } from '../../components/admin/Notice';
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal';

export function CataloguesManager() {
  const [items, setItems] = useState<Catalogue[]>([]);
  const [name, setName] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState('catalogue_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
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

  const [editingCatalogue, setEditingCatalogue] = useState<Catalogue | null>(null);
  const [editName, setEditName] = useState('');
  const [editPdf, setEditPdf] = useState<File | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deletingCatalogue, setDeletingCatalogue] = useState<Catalogue | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        order,
        ...(search.trim() ? { search: search.trim() } : {})
      });
      const result = await request<{ data: Catalogue[]; total: number; totalPages: number }>(`/api/v1/catalogue?${params}`);
      setItems(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, order, search]);

  useEffect(() => { void load(); }, [load]);

  const closeEditModal = useCallback(() => {
    if (modalSaving) return;
    setEditingCatalogue(null);
    setEditName('');
    setEditPdf(null);
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!editingCatalogue) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingCatalogue, closeEditModal]);

  function startEdit(item: Catalogue) {
    setEditingCatalogue(item);
    setEditName(item.catalogue_name);
    setEditPdf(null);
    setModalError('');
    setError('');
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = new FormData();
      body.append('catalogue_name', name.trim());
      if (pdf) body.append('catalogue_pdf_file', pdf);
      await request('/api/v1/catalogue', { method: 'POST', body });
      setSuccess('Catalogue created.');
      setName('');
      setPdf(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCatalogue) return;
    setModalSaving(true);
    setModalError('');
    try {
      const body = new FormData();
      body.append('catalogue_id', editingCatalogue.catalogue_id);
      body.append('catalogue_name', editName.trim());
      if (editPdf) body.append('catalogue_pdf_file', editPdf);
      await request('/api/v1/catalogue', { method: 'PUT', body });
      setSuccess(`Catalogue “${editName.trim()}” updated.`);
      closeEditModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCatalogue) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/catalogue', {
        method: 'DELETE',
        body: JSON.stringify({ catalogue_id: deletingCatalogue.catalogue_id })
      });
      setSuccess('Catalogue deleted.');
      const isLastOnPage = items.length === 1 && page > 1;
      setDeletingCatalogue(null);
      if (isLastOnPage) setPage(page - 1);
      else await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openPdf(item: Catalogue) {
    try {
      const response = await fetch(`/api/v1/catalogue/${item.catalogue_id}/pdf`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!response.ok) throw new Error('The catalogue PDF could not be opened.');
      const url = URL.createObjectURL(await response.blob());
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="ac-page">
      <div className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">CATALOG MANAGEMENT</div>
          <h1>Catalogues</h1>
          <p>Upload and manage catalogue PDF files.</p>
        </div>
        <div className="ac-heading-count">
          <FileText size={16} />{total} catalogues
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <form className="ac-form-card ac-resource-form" onSubmit={submitCreate}>
          <div className="ac-card-heading">
            <div className="ac-card-icon red"><FileText size={17} /></div>
            <div>
              <h2>Add a catalogue</h2>
              <p>Add a catalogue and its PDF document.</p>
            </div>
          </div>
          <Field label="Catalogue name *">
            <input className="ac-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Safety Footwear Catalogue" />
          </Field>
          <Field label="Catalogue PDF" hint={pdf?.name || 'PDF · max 30 MiB'}>
            <label className="ac-upload-drop">
              <UploadCloud size={17} />
              <span>{pdf?.name || 'Upload PDF'}</span>
              <input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
            </label>
            {pdf && (
              <button type="button" className="ac-button ac-button-quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setPdf(null)}>
                <X size={13} /> Cancel selected PDF
              </button>
            )}
          </Field>
          <div className="ac-resource-actions">
            <button className="ac-button ac-button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Plus size={15} />}Create catalogue
            </button>
          </div>
        </form>
        <section className="ac-table-card ac-resource-table">
          <div className="ac-table-title">
            <div>
              <h2>All catalogues</h2>
              <p>Sorted and paginated catalogue records.</p>
            </div>
            <button className="ac-button ac-button-quiet" onClick={() => void load()} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="ac-catalogue-toolbar">
            <div className="ac-search">
              <Search size={16} />
              <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search catalogue name" />
            </div>
            <label className="ac-catalogue-sort">
              <span>Sort</span>
              <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
                <option value="catalogue_name">Name</option>
                <option value="createTs">Created</option>
                <option value="updateTs">Updated</option>
                <option value="catalogue_id">ID</option>
              </select>
            </label>
            <button className="ac-button ac-button-quiet" onClick={() => setOrder((value) => value === 'asc' ? 'desc' : 'asc')}>
              {order === 'asc' ? 'A–Z ↑' : 'Z–A ↓'}
            </button>
          </div>
          {loading ? (
            <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading catalogues…</div>
          ) : items.length ? (
            <>
              <div className="ac-table-scroll">
                <table className="ac-table">
                  <thead><tr><th>Catalogue</th><th>PDF</th><th>Updated</th><th>Created by</th><th /></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.catalogue_id}>
                        <td>
                          <div className="ac-product-cell">
                            <span className="ac-series-symbol"><FileText size={16} /></span>
                            <span><strong>{item.catalogue_name}</strong><small><code>{item.catalogue_id}</code></small></span>
                          </div>
                        </td>
                        <td>
                          {item.catalogue_pdf ? (
                            <button className="ac-download-button" onClick={() => void openPdf(item)}>
                              <ArrowDownToLine size={14} />View PDF
                            </button>
                          ) : (
                            <span className="ac-muted">No PDF</span>
                          )}
                        </td>
                        <td><span className="ac-date">{dateLabel(item.updateTs)}</span><small className="ac-audit">{item.updateBy}</small></td>
                        <td>{item.createBy}</td>
                        <td>
                          <div className="ac-row-actions">
                            <button className="ac-icon-button" title="Edit catalogue" onClick={() => startEdit(item)}><Pencil size={15} /></button>
                            <button className="ac-icon-button danger" title="Delete catalogue" onClick={() => { setDeletingCatalogue(item); setDeleteError(''); }}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ac-pagination">
                <span>Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}</span>
                <div>
                  <button className="ac-button ac-button-quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page} of {Math.max(1, totalPages)}</span>
                  <button className="ac-button ac-button-quiet" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="ac-empty compact">
              <FileText size={23} />
              <strong>{search ? 'No matching catalogues' : 'No catalogues yet'}</strong>
              <span>{search ? 'Try another search.' : 'Add a catalogue and upload its PDF.'}</span>
            </div>
          )}
        </section>
      </div>

      {editingCatalogue && (
        <div className="ac-edit-modal-backdrop" onClick={closeEditModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon red" style={{ width: 28, height: 28 }}>
                  <FileText size={15} />
                </div>
                <h3>Edit catalogue</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closeEditModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={submitEdit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Catalogue ID" hint="Identifier is assigned automatically.">
                  <input className="ac-input" disabled value={editingCatalogue.catalogue_id} />
                </Field>
                <Field label="Catalogue name *">
                  <input className="ac-input" required value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                </Field>
                <Field label="Catalogue PDF" hint={editPdf?.name || (editingCatalogue.catalogue_pdf ? 'Existing PDF on server' : 'PDF · max 30 MiB')}>
                  {editingCatalogue.catalogue_pdf && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="ac-file-badge"><FileText size={14} />Current: {editingCatalogue.catalogue_pdf.split('/').pop()}</span>
                      <button type="button" className="ac-view-button" onClick={() => void openPdf(editingCatalogue)} title="View current PDF">
                        View
                      </button>
                    </div>
                  )}
                  <label className="ac-upload-drop">
                    <UploadCloud size={17} />
                    <span>{editPdf?.name || (editingCatalogue.catalogue_pdf ? 'Replace PDF' : 'Upload PDF')}</span>
                    <input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setEditPdf(e.target.files?.[0] ?? null)} />
                  </label>
                  {editPdf && (
                    <button type="button" className="ac-button ac-button-quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setEditPdf(null)}>
                      <X size={13} /> Cancel selected PDF
                    </button>
                  )}
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
        open={Boolean(deletingCatalogue)}
        title="Delete catalogue"
        itemName={deletingCatalogue?.catalogue_name || ''}
        description="Are you sure you want to delete this catalogue? This action cannot be undone."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingCatalogue(null); }}
      />
    </div>
  );
}
export default CataloguesManager;
