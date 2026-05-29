import fs from 'fs';
import path from 'path';
import pool from './pool';

async function runMigrations() {
  try {
    const migrationsPath = path.join(__dirname, 'migrations.sql');
    if (fs.existsSync(migrationsPath)) {
      await pool.query(fs.readFileSync(migrationsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Migraciones:', (err as Error).message);
  }
}

export async function ensureSchema() {
  try {
    // Configurar zona horaria de Colombia
    await pool.query("SET timezone = 'America/Bogota'");
    console.log('✅ Zona horaria configurada: America/Bogota');
    
    await pool.query('SELECT 1 FROM usuarios LIMIT 1');
    await runMigrations();
    return true;
  } catch {
    try {
      // Configurar zona horaria antes de aplicar el schema
      await pool.query("SET timezone = 'America/Bogota'");
      console.log('✅ Zona horaria configurada: America/Bogota');
      
      const schemaPath = path.join(__dirname, 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('Schema SQL aplicado automáticamente');
      await runMigrations();
      return true;
    } catch (err) {
      console.error('No se pudo aplicar schema:', (err as Error).message);
      return false;
    }
  }
}
