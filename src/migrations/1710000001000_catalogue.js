exports.up = (pgm) => {
  pgm.createTable('catalogue', {
    catalogue_id: { type: 'uuid', primaryKey: true },
    catalogue_name: { type: 'text', notNull: true },
    catalogue_pdf: { type: 'text' },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    create_by: { type: 'text', notNull: true },
    update_by: { type: 'text', notNull: true }
  });
  pgm.createIndex('catalogue', 'catalogue_name');
};

exports.down = (pgm) => pgm.dropTable('catalogue');
