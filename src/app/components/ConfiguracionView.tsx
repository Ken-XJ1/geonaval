import { useState, useEffect, useCallback } from 'react';
import { User, Shield } from 'lucide-react';
import { Logo } from './Logo';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

interface ConfiguracionViewProps {
  onUserUpdate?: (user: { nombre: string; email: string; rol: string }) => void;
  user: {
    nombre: string;
    email: string;
    rol: string;
  } | null;
}

type Preferencias = {
  idioma: string;
  zona_horaria: string;
  formato_fecha: string;
  tema: string;
};

type Sesion = {
  id: number;
  user_agent: string;
  ip_address: string;
  exito: boolean;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMemberSince(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function loadLocalPrefs(): Preferencias | null {
  try {
    const raw = localStorage.getItem('geonaval_prefs');
    return raw ? (JSON.parse(raw) as Preferencias) : null;
  } catch {
    return null;
  }
}

export function ConfiguracionView({ onUserUpdate, user }: ConfiguracionViewProps) {
  const roleLabels: Record<string, string> = {
    administrador: 'Administrador',
    operador: 'Operador Fluvial',
    cliente: 'Cliente',
    autoridad: 'Autoridad',
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const [profile, setProfile] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    rol: user?.rol || '',
    ultimo_acceso: null as string | null,
    created_at: null as string | null,
  });

  const [profileForm, setProfileForm] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
  });

  const [preferencias, setPreferencias] = useState<Preferencias>({
    idioma: 'es',
    zona_horaria: 'America/Bogota',
    formato_fecha: 'DD/MM/YYYY',
    tema: 'claro',
  });

  const [passwordForm, setPasswordForm] = useState({
    actual: '',
    nueva: '',
    confirmar: '',
  });

  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loadingSesiones, setLoadingSesiones] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.getPerfil()) as {
        nombre: string;
        email: string;
        rol: string;
        ultimo_acceso?: string | null;
        created_at?: string | null;
        preferencias?: Preferencias;
      };
      setProfile({
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        ultimo_acceso: data.ultimo_acceso ?? null,
        created_at: data.created_at ?? null,
      });
      setProfileForm({ nombre: data.nombre, email: data.email });
      if (data.preferencias) setPreferencias(data.preferencias);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar configuración';
      setError(msg);
      setProfile({
        nombre: user?.nombre || localStorage.getItem('userNombre') || '',
        email: user?.email || localStorage.getItem('userEmail') || '',
        rol: user?.rol || localStorage.getItem('userRole') || '',
        ultimo_acceso: null,
        created_at: null,
      });
      setProfileForm({
        nombre: user?.nombre || localStorage.getItem('userNombre') || '',
        email: user?.email || localStorage.getItem('userEmail') || '',
      });
      const local = loadLocalPrefs();
      if (local) setPreferencias(local);
    } finally {
      setLoading(false);
    }
  }, [user?.nombre, user?.email, user?.rol]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const updated = (await api.updatePerfil(profileForm)) as {
        nombre: string;
        email: string;
      };
      setProfile((p) => ({ ...p, nombre: updated.nombre, email: updated.email }));
      localStorage.setItem('userNombre', updated.nombre);
      localStorage.setItem('userEmail', updated.email);
      onUserUpdate?.({
        nombre: updated.nombre,
        email: updated.email,
        rol: profile.rol,
      });
      setShowEditProfile(false);
      setSuccess('Perfil actualizado correctamente');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar perfil');
    }
  };

  const handleSavePreferencias = async () => {
    setError(null);
    setSuccess(null);
    try {
      const saved = (await api.updatePreferencias(preferencias)) as Preferencias;
      setPreferencias(saved);
      localStorage.setItem('geonaval_prefs', JSON.stringify(saved));
      setSuccess('Preferencias guardadas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar preferencias');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (passwordForm.nueva !== passwordForm.confirmar) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    try {
      await api.cambiarPassword(passwordForm.actual, passwordForm.nueva);
      setPasswordForm({ actual: '', nueva: '', confirmar: '' });
      setShowPasswordForm(false);
      setSuccess('Contraseña actualizada correctamente');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar contraseña');
    }
  };

  const handleLoadSesiones = async () => {
    setShowSessions(true);
    setLoadingSesiones(true);
    setError(null);
    try {
      const rows = (await api.getSesiones()) as Sesion[];
      setSesiones(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar sesiones');
    } finally {
      setLoadingSesiones(false);
    }
  };

  if (loading) return <ViewFeedback loading />;

  const roleName = roleLabels[profile.rol] || 'Usuario';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configuración del Sistema</h2>
        <p className="text-muted-foreground">Personaliza tu experiencia en GEONAVAL</p>
      </div>

      {error ? <ViewFeedback error={error} /> : null}
      {success ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex justify-between items-center">
          <span>{success}</span>
          <button type="button" className="underline text-xs" onClick={() => setSuccess(null)}>
            Cerrar
          </button>
        </div>
      ) : null}

      {/* Perfil */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{profile.nombre}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Rol: {roleName}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setProfileForm({ nombre: profile.nombre, email: profile.email });
              setShowEditProfile(!showEditProfile);
              setShowPasswordForm(false);
              setShowSessions(false);
            }}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {showEditProfile ? 'Cancelar' : 'Editar Perfil'}
          </button>
        </div>

        {showEditProfile && (
          <form onSubmit={handleSaveProfile} className="mb-6 p-4 bg-muted/40 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre completo</label>
              <input
                type="text"
                value={profileForm.nombre}
                onChange={(e) => setProfileForm({ ...profileForm, nombre: e.target.value })}
                className="w-full px-4 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Correo electrónico</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-4 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Guardar cambios
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">Último acceso</p>
            <p className="font-medium">{formatDateTime(profile.ultimo_acceso)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Miembro desde</p>
            <p className="font-medium">{formatMemberSince(profile.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-50 rounded-lg">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold">Seguridad</h3>
        </div>
        <div className="space-y-4">
          <div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(!showPasswordForm);
                setShowSessions(false);
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showPasswordForm ? 'Ocultar formulario' : 'Cambiar contraseña'}
            </button>
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-4 p-4 bg-muted/40 rounded-lg space-y-3 max-w-md">
                <div>
                  <label className="block text-sm font-medium mb-1">Contraseña actual</label>
                  <input
                    type="password"
                    value={passwordForm.actual}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, actual: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.nueva}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, nueva: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    value={passwordForm.confirmar}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmar: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none"
                    minLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm"
                >
                  Actualizar contraseña
                </button>
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleLoadSesiones}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showSessions ? 'Actualizar historial de sesiones' : 'Ver historial de sesiones'}
            </button>
            {showSessions && (
              <div className="mt-4">
                {loadingSesiones ? (
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : sesiones.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No hay sesiones registradas aún. Inicia sesión de nuevo para ver tu historial.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left">Fecha</th>
                          <th className="px-4 py-2 text-left">Dispositivo</th>
                          <th className="px-4 py-2 text-left">IP</th>
                          <th className="px-4 py-2 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sesiones.map((s) => (
                          <tr key={s.id}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {formatDateTime(s.created_at)}
                            </td>
                            <td className="px-4 py-2 max-w-xs truncate" title={s.user_agent}>
                              {s.user_agent || '—'}
                            </td>
                            <td className="px-4 py-2">{s.ip_address || '—'}</td>
                            <td className="px-4 py-2">
                              {s.exito ? (
                                <span className="text-green-600">Exitoso</span>
                              ) : (
                                <span className="text-red-600">Fallido</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <Logo className="w-16 h-16" />
          <div>
            <h3 className="font-semibold">GEONAVAL</h3>
            <p className="text-sm text-muted-foreground">Sistema de Control Fluvial</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Versión</p>
            <p className="font-medium">1.0.0</p>
          </div>
          <div>
            <p className="text-muted-foreground">Última actualización</p>
            <p className="font-medium">Mayo 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
