import fs from 'fs';
import path from 'path';
import pool from './pool';

export async function ensureSchema() {
  try {
    await pool.query('SELECT 1 FROM usuarios LIMIT 1');
    return true;
  } catch {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('Schema SQL aplicado automáticamente');
      return true;
    } catch (err) {
      console.error('No se pudo aplicar schema:', (err as Error).message);
      return false;
    }
  }
}
