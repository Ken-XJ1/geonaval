import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { recordLoginSession } from './cuenta';

const router = Router();

/** Cuentas de prueba — funcionan aunque PostgreSQL no esté disponible */
const DEMO_ACCOUNTS = [
  {
    email: 'test@test.com',
    password: '123456',
    id: 0,
    nombre: 'Usuario Prueba',
    rol: 'administrador',
  },
  {
    email: 'admin@geonaval.com',
    password: 'admin123',
    id: 1,
    nombre: 'Administrador GeoNaval',
    rol: 'administrador',
  },
  {
    email: 'operador@geonaval.com',
    password: 'operador123',
    id: 2,
    nombre: 'Operador Demo',
    rol: 'operador',
  },
  {
    email: 'cliente@geonaval.com',
    password: 'cliente123',
    id: 3,
    nombre: 'Cliente Demo',
    rol: 'cliente',
  },
  {
    email: 'autoridad@geonaval.com',
    password: 'autoridad123',
    id: 4,
    nombre: 'Autoridad Demo',
    rol: 'autoridad',
  },
];

function signToken(user: {
  id: number;
  rol: string;
  nombre: string;
  email?: string;
}) {
  const token = jwt.sign(
    { id: user.id, rol: user.rol, nombre: user.nombre, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '8h' }
  );
  return {
    token,
    rol: user.rol,
    nombre: user.nombre,
    id: user.id,
    email: user.email,
  };
}

function findDemoAccount(email: string, password: string) {
  return DEMO_ACCOUNTS.find(
    (a) => a.email === email?.trim().toLowerCase() && a.password === password
  );
}

router.post('/login', async (req: Request, res: Response) => {
  const email = (req.body.email as string)?.trim().toLowerCase();
  const password = req.body.password as string;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const demo = findDemoAccount(email, password);
  if (demo) {
    const payload = signToken({ ...demo, email });
    recordLoginSession({ id: demo.id, email }, req);
    return res.json(payload);
  }

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(email) = $1 AND activo = true',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        error:
          'Credenciales inválidas. Prueba: test@test.com / 123456',
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        error:
          'Credenciales inválidas. Prueba: test@test.com / 123456',
      });
    }

    const payload = signToken({
        id: user.id,
        rol: user.rol,
        nombre: user.nombre,
        email: user.email,
      });
    recordLoginSession({ id: user.id, email: user.email }, req);
    return res.json(payload);
  } catch {
    return res.status(503).json({
      error:
        'Base de datos no disponible. Usa: test@test.com / 123456',
    });
  }
});

export default router;
