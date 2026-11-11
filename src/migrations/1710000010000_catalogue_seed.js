// Records which seed catalogues were inserted, so catalogues deleted by an admin are not re-created on the next start.
exports.up = (pgm) => {
  pgm.createTable('catalogue_seed', {
    catalogue_id: { type: 'uuid', primaryKey: true },
    seed_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => pgm.dropTable('catalogue_seed');
