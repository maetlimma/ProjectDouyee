import { pool } from '../db/pool';

// Home page slider: an ordered list of product ids
export async function listHomeSlides() {
  const { rows } = await pool.query(
    `SELECT h.product_id, h.sort, h.update_ts, h.update_by, p.sku, p.title, p.main_image
     FROM home_slide h JOIN product p ON p.product_id = h.product_id
     ORDER BY h.sort, p.sku`
  );
  return rows;
}

export async function listHomeSlideIds(): Promise<string[]> {
  const { rows } = await pool.query('SELECT product_id FROM home_slide ORDER BY sort');
  return rows.map((row) => row.product_id);
}

// Replaces the whole slider in one transaction; unknown product ids are rejected by the foreign key
export async function replaceHomeSlides(productIds: string[], actor: string) {
  const ids = [...new Set(productIds)];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM home_slide');
    for (const [index, id] of ids.entries()) {
      await client.query(
        'INSERT INTO home_slide (product_id, sort, create_by, update_by) VALUES ($1, $2, $3, $3)',
        [id, index + 1, actor]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return listHomeSlides();
}
