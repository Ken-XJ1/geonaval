import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Calendar, Users, Anchor, UserCheck,
  Navigation, AlertTriangle, UserPlus, Filter, Trash2,
  RefreshCw, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { ViewFeedback } from './ViewFeedback';

type Notificacion = {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
};

type Categoria =
  | 'todas'
  | 'usuario'
  | 'tripulacion'
  | 'propietario'
  | 'embarcacion'
  | 'viaje'
  | 'pasajero'
  | 'incidente'
  | 'sistema';

function getCategoriaFromTitulo(titulo: string): Categoria {
  const t = titulo.toUpperCase();
  if (t.includes('[USUARIO]')) return 'usuario';
  if (t.includes('[TRIPULACIÓN]') || t.includes('[TRIPULACION]')) return 'tripulacion';
  if (t.includes('[PROPIETARIO]')) return 'propietario';
  if (t.includes('[EMBARCACIÓN]') || t.includes('[EMBARCACION]')) return 'embarcacion';
  if (t.includes('[VIAJE]')) return 'viaje';
  if (t.includes('[PASAJERO]')) return 'pasajero';
  if (t.includes('[INCIDENTE]') || t.includes('ALERTA')) return 'incidente';
  return 'sistema';
}

function getCategoriaConfig(cat: Categoria) {
  switch (cat) {
    case 'usuario':
      return { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Usuario' };
    case 'tripulacion':
      return { icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Tripulación' };
    case 'propietario':
      return { icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Propietario' };
    case 'embarcacion':
      return { icon: Anchor, color: 'text-cyan-600', bg: 'bg-cyan-100', label: 'Embarcación' };
    case 'viaje':
      return { icon: Navigation, color: 'text-green-600', bg: 'bg-green-100', label: 'Viaje' };
    case 'pasajero':
      return { icon: Users, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Pasajero' };
    case 'incidente':
      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Incidente' };
    default:
      return { icon: ShieldCheck, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Sistema' };
  }
}

function limpiarTitulo(titulo: string): string {
  return titulo.replace(/^\[.*?\]\s*/, '');
}

const CATEGORIAS: { key: Categoria; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'viaje', label: 'Viajes' },
  { key: 'embarcacion', label: 'Embarcaciones' },
  { key: 'tripulacion', label: 'Tripulación' },
  { key: 'pasajero', label: 'Pasajeros' },
  { key: 'propietario', label: 'Propietarios' },
  { key: 'usuario', label: 'Usuarios' },
  { key: 'incidente', label: 'Incidentes' },
];

export function NotificacionesView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria>('todas');
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getNotificaciones() as Notificacion[];
      // Más recientes primero
      setNotificaciones(rows.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.marcarNotificacionLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.marcarTodasNotificacionesLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error) return <ViewFeedback error={error} />;

  const notificacionesFiltradas = notificaciones.filter(n => {
    const cat = getCategoriaFromTitulo(n.titulo);
    const pasaCategoria = filtroCategoria === 'todas' || cat === filtroCategoria;
    const pasaLeida = !soloNoLeidas || !n.leida;
    return pasaCategoria && pasaLeida;
  });

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  // Conteo por categoría
  const conteos: Record<string, number> = { todas: notificaciones.length };
  for (const n of notificaciones) {
    const cat = getCategoriaFromTitulo(n.titulo);
    conteos[cat] = (conteos[cat] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Auditoría del Sistema</h2>
          <p className="text-muted-foreground">
            Registro de todos los cambios y eventos del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Marcar todas como leídas ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Total eventos</p>
          <p className="text-2xl font-bold text-foreground">{notificaciones.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Sin leer</p>
          <p className="text-2xl font-bold text-primary">{unreadCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Incidentes</p>
          <p className="text-2xl font-bold text-red-600">{conteos['incidente'] || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Viajes</p>
          <p className="text-2xl font-bold text-green-600">{conteos['viaje'] || 0}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filtrar por categoría
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltroCategoria(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroCategoria === key
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {label}
              {conteos[key] ? (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  filtroCategoria === key ? 'bg-white/20' : 'bg-border'
                }`}>
                  {conteos[key]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={soloNoLeidas}
            onChange={(e) => setSoloNoLeidas(e.target.checked)}
            className="rounded"
          />
          Mostrar solo no leídas
        </label>
      </div>

      {/* Lista */}
      {notificacionesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-medium">Sin eventos en esta categoría</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            Los cambios que se realicen en el sistema aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {notificacionesFiltradas.map((n) => {
              const cat = getCategoriaFromTitulo(n.titulo);
              const config = getCategoriaConfig(cat);
              const Icon = config.icon;
              const tituloLimpio = limpiarTitulo(n.titulo);

              return (
                <div
                  key={n.id}
                  className={`p-5 transition-colors hover:bg-muted/20 ${
                    !n.leida ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1 min-w-0">
                      {/* Ícono de categoría */}
                      <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Badge de categoría + título */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          {!n.leida && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary text-white">
                              Nuevo
                            </span>
                          )}
                        </div>

                        <h4 className={`font-semibold text-sm ${!n.leida ? 'text-foreground' : 'text-foreground/80'}`}>
                          {tituloLimpio}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {n.mensaje}
                        </p>

                        {/* Botón para ir a Usuarios si es notificación de bloqueo */}
                        {(tituloLimpio.toLowerCase().includes('bloqueada') || 
                          n.mensaje.toLowerCase().includes('bloqueada')) && (
                          <button
                            onClick={() => navigate('/usuarios')}
                            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            Ir a Usuarios para desbloquear
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Fecha y hora */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {(() => {
                              // La fecha viene del backend ya en hora de Colombia (WorldTimeAPI)
                              // Formato: "YYYY-MM-DD HH:mm:ss"
                              const s = String(n.created_at).replace('T', ' ');
                              const datePart = s.split(' ')[0];
                              const [y, m, d] = datePart.split('-');
                              return `${d}/${m}/${y}`;
                            })()}
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {(() => {
                              // La hora viene del backend ya en hora de Colombia (WorldTimeAPI)
                              const s = String(n.created_at).replace('T', ' ');
                              const timePart = s.split(' ')[1];
                              if (!timePart) return '—';
                              const [h, m] = timePart.split(':');
                              return `${h}:${m}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botón marcar leída */}
                    {!n.leida && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors flex-shrink-0"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
