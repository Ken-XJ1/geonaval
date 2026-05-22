import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import embarcacionesRoutes from './routes/embarcaciones';
import propietariosRoutes from './routes/propietarios';
import tripulacionRoutes from './routes/tripulacion';
import pasajerosRoutes from './routes/pasajeros';
import viajesRoutes from './routes/viajes';
import gpsRoutes from './routes/gps';
import usuariosRoutes from './routes/usuarios';

const staticDir = path.join(__dirname, '../dist');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/embarcaciones', embarcacionesRoutes);
app.use('/api/propietarios', propietariosRoutes);
app.use('/api/tripulacion', tripulacionRoutes);
app.use('/api/pasajeros', pasajerosRoutes);
app.use('/api/viajes', viajesRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', proyecto: 'GeoNaval' });
});

// Servir archivos estáticos del frontend (Vite build copiado a server/dist)
app.use(express.static(staticDir));

// Cualquier ruta que no sea /api redirige al index.html
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(staticDir, 'index.html'));
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor GeoNaval corriendo en puerto ${PORT}`);
});
