// Products shown in the home page slider, in display order. Empty table means the site picks automatically.
exports.up = (pgm) => {
  pgm.createTable('home_slide', {
    product_id: { type: 'uuid', primaryKey: true, references: 'product(product_id)', onDelete: 'CASCADE' },
    sort: { type: 'integer', notNull: true },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    create_by: { type: 'text', notNull: true },
    update_by: { type: 'text', notNull: true }
  });
  pgm.createIndex('home_slide', 'sort');
};

exports.down = (pgm) => pgm.dropTable('home_slide');
