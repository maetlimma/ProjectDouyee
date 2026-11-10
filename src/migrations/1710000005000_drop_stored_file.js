// Revert to local disk storage for uploaded files; drops stored_file table.
exports.up = (pgm) => {
  pgm.dropTable('stored_file', { ifExists: true, cascade: true });
};

exports.down = (pgm) => {
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
