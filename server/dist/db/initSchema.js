"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSchema = ensureSchema;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = __importDefault(require("./pool"));
async function runMigrations() {
    try {
        const migrationsPath = path_1.default.join(__dirname, 'migrations.sql');
        if (fs_1.default.existsSync(migrationsPath)) {
            await pool_1.default.query(fs_1.default.readFileSync(migrationsPath, 'utf8'));
        }
    }
    catch (err) {
        console.error('Migraciones:', err.message);
    }
}
async function ensureSchema() {
    try {
        await pool_1.default.query('SELECT 1 FROM usuarios LIMIT 1');
        await runMigrations();
        return true;
    }
    catch {
        try {
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
            await pool_1.default.query(sql);
            console.log('Schema SQL aplicado automáticamente');
            await runMigrations();
            return true;
        }
        catch (err) {
            console.error('No se pudo aplicar schema:', err.message);
            return false;
        }
    }
}
