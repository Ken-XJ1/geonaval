import pool from './pool';

const CONFIG_SQL = `
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP;

CREATE TABLE IF NOT EXISTS usuario_preferencias (
  usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  idioma VARCHAR(10) DEFAULT 'es',
  zona_horaria VARCHAR(50) DEFAULT 'America/Bogota',
  formato_fecha VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  tema VARCHAR(20) DEFAULT 'claro',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  exito BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

let ensured = false;

export async function ensureConfigTables() {
  if (ensured || !process.env.DATABASE_URL) return;
  try {
    await pool.query(CONFIG_SQL);
    ensured = true;
  } catch (err) {
    console.error('Tablas de configuración:', (err as Error).message);
  }
}
