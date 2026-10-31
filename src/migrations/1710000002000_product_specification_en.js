exports.up = (pgm) => {
  pgm.addColumn('product', {
    specification_en: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") }
  });
};

exports.down = (pgm) => pgm.dropColumn('product', 'specification_en');
