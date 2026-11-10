// Add version column for optimistic concurrency control (Optimistic Locking)
exports.up = (pgm) => {
  pgm.addColumn('product', {
    version: {
      type: 'integer',
      notNull: true,
      default: 1
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('product', 'version');
};
