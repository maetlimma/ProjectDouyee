exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE product
    ALTER COLUMN main_image TYPE jsonb
    USING CASE
      WHEN main_image IS NULL THEN '[]'::jsonb
      WHEN trim(main_image) = '' THEN '[]'::jsonb
      WHEN main_image LIKE '[%' THEN main_image::jsonb
      ELSE json_build_array(main_image)::jsonb
    END;
    ALTER TABLE product ALTER COLUMN main_image SET DEFAULT '[]'::jsonb;
    UPDATE product SET main_image = '[]'::jsonb WHERE main_image IS NULL;
    ALTER TABLE product ALTER COLUMN main_image SET NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE product ALTER COLUMN main_image DROP NOT NULL;
    ALTER TABLE product ALTER COLUMN main_image DROP DEFAULT;
    ALTER TABLE product
    ALTER COLUMN main_image TYPE text
    USING CASE
      WHEN jsonb_array_length(main_image) > 0 THEN main_image->>0
      ELSE NULL
    END;
  `);
};
