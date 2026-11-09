import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Award, Check, Eye, Image as ImageIcon, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';
import { Certificate } from './types';
import { dateLabel, request } from './api';
import { Field } from '../../components/admin/Field';
import { Notice } from '../../components/admin/Notice';
import { AuthImage } from '../../components/admin/AuthImage';
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal';

export function CertificatesManager() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [code, setCode] = useState('');
  const [image, setImage] = useState<File | null>(null);
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

  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deletingCert, setDeletingCert] = useState<Certificate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [previewModal, setPreviewModal] = useState<{ path?: string; file?: File; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await request<Certificate[]>('/api/v1/certificate'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const closeEditModal = useCallback(() => {
    if (modalSaving) return;
    setEditingCert(null);
    setEditImage(null);
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!previewModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewModal]);

  useEffect(() => {
    if (!editingCert) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (previewModal) return;
      if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingCert, closeEditModal, previewModal]);

  function startEdit(item: Certificate) {
    setEditingCert(item);
    setEditImage(null);
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
      body.append('certificate_code', code.trim());
      if (image) body.append('image_file', image);
      await request('/api/v1/certificate', { method: 'POST', body });
      setSuccess('Certificate type created.');
      setCode('');
      setImage(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCert) return;
    setModalSaving(true);
    setModalError('');
    try {
      const body = new FormData();
      body.append('certificate_code', editingCert.certificate_code);
      if (editImage) body.append('image_file', editImage);
      await request('/api/v1/certificate', { method: 'PUT', body });
      setSuccess(`Certificate “${editingCert.certificate_code}” updated.`);
      closeEditModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCert) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/certificate', {
        method: 'DELETE',
        body: JSON.stringify({ certificate_code: deletingCert.certificate_code })
      });
      setSuccess('Certificate type deleted.');
      setDeletingCert(null);
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
          <h1>Certificates</h1>
          <p>Manage CertificateType records and link them to products.</p>
        </div>
        <div className="ac-heading-count">
          <Award size={16} />{items.length} types
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <form className="ac-form-card ac-resource-form" onSubmit={submitCreate}>
          <div className="ac-card-heading">
            <div className="ac-card-icon amber"><Award size={17} /></div>
            <div>
              <h2>Add a certificate type</h2>
              <p>Certificate code is used in product links.</p>
            </div>
          </div>
          <Field label="Certificate code *" hint="For example CE or MS.">
            <input className="ac-input" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CE" />
          </Field>
          <Field label="Certificate image" hint={image?.name || 'PNG, JPG, WebP or AVIF · max 12 MiB'}>
            <label className="ac-upload-drop">
              <UploadCloud size={17} />
              <span>{image?.name || 'Upload image'}</span>
              <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </label>
            {image && (
              <button type="button" className="ac-button ac-button-quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setImage(null)}>
                <X size={13} /> Cancel selected image
              </button>
            )}
          </Field>
          <div className="ac-resource-actions">
            <button className="ac-button ac-button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Plus size={15} />}Create certificate
            </button>
          </div>
        </form>
        <section className="ac-certificate-grid-wrap">
          <div className="ac-table-title">
            <div>
              <h2>Certificate types</h2>
              <p>Linked to products through CertificateProduct.</p>
            </div>
            <button className="ac-button ac-button-quiet" onClick={() => void load()}>
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading certificates…</div>
          ) : items.length ? (
            <div className="ac-certificate-grid">
              {items.map((item) => (
                <article className="ac-certificate-card" key={item.certificate_code}>
                  <div className="ac-certificate-image">
                    <AuthImage path={item.image} alt={`${item.certificate_code} certificate`} />
                  </div>
                  <div className="ac-certificate-info">
                    <span className="ac-eyebrow">CERTIFICATE CODE</span>
                    <h3>{item.certificate_code}</h3>
                    <small>Updated {dateLabel(item.update_ts)} · {item.update_by}</small>
                    <div className="ac-row-actions">
                      <button className="ac-icon-button" title="Edit certificate" onClick={() => startEdit(item)}><Pencil size={15} /></button>
                      <button className="ac-icon-button danger" title="Delete certificate" onClick={() => { setDeletingCert(item); setDeleteError(''); }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ac-empty compact">
              <Award size={23} />
              <strong>No certificate types</strong>
              <span>Add a certificate type for product records.</span>
            </div>
          )}
        </section>
      </div>

      {editingCert && (
        <div className="ac-edit-modal-backdrop" onClick={closeEditModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon amber" style={{ width: 28, height: 28 }}>
                  <Award size={15} />
                </div>
                <h3>Edit certificate type</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closeEditModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={submitEdit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Certificate code" hint="Certificate code is the primary key and cannot be changed.">
                  <input className="ac-input" disabled value={editingCert.certificate_code} />
                </Field>
                <Field label="Certificate image" hint={editImage?.name || (editingCert.image ? 'Existing image on server' : 'PNG, JPG, WebP or AVIF · max 12 MiB')}>
                  {editingCert.image && !editImage && (
                    <div className="ac-edit-modal-cert-current">
                      <button
                        type="button"
                        className="ac-edit-modal-cert-thumb"
                        onClick={() => setPreviewModal({ path: editingCert.image ?? undefined, title: `${editingCert.certificate_code} certificate` })}
                        title="Click to zoom image"
                      >
                        <AuthImage path={editingCert.image} alt={editingCert.certificate_code} />
                        <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2e4337' }}>Current image file</div>
                        <div style={{ fontSize: '10px', color: '#68786f', wordBreak: 'break-all' }}>{editingCert.image}</div>
                      </div>
                      <button
                        type="button"
                        className="ac-view-button"
                        onClick={() => setPreviewModal({ path: editingCert.image ?? undefined, title: `${editingCert.certificate_code} certificate` })}
                        title="View full image"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </div>
                  )}
                  {editImage && (
                    <div className="ac-edit-modal-cert-current">
                      <button
                        type="button"
                        className="ac-edit-modal-cert-thumb"
                        onClick={() => setPreviewModal({ file: editImage, title: editImage.name })}
                        title="Click to preview new image"
                      >
                        <img src={URL.createObjectURL(editImage)} alt={editImage.name} />
                        <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2e4337' }}>New image selected</div>
                        <div style={{ fontSize: '10px', color: '#68786f', wordBreak: 'break-all' }}>{editImage.name}</div>
                      </div>
                      <button
                        type="button"
                        className="ac-view-button"
                        onClick={() => setPreviewModal({ file: editImage, title: editImage.name })}
                        title="View new image"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="ac-icon-button danger"
                        onClick={() => setEditImage(null)}
                        title="Cancel new image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <label className="ac-upload-drop">
                    <UploadCloud size={17} />
                    <span>{editImage?.name || (editingCert.image ? 'Replace image' : 'Upload image')}</span>
                    <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setEditImage(e.target.files?.[0] ?? null)} />
                  </label>
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

      {previewModal && (
        <div className="ac-image-preview-modal-backdrop" onClick={() => setPreviewModal(null)}>
          <div className="ac-image-preview-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-image-preview-modal-header">
              <div className="ac-image-preview-modal-title">
                <ImageIcon size={16} />
                <span>{previewModal.title}</span>
              </div>
              <button
                type="button"
                className="ac-image-preview-modal-close"
                onClick={() => setPreviewModal(null)}
                title="Close preview (Esc)"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ac-image-preview-modal-body">
              {previewModal.file ? (
                <img
                  src={URL.createObjectURL(previewModal.file)}
                  alt={previewModal.title}
                  className="ac-image-preview-modal-img"
                />
              ) : (
                <AuthImage
                  path={previewModal.path}
                  alt={previewModal.title}
                  className="ac-image-preview-modal-img"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletingCert)}
        title="Delete certificate type"
        itemName={deletingCert?.certificate_code || ''}
        description="Are you sure you want to delete this certificate type? Linked products must be unassigned first."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingCert(null); }}
      />
    </div>
  );
}
export default CertificatesManager;
