"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// Evitar que el driver pg convierta TIMESTAMP a objeto Date con UTC
// Devuelve el string tal como está en la BD
pg_1.types.setTypeParser(1114, (val) => val); // TIMESTAMP WITHOUT TIME ZONE
pg_1.types.setTypeParser(1184, (val) => val); // TIMESTAMP WITH TIME ZONE
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({
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
    console.error('Verifica DATABASE_URL en Render y que el schema.sql esté aplicado.');
});
exports.default = pool;
