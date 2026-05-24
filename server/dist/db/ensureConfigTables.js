"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConfigTables = ensureConfigTables;
const pool_1 = __importDefault(require("./pool"));
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
async function ensureConfigTables() {
    if (ensured || !process.env.DATABASE_URL)
        return;
    try {
        await pool_1.default.query(CONFIG_SQL);
        ensured = true;
    }
    catch (err) {
        console.error('Tablas de configuración:', err.message);
    }
}
