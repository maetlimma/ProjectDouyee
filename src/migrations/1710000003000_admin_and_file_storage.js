// Moves admin accounts and uploaded files into PostgreSQL so the app runs on hosts without a persistent disk.
exports.up = (pgm) => {
  pgm.createTable('admin_user', {
    admin_id: { type: 'uuid', primaryKey: true },
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
  });
  pgm.sql('CREATE UNIQUE INDEX admin_user_email_lower_idx ON admin_user (lower(email))');

  pgm.createTable('stored_file', {
    folder: { type: 'text', notNull: true, check: "folder IN ('images', 'documents')" },
    filename: { type: 'text', notNull: true },
    content_type: { type: 'text', notNull: true },
    size_bytes: { type: 'integer', notNull: true },
    data: { type: 'bytea', notNull: true },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('stored_file', 'stored_file_pkey', { primaryKey: ['folder', 'filename'] });
};

exports.down = (pgm) => {
  pgm.dropTable('stored_file');
  pgm.dropTable('admin_user');
};
