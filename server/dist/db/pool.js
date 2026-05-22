"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({
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
    console.error('Verifica DATABASE_URL en Render y que el schema.sql esté aplicado.');
});
exports.default = pool;
