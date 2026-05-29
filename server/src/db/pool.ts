import { Pool, types } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Evitar que el driver pg convierta TIMESTAMP a objeto Date con UTC
// Devuelve el string tal como está en la BD
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, (val: string) => val); // TIMESTAMP WITH TIME ZONE

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString
    ? { rejectUnauthorized: false }
    : undefined,
});

// Configurar zona horaria en CADA nueva conexión del pool
pool.on('connect', (client) => {
  client.query("SET timezone = 'America/Bogota'")
    .then(() => console.log('🕐 Zona horaria configurada: America/Bogota'))
    .catch((err) => console.error('Error configurando zona horaria:', err.message));
});

pool
  .connect()
  .then(async (client) => {
    console.log('✅ Conectado a PostgreSQL correctamente');
    client.release();
  })
  .catch((err) => {
    console.error('Error conectando a PostgreSQL:', err.message);
    console.error(
      'Verifica DATABASE_URL en Render y que el schema.sql esté aplicado.'
    );
  });

export default pool;
