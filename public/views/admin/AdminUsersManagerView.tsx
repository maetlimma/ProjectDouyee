import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, LoaderCircle, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react';
import { AdminAccount } from './types';
import { dateLabel, initials, request } from './api';
import { Field } from '../../components/admin/Field';
import { Notice } from '../../components/admin/Notice';
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal';

export function AdminUsersManager() {
  const [items, setItems] = useState<AdminAccount[]>([]);
  const [currentAdminEmail, setCurrentAdminEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Create admin modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit / Change password modal state
  const [changingAdmin, setChangingAdmin] = useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete modal state
  const [deletingAdmin, setDeletingAdmin] = useState<AdminAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [adminsData, meData] = await Promise.all([
        request<AdminAccount[]>('/api/v1/admins'),
        request<{ email?: string }>('/api/auth/me').catch(() => ({ email: '' }))
      ]);
      setItems(adminsData);
      if (meData?.email) setCurrentAdminEmail(meData.email);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreateModal = () => {
    setCreateEmail('');
    setCreatePassword('');
    setCreateConfirmPassword('');
    setCreateError('');
    setCreateOpen(true);
  };

  const closeCreateModal = useCallback(() => {
    if (createSaving) return;
    setCreateOpen(false);
    setCreateEmail('');
    setCreatePassword('');
    setCreateConfirmPassword('');
    setCreateError('');
  }, [createSaving]);

  useEffect(() => {
    if (!createOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCreateModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createOpen, closeCreateModal]);

  const closePasswordModal = useCallback(() => {
    if (modalSaving) return;
    setChangingAdmin(null);
    setNewPassword('');
    setConfirmNewPassword('');
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!changingAdmin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePasswordModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changingAdmin, closePasswordModal]);

  function startEdit(item: AdminAccount) {
    if (item.email.toLowerCase() !== currentAdminEmail.toLowerCase()) {
      setError('You can only change your own password.');
      return;
    }
    setChangingAdmin(item);
    setNewPassword('');
    setConfirmNewPassword('');
    setModalError('');
    setError('');
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanEmail = createEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setCreateError('Please provide a corporate email.');
      return;
    }
    if (createPassword.length < 8) {
      setCreateError('Password must be at least 8 characters long.');
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateError('Passwords do not match.');
      return;
    }

    setCreateSaving(true);
    setCreateError('');
    try {
      await request('/api/v1/admins', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail, password: createPassword })
      });
      setSuccess(`Admin account "${cleanEmail}" created successfully.`);
      closeCreateModal();
      await load();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreateSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!changingAdmin) return;
    if (newPassword.length < 8) {
      setModalError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setModalError('Passwords do not match.');
      return;
    }

    setModalSaving(true);
    setModalError('');
    try {
      await request('/api/v1/admins', {
        method: 'PUT',
        body: JSON.stringify({ admin_id: changingAdmin.adminId, password: newPassword })
      });
      setSuccess(`Password for "${changingAdmin.email}" updated.`);
      closePasswordModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingAdmin) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/admins', {
        method: 'DELETE',
        body: JSON.stringify({ admin_id: deletingAdmin.adminId })
      });
      setSuccess(`Admin account "${deletingAdmin.email}" deleted.`);
      setDeletingAdmin(null);
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
          <div className="ac-eyebrow">SYSTEM & SECURITY</div>
          <h1>Admin Users</h1>
          <p>Manage operator accounts, access privileges and authentication credentials.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ac-heading-count">
            <Users size={16} />{items.length} admins
          </div>
          <button
            type="button"
            className="ac-button ac-button-primary"
            onClick={openCreateModal}
          >
            <Plus size={15} /> Add admin user
          </button>
        </div>
      </div>

      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />

      <section className="ac-table-card">
        <div className="ac-table-title">
          <div>
            <h2>All admin users</h2>
            <p>Operator accounts with access to the management engine.</p>
          </div>
          <button
            type="button"
            className="ac-button ac-button-quiet"
            onClick={() => void load()}
            title="Refresh list"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="ac-loading">
            <LoaderCircle className="ac-spin" size={20} />Loading admin users…
          </div>
        ) : items.length ? (
          <div className="ac-table-scroll">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Last Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelf = item.email.toLowerCase() === currentAdminEmail.toLowerCase();
                  return (
                    <tr key={item.adminId}>
                      <td>
                        <div className="ac-product-cell">
                          <span className="ac-series-symbol">{initials(item.email)}</span>
                          <span>
                            <strong>{item.email}</strong>
                            {isSelf && (
                              <span className="ac-status-pill green" style={{ marginLeft: 6 }}>You</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="ac-date">{dateLabel(item.updateTs)}</span>
                        <small className="ac-audit">Created {dateLabel(item.createTs)}</small>
                      </td>
                      <td>
                        <div className="ac-row-actions">
                          {isSelf && (
                            <button
                              className="ac-icon-button"
                              title="Change your password"
                              onClick={() => startEdit(item)}
                            >
                              <KeyRound size={15} />
                            </button>
                          )}
                          <button
                            className="ac-icon-button danger"
                            title={items.length <= 1 ? 'Cannot delete the only remaining admin' : 'Delete admin'}
                            onClick={() => { setDeletingAdmin(item); setDeleteError(''); }}
                            disabled={items.length <= 1}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ac-empty compact">
            <Users size={23} />
            <strong>No admin users available</strong>
            <span>Add an administrator to grant access.</span>
            <button
              type="button"
              className="ac-button ac-button-primary"
              style={{ marginTop: 12 }}
              onClick={openCreateModal}
            >
              <Plus size={15} /> Add an admin user
            </button>
          </div>
        )}
      </section>

      {/* Add Admin User Modal */}
      {createOpen && (
        <div className="ac-edit-modal-backdrop" onClick={closeCreateModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon blue" style={{ width: 28, height: 28 }}>
                  <Users size={15} />
                </div>
                <h3>Add an admin user</h3>
              </div>
              <button
                type="button"
                className="ac-edit-modal-close"
                onClick={closeCreateModal}
                title="Close (Esc)"
              >
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={handleCreateSubmit}>
              <div className="ac-edit-modal-body">
                <Notice error={createError} inline />
                <Field
                  label="Corporate email *"
                  hint="Operator email will receive one-time code for login."
                >
                  <input
                    className="ac-input"
                    type="email"
                    required
                    autoFocus
                    placeholder="operator@douyee.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password * (min 8 characters)">
                  <input
                    className="ac-input"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Enter account password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                  />
                </Field>
                <Field label="Confirm password *">
                  <input
                    className="ac-input"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Re-enter password to confirm"
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                  />
                </Field>
              </div>
              <div className="ac-edit-modal-actions">
                <button
                  type="button"
                  className="ac-button ac-button-quiet"
                  onClick={closeCreateModal}
                  disabled={createSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ac-button ac-button-primary"
                  disabled={createSaving}
                >
                  {createSaving ? (
                    <LoaderCircle className="ac-spin" size={15} />
                  ) : (
                    <Plus size={15} />
                  )}
                  Create admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changingAdmin && (
        <div className="ac-edit-modal-backdrop" onClick={closePasswordModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon blue" style={{ width: 28, height: 28 }}>
                  <KeyRound size={15} />
                </div>
                <h3>Change your password</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closePasswordModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={handlePasswordSubmit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Your corporate email" hint="You can only change the password for your own operator account.">
                  <input className="ac-input" disabled value={changingAdmin.email} />
                </Field>
                <Field label="New password * (min 8 characters)">
                  <input
                    className="ac-input"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Confirm new password *">
                  <input
                    className="ac-input"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </Field>
              </div>
              <div className="ac-edit-modal-actions">
                <button type="button" className="ac-button ac-button-quiet" onClick={closePasswordModal} disabled={modalSaving}>
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

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={Boolean(deletingAdmin)}
        title="Delete admin user"
        itemName={deletingAdmin?.email ?? ''}
        description={
          deletingAdmin?.email.toLowerCase() === currentAdminEmail.toLowerCase()
            ? 'Warning: This is your currently active operator account. You will lose access once deleted.'
            : 'Are you sure you want to delete this operator account? Access will be immediately revoked.'
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingAdmin(null); }}
      />
    </div>
  );
}

export default AdminUsersManager;
