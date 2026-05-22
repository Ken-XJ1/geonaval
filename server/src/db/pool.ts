import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString
    ? { rejectUnauthorized: false }
    : undefined,
});

pool
  .connect()
  .then((client) => {
    console.log('Conectado a PostgreSQL correctamente');
    client.release();
  })
  .catch((err) => {
    console.error('Error conectando a PostgreSQL:', err.message);
    console.error(
      'Verifica DATABASE_URL en Render y que el schema.sql esté aplicado.'
    );
  });

export default pool;
