// Records which seed products were inserted, so products deleted by an admin are not re-created on the next start.
exports.up = (pgm) => {
  pgm.createTable('product_seed', {
    sku: { type: 'text', primaryKey: true },
    seed_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => pgm.dropTable('product_seed');
