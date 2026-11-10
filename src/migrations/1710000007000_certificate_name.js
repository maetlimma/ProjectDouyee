// Add certificate_name to certificate_type table
exports.up = (pgm) => {
  pgm.addColumn('certificate_type', {
    certificate_name: {
      type: 'text'
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('certificate_type', 'certificate_name');
};
