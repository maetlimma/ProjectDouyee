exports.up = (pgm) => {
  pgm.createTable('series_type', {
    series_code: { type: 'text', primaryKey: true }, series_name: { type: 'text', notNull: true },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    create_by: { type: 'text', notNull: true }, update_by: { type: 'text', notNull: true }
  });
  pgm.createTable('certificate_type', {
    certificate_code: { type: 'text', primaryKey: true }, image: { type: 'text' },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    create_by: { type: 'text', notNull: true }, update_by: { type: 'text', notNull: true }
  });
  pgm.createTable('product', {
    product_id: { type: 'uuid', primaryKey: true }, sku: { type: 'text', notNull: true, unique: true },
    product_name: { type: 'text', notNull: true }, series: { type: 'text', notNull: true, references: 'series_type(series_code)', onDelete: 'RESTRICT' },
    brand: { type: 'text' }, title: { type: 'text' }, main_image: { type: 'text' },
    other_image: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    specification: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    size_weights: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    datasheet_pdf: { type: 'text' }, certificate_pdf: { type: 'text' }, other: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    create_by: { type: 'text', notNull: true }, update_by: { type: 'text', notNull: true }
  });
  pgm.createTable('certificate_product', {
    product_id: { type: 'uuid', notNull: true, references: 'product(product_id)', onDelete: 'CASCADE' },
    certificate_code: { type: 'text', notNull: true, references: 'certificate_type(certificate_code)', onDelete: 'RESTRICT' },
    create_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    update_ts: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    create_by: { type: 'text', notNull: true }, update_by: { type: 'text', notNull: true }
  });
  pgm.addConstraint('certificate_product', 'certificate_product_pk', { primaryKey: ['product_id', 'certificate_code'] });
  pgm.createIndex('product', 'series');
  pgm.sql("INSERT INTO series_type (series_code,series_name,create_by,update_by) VALUES ('ESD Series','ESD Series','system','system'),('e9 Series','e9 Series','system','system'),('Basic Series','Basic Series','system','system')");
  pgm.sql("INSERT INTO certificate_type (certificate_code,create_by,update_by) VALUES ('CE','system','system'),('MS','system','system')");
};

exports.down = (pgm) => {
  pgm.dropTable('certificate_product'); pgm.dropTable('product');
  pgm.dropTable('certificate_type'); pgm.dropTable('series_type');
};
