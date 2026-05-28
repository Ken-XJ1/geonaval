import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Download, Clock, Navigation, AlertTriangle, User, Ship, Users, Navigation2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

type ResultadoConsulta = Record<string, unknown>;

const TIPOS = [
  { value: 'pasajero',    label: 'Pasajero',    placeholder: 'Nombre o número de documento' },
  { value: 'tripulacion', label: 'Tripulación', placeholder: 'Nombre o documento del tripulante' },
  { value: 'embarcacion', label: 'Embarcación', placeholder: 'Nombre o NIC de la embarcación' },
  { value: 'viaje',       label: 'Viaje',       placeholder: 'ID del viaje (ej: 3) o ruta (ej: Quibdó)' },
];

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ResultadoPasajero({ r }: { r: ResultadoConsulta }) {
  return (
    <div className="p-4 bg-white border border-border rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        <span className="font-semibold">{r.nombre as string}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <span>Documento: <strong className="text-foreground">{r.documento as string}</strong></span>
        <span>Teléfono: <strong className="text-foreground">{(r.telefono as string) || '—'}</strong></span>
        {r.origen && <span>Ruta: <strong className="text-foreground">{r.origen as string} → {r.destino as string}</strong></span>}
        {r.viaje_estado && <span>Estado viaje: <StatusBadge status={r.viaje_estado as string} /></span>}
        {r.fecha_salida && <span>Salida: <strong className="text-foreground">{formatDateTime(r.fecha_salida as string)}</strong></span>}
        {r.asiento && <span>Asiento: <strong className="text-foreground">{r.asiento as string}</strong></span>}
      </div>
    </div>
  );
}

function ResultadoTripulacion({ r }: { r: ResultadoConsulta }) {
  return (
    <div className="p-4 bg-white border border-border rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-600" />
        <span className="font-semibold">{r.nombre as string}</span>
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full capitalize">{r.rol as string}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <span>Documento: <strong className="text-foreground">{r.documento as string}</strong></span>
        <span>Teléfono: <strong className="text-foreground">{(r.telefono as string) || '—'}</strong></span>
        <span>Estado: <strong className={r.activo ? 'text-green-600' : 'text-red-600'}>{r.activo ? 'Activo' : 'Inactivo'}</strong></span>
      </div>
    </div>
  );
}

function ResultadoEmbarcacion({ r }: { r: ResultadoConsulta }) {
  return (
    <div className="p-4 bg-white border border-border rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Ship className="w-4 h-4 text-primary" />
        <span className="font-semibold">{r.nombre as string}</span>
        <StatusBadge status={r.estado as string} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <span>NIC: <strong className="text-foreground">{r.nic as string}</strong></span>
        <span>Tipo: <strong className="text-foreground capitalize">{r.tipo as string}</strong></span>
        <span>Capacidad: <strong className="text-foreground">{r.capacidad_pasajeros as number} pasajeros</strong></span>
        {r.propietario_nombre && <span>Propietario: <strong className="text-foreground">{r.propietario_nombre as string}</strong></span>}
      </div>
    </div>
  );
}

function ResultadoViaje({ r }: { r: ResultadoConsulta }) {
  return (
    <div className="p-4 bg-white border border-border rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Navigation2 className="w-4 h-4 text-primary" />
        <span className="font-semibold">V-{r.id as number}: {r.origen as string} → {r.destino as string}</span>
        <StatusBadge status={r.estado as string} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <span>Salida: <strong className="text-foreground">{formatDateTime(r.fecha_salida as string)}</strong></span>
        <span>Embarcación: <strong className="text-foreground">{(r.embarcacion_nombre as string) || '—'}</strong></span>
        <span>Pasajeros: <strong className="text-foreground">{r.pasajeros_count as number}</strong></span>
        <span>Precio: <strong className="text-foreground">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(r.precio ?? 0))}</strong></span>
      </div>
    </div>
  );
}

export function AutoridadesView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [tipo, setTipo] = useState('pasajero');
  const [criterio, setCriterio] = useState('');
  const [resultados, setResultados] = useState<ResultadoConsulta[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [statsViajes, setStatsViajes] = useState({ enCurso: 0, programados: 0, pasajeros: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [viajesEnCurso, setViajesEnCurso] = useState<Record<string, unknown>[]>([]);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setLoadingViajes(true);
    try {
      const viajes = (await api.getViajes()) as Record<string, unknown>[];
      const activos = viajes.filter(v => v.estado === 'en_curso' || v.estado === 'programado');
      setStatsViajes({
        enCurso: activos.filter(v => v.estado === 'en_curso').length,
        programados: activos.filter(v => v.estado === 'programado').length,
        pasajeros: activos.reduce((s, v) => s + Number(v.pasajeros_count ?? 0), 0),
      });
      setViajesEnCurso(viajes.filter(v => v.estado === 'en_curso'));
    } catch { /* silencioso */ }
    finally { setLoadingStats(false); setLoadingViajes(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!criterio.trim()) return;
    setBuscando(true);
    setBuscado(false);
    setErrorBusqueda(null);
    setResultados([]);
    try {
      const q = criterio.trim().toLowerCase();
      let data: ResultadoConsulta[] = [];
      if (tipo === 'pasajero') {
        const rows = (await api.getPasajeros()) as Record<string, unknown>[];
        data = rows.filter(r => (r.nombre as string)?.toLowerCase().includes(q) || (r.documento as string)?.toLowerCase().includes(q));
      } else if (tipo === 'tripulacion') {
        const rows = (await api.getTripulacion()) as Record<string, unknown>[];
        data = rows.filter(r => (r.nombre as string)?.toLowerCase().includes(q) || (r.documento as string)?.toLowerCase().includes(q));
      } else if (tipo === 'embarcacion') {
        const rows = (await api.getEmbarcaciones()) as Record<string, unknown>[];
        data = rows.filter(r => (r.nombre as string)?.toLowerCase().includes(q) || (r.nic as string)?.toLowerCase().includes(q));
      } else if (tipo === 'viaje') {
        const rows = (await api.getViajes()) as Record<string, unknown>[];
        data = rows.filter(r =>
          String(r.id) === q ||
          (r.origen as string)?.toLowerCase().includes(q) ||
          (r.destino as string)?.toLowerCase().includes(q) ||
          (r.embarcacion_nombre as string)?.toLowerCase().includes(q)
        );
      }
      setResultados(data);
      setBuscado(true);
    } catch (e) {
      setErrorBusqueda(e instanceof Error ? e.message : 'Error al consultar');
    } finally {
      setBuscando(false);
    }
  };

  const tipoActual = TIPOS.find(t => t.value === tipo)!;
  const alertasEmergencia = [
    { id: 'A-001', tipo: 'warning', embarcacion: 'Ferry San José', mensaje: 'Retraso de 15 minutos por condiciones climáticas', hora: '10:15 AM', prioridad: 'Media' },
    { id: 'A-002', tipo: 'info', embarcacion: 'Bote Atrato', mensaje: 'Señal GPS intermitente en sector río medio', hora: '09:45 AM', prioridad: 'Baja' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-lg">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Panel de Supervisión</h2>
            <p className="text-white/90">Control y vigilancia del transporte fluvial</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Viajes en Curso</p>
          <p className="text-2xl font-bold text-primary">{loadingStats ? '…' : statsViajes.enCurso}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Viajes Programados</p>
          <p className="text-2xl font-bold text-green-600">{loadingStats ? '…' : statsViajes.programados}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Pasajeros en Tránsito</p>
          <p className="text-2xl font-bold text-blue-600">{loadingStats ? '…' : statsViajes.pasajeros}</p>
        </div>
      </div>

      {/* Tabla Viajes en Curso */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold">Viajes en Curso</h3>
            <p className="text-sm text-muted-foreground">Supervisión en tiempo real</p>
          </div>
          <button
            onClick={() => onNavigate?.('monitoreo')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Navigation className="w-4 h-4" />
            Ver GPS en Vivo
          </button>
        </div>
        {loadingViajes ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando…</div>
        ) : viajesEnCurso.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No hay viajes en curso en este momento</div>
        ) : (
          <div className="overflow-auto max-h-72">
            <table className="w-full">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Embarcación</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Ruta</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Salida</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Pasajeros</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {viajesEnCurso.map((v) => (
                  <tr key={v.id as number} className="hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">V-{v.id as number}</td>
                    <td className="px-6 py-4 text-sm font-medium">{(v.embarcacion_nombre as string) || '—'}</td>
                    <td className="px-6 py-4 text-sm">{v.origen as string} → {v.destino as string}</td>
                    <td className="px-6 py-4 text-sm">{formatDateTime(v.fecha_salida as string)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-primary">{v.pasajeros_count as number}</td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={v.estado as string} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel de Consultas Oficiales */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Panel de Consultas Oficiales
        </h3>
        <form onSubmit={handleConsultar} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIPOS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTipo(t.value); setResultados([]); setBuscado(false); setCriterio(''); }}
                className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  tipo === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={criterio}
              onChange={(e) => setCriterio(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              placeholder={tipoActual.placeholder}
              required
            />
            <button
              type="submit"
              disabled={buscando || !criterio.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {buscando ? 'Buscando…' : 'Consultar'}
            </button>
          </div>
        </form>
        <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
          <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-700">
            Todas las consultas son registradas y auditadas. Solo personal autorizado puede acceder a esta información.
          </p>
        </div>
        {errorBusqueda && <div className="mt-4"><ViewFeedback error={errorBusqueda} /></div>}
        {buscado && !errorBusqueda && (
          <div className="mt-5">
            <p className="text-sm font-medium mb-3 text-muted-foreground">
              {resultados.length === 0
                ? `Sin resultados para "${criterio}" en ${tipoActual.label}`
                : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} para "${criterio}"`}
            </p>
            <div className="space-y-3">
              {resultados.map((r, i) => (
                <div key={i}>
                  {tipo === 'pasajero'    && <ResultadoPasajero r={r} />}
                  {tipo === 'tripulacion' && <ResultadoTripulacion r={r} />}
                  {tipo === 'embarcacion' && <ResultadoEmbarcacion r={r} />}
                  {tipo === 'viaje'       && <ResultadoViaje r={r} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alertas de Emergencia */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alertas y Emergencias
          </h3>
          <span className="text-sm text-muted-foreground">{alertasEmergencia.length} activas</span>
        </div>
        <div className="space-y-3">
          {alertasEmergencia.map((alerta) => (
            <div key={alerta.id} className={`p-4 rounded-lg border ${alerta.tipo === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{alerta.embarcacion}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${alerta.prioridad === 'Media' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                      {alerta.prioridad}
                    </span>
                  </div>
                  <p className="text-sm">{alerta.mensaje}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">{alerta.hora}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate?.('monitoreo')}
          className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <Navigation className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold mb-1">GPS en Tiempo Real</h4>
          <p className="text-sm text-muted-foreground">Ver ubicación de embarcaciones</p>
        </button>
        <button
          onClick={() => onNavigate?.('reportes')}
          className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-3">
            <Download className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold mb-1">Reportes Oficiales</h4>
          <p className="text-sm text-muted-foreground">Descargar informes</p>
        </button>
        <button
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
          className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold mb-1">Historial de Consultas</h4>
          <p className="text-sm text-muted-foreground">Ver auditoría</p>
        </button>
      </div>

      {/* Panel de Historial de Consultas */}
      {mostrarHistorial && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Historial de Consultas del Sistema
            </h3>
            <button
              onClick={() => setMostrarHistorial(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex gap-3">
            <Shield className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">
              Registro de auditoría de todas las consultas realizadas por autoridades. Información protegida y confidencial.
            </p>
          </div>
          <div className="overflow-auto max-h-64">
            <table className="w-full">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Criterio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Resultados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-sm">{formatDateTime(new Date().toISOString())}</td>
                  <td className="px-4 py-3 text-sm font-medium">Autoridad Demo</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Pasajero</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">Consulta de ejemplo</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">0 registros</td>
                </tr>
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-sm">{formatDateTime(new Date(Date.now() - 3600000).toISOString())}</td>
                  <td className="px-4 py-3 text-sm font-medium">Autoridad Demo</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Embarcación</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">Consulta de ejemplo</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">0 registros</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Mostrando las últimas consultas realizadas. El historial completo se almacena de forma segura.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
