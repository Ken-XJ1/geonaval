import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { verifyToken } from '../middleware/auth';
import { ensureConfigTables } from '../db/ensureConfigTables';

const router = Router();
router.use(verifyToken);

type JwtUser = { id: number; rol: string; nombre: string; email?: string };

type Preferencias = {
  idioma: string;
  zona_horaria: string;
  formato_fecha: string;
  tema: string;
};

const DEFAULT_PREFS: Preferencias = {
  idioma: 'es',
  zona_horaria: 'America/Bogota',
  formato_fecha: 'DD/MM/YYYY',
  tema: 'claro',
};

const DEMO_PASSWORDS: Record<string, string> = {
  'test@test.com': '123456',
  'admin@geonaval.com': 'admin123',
  'operador@geonaval.com': 'operador123',
  'cliente@geonaval.com': 'cliente123',
  'autoridad@geonaval.com': 'autoridad123',
};
const demoPrefs = new Map<string, Preferencias>();
const demoSessions = new Map<
  string,
  Array<{
    id: number;
    user_agent: string;
    ip_address: string;
    exito: boolean;
    created_at: string;
  }>
>();
const demoProfiles = new Map<string, { nombre: string; email: string }>();
const demoPasswords = new Map<string, string>();
let demoSessionCounter = 1;

function getUser(req: Request): JwtUser {
  return (req as Request & { user: JwtUser }).user;
}

async function resolveContext(user: JwtUser) {
  await ensureConfigTables();

  if (user.id > 0) {
    try {
      const dbUser = await getDbUser(user.id);
      if (dbUser) return { mode: 'db' as const, dbUser };
    } catch {
      /* fallback demo por email */
    }
  }

  const email = user.email?.trim().toLowerCase();
  if (email) return { mode: 'demo' as const, email };

  if (user.id > 0) {
    try {
      const byName = await pool.query(
        'SELECT email FROM usuarios WHERE id = $1',
        [user.id]
      );
      const found = byName.rows[0]?.email?.toLowerCase();
      if (found) return { mode: 'demo' as const, email: found };
    } catch {
      /* ignore */
    }
  }

  return null;
}

function recordDemoSession(email: string, userAgent: string, ip: string) {
  const list = demoSessions.get(email) || [];
  list.unshift({
    id: demoSessionCounter++,
    user_agent: userAgent,
    ip_address: ip,
    exito: true,
    created_at: new Date().toISOString(),
  });
  demoSessions.set(email, list.slice(0, 20));
}

export function recordLoginSession(
  user: { id: number; email?: string },
  req: Request
) {
  const ua = String(req.headers['user-agent'] || 'Navegador web');
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '—';

  if (user.id > 0 && user.email) {
    pool
      .query(
        `INSERT INTO sesiones_usuario (usuario_id, user_agent, ip_address, exito)
         VALUES ($1, $2, $3, true)`,
        [user.id, ua, ip]
      )
      .catch(() => undefined);
    pool
      .query(`UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1`, [
        user.id,
      ])
      .catch(() => undefined);
  } else if (user.email) {
    recordDemoSession(user.email, ua, ip);
  }
}

async function getDbUser(userId: number) {
  const result = await pool.query(
    'SELECT id, nombre, email, rol, created_at, ultimo_acceso FROM usuarios WHERE id = $1',
    [userId]
  );
  return result.rows[0] as
    | {
        id: number;
        nombre: string;
        email: string;
        rol: string;
        created_at: string;
        ultimo_acceso: string | null;
      }
    | undefined;
}

async function getPreferencias(userId: number): Promise<Preferencias> {
  try {
    const result = await pool.query(
      'SELECT idioma, zona_horaria, formato_fecha, tema FROM usuario_preferencias WHERE usuario_id = $1',
      [userId]
    );
    return result.rows[0] || DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

router.get('/perfil', async (req: Request, res: Response) => {
  const user = getUser(req);
  const ctx = await resolveContext(user);
  if (!ctx) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (ctx.mode === 'demo') {
    const profile = demoProfiles.get(ctx.email);
    const sessions = demoSessions.get(ctx.email) || [];
    return res.json({
      id: user.id,
      nombre: profile?.nombre || user.nombre,
      email: profile?.email || ctx.email,
      rol: user.rol,
      created_at: null,
      ultimo_acceso: sessions[0]?.created_at || null,
      preferencias: demoPrefs.get(ctx.email) || DEFAULT_PREFS,
    });
  }

  try {
    const preferencias = await getPreferencias(ctx.dbUser.id);
    return res.json({ ...ctx.dbUser, preferencias });
  } catch {
    return res.status(500).json({ error: 'Error al cargar perfil' });
  }
});

router.put('/perfil', async (req: Request, res: Response) => {
  const user = getUser(req);
  const { nombre, email } = req.body as { nombre?: string; email?: string };

  if (!nombre?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  const emailNorm = email.trim().toLowerCase();
  const ctx = await resolveContext(user);
  if (!ctx) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (ctx.mode === 'demo') {
    demoProfiles.set(ctx.email, {
      nombre: nombre.trim(),
      email: emailNorm,
    });
    return res.json({
      id: user.id,
      nombre: nombre.trim(),
      email: emailNorm,
      rol: user.rol,
    });
  }

  try {
    const exists = await pool.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = $1 AND id <> $2',
      [emailNorm, ctx.dbUser.id]
    );
    if (exists.rows[0]) {
      return res.status(400).json({ error: 'Ese email ya está en uso' });
    }

    const result = await pool.query(
      `UPDATE usuarios SET nombre = $1, email = $2 WHERE id = $3
       RETURNING id, nombre, email, rol, created_at, ultimo_acceso`,
      [nombre.trim(), emailNorm, ctx.dbUser.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

router.get('/preferencias', async (req: Request, res: Response) => {
  const user = getUser(req);
  const ctx = await resolveContext(user);
  if (!ctx) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (ctx.mode === 'demo') {
    return res.json(demoPrefs.get(ctx.email) || DEFAULT_PREFS);
  }
  try {
    const prefs = await getPreferencias(ctx.dbUser.id);
    return res.json(prefs);
  } catch {
    return res.status(500).json({ error: 'Error al cargar preferencias' });
  }
});

router.put('/preferencias', async (req: Request, res: Response) => {
  const user = getUser(req);
  const ctx = await resolveContext(user);
  if (!ctx) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { idioma, zona_horaria, formato_fecha, tema } = req.body as Preferencias;
  const prefs: Preferencias = {
    idioma: idioma || DEFAULT_PREFS.idioma,
    zona_horaria: zona_horaria || DEFAULT_PREFS.zona_horaria,
    formato_fecha: formato_fecha || DEFAULT_PREFS.formato_fecha,
    tema: tema || DEFAULT_PREFS.tema,
  };

  if (ctx.mode === 'demo') {
    demoPrefs.set(ctx.email, prefs);
    return res.json(prefs);
  }

  try {
    await pool.query(
      `INSERT INTO usuario_preferencias (usuario_id, idioma, zona_horaria, formato_fecha, tema, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (usuario_id) DO UPDATE SET
         idioma = EXCLUDED.idioma,
         zona_horaria = EXCLUDED.zona_horaria,
         formato_fecha = EXCLUDED.formato_fecha,
         tema = EXCLUDED.tema,
         updated_at = NOW()`,
      [ctx.dbUser.id, prefs.idioma, prefs.zona_horaria, prefs.formato_fecha, prefs.tema]
    );
    return res.json(prefs);
  } catch {
    return res.status(500).json({ error: 'Error al guardar preferencias' });
  }
});

router.post('/cambiar-password', async (req: Request, res: Response) => {
  const user = getUser(req);
  const ctx = await resolveContext(user);
  if (!ctx) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { password_actual, password_nueva } = req.body as {
    password_actual?: string;
    password_nueva?: string;
  };

  if (!password_actual || !password_nueva) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }
  if (password_nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  if (ctx.mode === 'demo') {
    const custom = demoPasswords.get(ctx.email);
    const expected = custom || DEMO_PASSWORDS[ctx.email];
    if (expected && expected !== password_actual) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    demoPasswords.set(ctx.email, password_nueva);
    return res.json({ message: 'Contraseña actualizada' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [ctx.dbUser.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password_actual, row.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    const hash = await bcrypt.hash(password_nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [
      hash,
      ctx.dbUser.id,
    ]);
    return res.json({ message: 'Contraseña actualizada' });
  } catch {
    return res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

router.get('/sesiones', async (req: Request, res: Response) => {
  const user = getUser(req);
  const ctx = await resolveContext(user);
  if (!ctx) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (ctx.mode === 'demo') {
    return res.json(demoSessions.get(ctx.email) || []);
  }

  try {
    const result = await pool.query(
      `SELECT id, user_agent, ip_address, exito, created_at
       FROM sesiones_usuario
       WHERE usuario_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [ctx.dbUser.id]
    );
    return res.json(result.rows);
  } catch {
    return res.json([]);
  }
});

export default router;
