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

pool
  .connect()
  .then(async (client) => {
    console.log('Conectado a PostgreSQL correctamente');
    // Configurar zona horaria de Colombia para esta sesión
    await client.query("SET timezone = 'America/Bogota'");
    console.log('Zona horaria configurada: America/Bogota');
    client.release();
  })
  .catch((err) => {
    console.error('Error conectando a PostgreSQL:', err.message);
    console.error(
      'Verifica DATABASE_URL en Render y que el schema.sql esté aplicado.'
    );
  });

export default pool;
