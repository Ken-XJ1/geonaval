"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const embarcaciones_1 = __importDefault(require("./routes/embarcaciones"));
const propietarios_1 = __importDefault(require("./routes/propietarios"));
const tripulacion_1 = __importDefault(require("./routes/tripulacion"));
const pasajeros_1 = __importDefault(require("./routes/pasajeros"));
const viajes_1 = __importDefault(require("./routes/viajes"));
const gps_1 = __importDefault(require("./routes/gps"));
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const incidentes_1 = __importDefault(require("./routes/incidentes"));
const cliente_1 = __importDefault(require("./routes/cliente"));
const initSchema_1 = require("./db/initSchema");
const pool_1 = __importDefault(require("./db/pool"));
const staticDir = path_1.default.join(__dirname, '../dist');
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/embarcaciones', embarcaciones_1.default);
app.use('/api/propietarios', propietarios_1.default);
app.use('/api/tripulacion', tripulacion_1.default);
app.use('/api/pasajeros', pasajeros_1.default);
app.use('/api/viajes', viajes_1.default);
app.use('/api/gps', gps_1.default);
app.use('/api/usuarios', usuarios_1.default);
app.use('/api/incidentes', incidentes_1.default);
app.use('/api/cliente', cliente_1.default);
app.get('/api/health', async (_req, res) => {
    try {
        await pool_1.default.query('SELECT 1');
        res.json({ status: 'ok', proyecto: 'GeoNaval', database: 'connected' });
    }
    catch {
        res.json({ status: 'ok', proyecto: 'GeoNaval', database: 'disconnected' });
    }
});
// Servir archivos estáticos del frontend (Vite build copiado a server/dist)
app.use(express_1.default.static(staticDir));
// Cualquier ruta que no sea /api redirige al index.html
app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path_1.default.join(staticDir, 'index.html'));
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Servidor GeoNaval corriendo en puerto ${PORT}`);
    if (process.env.DATABASE_URL) {
        await (0, initSchema_1.ensureSchema)();
    }
    else {
        console.warn('DATABASE_URL no configurada — solo login demo disponible');
    }
});
