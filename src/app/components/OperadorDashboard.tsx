import { useState, useEffect, useCallback } from 'react';
import { Ship, Users, Navigation, AlertTriangle, MapPin } from 'lucide-react';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapViajeToUI } from '../../services/mappers';

type OperadorSection = 'dashboard' | 'pasajeros';

type OperadorDashboardProps = {
  section?: OperadorSection;
  onNavigateReportar?: () => void;
};

export function OperadorDashboard({
  section = 'dashboard',
  onNavigateReportar,
}: OperadorDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viajes, setViajes] = useState<ReturnType<typeof mapViajeToUI>[]>([]);
  const [pasajeros, setPasajeros] = useState<
    { nombre: string; documento: string; destino: string; estado: string }[]
  >([]);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [viajesRaw, pasajerosRaw] = await Promise.all([
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
      ]);
      const mapped = viajesRaw.map((v) => mapViajeToUI(v));
      const activos = mapped.filter((v) =>
        ['programado', 'en_curso'].includes(v.estado)
      );
      setViajes(activos);
      const enCurso = mapped.find((v) => v.estado === 'en_curso');

      if (enCurso?.dbId) {
        const delViaje = (await api.getViajePasajeros(
          enCurso.dbId
        )) as Record<string, unknown>[];
        setPasajeros(
          delViaje.map((p) => ({
            nombre: p.nombre as string,
            documento: p.documento as string,
            destino: enCurso.ruta.split(' - ')[1] || '—',
            estado: 'embarcado',
          }))
        );
      } else {
        setPasajeros(
          pasajerosRaw.map((p) => ({
            nombre: p.nombre as string,
            documento: p.documento as string,
            destino: (p.destino as string) || '—',
            estado:
              p.viaje_estado === 'en_curso'
                ? 'embarcado'
                : p.viaje_id
                  ? 'confirmado'
                  : 'pendiente',
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setViajes([]);
      setPasajeros([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viajeEnCurso = viajes.find((v) => v.estado === 'en_curso');
  const viajesProgramados = viajes.filter((v) => v.estado === 'programado');

  if (loading) return <ViewFeedback loading />;
  if (error) return <ViewFeedback error={error} />;

  if (section === 'pasajeros') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Mis Pasajeros</h2>
          <p className="text-muted-foreground">
            {pasajeros.length} pasajero(s) registrados en el sistema
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="overflow-auto max-h-[480px]">
            <table className="w-full">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Destino / Ruta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pasajeros.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No hay pasajeros registrados. El administrador puede agregarlos en Compras o Pasajeros.
                    </td>
                  </tr>
                ) : (
                  pasajeros.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm">{p.nombre}</td>
                      <td className="px-6 py-4 text-sm">{p.documento}</td>
                      <td className="px-6 py-4 text-sm">{p.destino}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            p.estado === 'embarcado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {p.estado === 'embarcado' ? 'Embarcado' : 'Confirmado'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Bienvenido, Operador</h2>
        <p className="text-white/90">Panel de control de tus viajes asignados</p>
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            <span className="font-medium">
              {viajeEnCurso?.embarcacion || viajes[0]?.embarcacion || 'Sin embarcación'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            <span className="font-medium">{viajes.length} viaje(s) activo(s)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Viajes Asignados" value={viajes.length} icon={Navigation} color="blue" />
        <StatCard
          title="Viaje en Curso"
          value={viajeEnCurso ? 1 : 0}
          icon={Ship}
          color="green"
        />
        <StatCard
          title="Pasajeros"
          value={pasajeros.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Llegada Est."
          value={viajeEnCurso?.horaLlegada || '—'}
          icon={MapPin}
          color="orange"
        />
      </div>

      {viajeEnCurso ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Viaje en Curso</h3>
            <StatusBadge status="en_curso" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Ruta</p>
                <p className="font-medium text-lg">{viajeEnCurso.ruta}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Embarcación</p>
                <p className="font-medium">{viajeEnCurso.embarcacion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Salida</p>
                  <p className="font-medium">{viajeEnCurso.horaSalida}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Llegada Est.</p>
                  <p className="font-medium">{viajeEnCurso.horaLlegada}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-primary mb-2">Monitoreo</p>
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                <MapPin className="w-12 h-12 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Usa la pestaña Mi Ruta GPS para ubicación en tiempo real
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-6 text-center text-muted-foreground">
          No hay viaje en curso. El administrador debe iniciar un viaje programado.
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">
          Pasajeros {viajeEnCurso ? 'del viaje en curso' : 'registrados'} ({pasajeros.length})
        </h3>
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full">
            <thead className="bg-muted sticky top-0 z-10">
            <tbody className="divide-y divide-border">
              {pasajeros.slice(0, 10).map((pasajero, idx) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm">{pasajero.nombre}</td>
                  <td className="px-6 py-4 text-sm">{pasajero.documento}</td>
                  <td className="px-6 py-4 text-sm">{pasajero.destino}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        pasajero.estado === 'embarcado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {pasajero.estado === 'embarcado' ? 'Embarcado' : 'Confirmado'}
                    </span>
                  </td>
                </tr>
              ))}
              {pasajeros.length > 10 && (
                <tr>
                  <td colSpan={4} className="px-6 py-2 text-sm text-muted-foreground text-center">
                    y {pasajeros.length - 10} más en Mis Pasajeros
                  </td>
                </tr>
              )}
              {pasajeros.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">
                    Sin pasajeros asignados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Próximos Viajes Programados</h3>
        <div className="space-y-3">
          {viajesProgramados.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay viajes programados</p>
          ) : (
            viajesProgramados.map((viaje) => (
              <div
                key={viaje.id}
                className="p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{viaje.ruta}</p>
                    <p className="text-sm text-muted-foreground">
                      {viaje.fechaSalida} - Salida: {viaje.horaSalida}
                    </p>
                  </div>
                  <StatusBadge status="programado" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-2">Reportar Incidente</h3>
            <p className="text-sm text-orange-700 mb-4">
              Si encuentras alguna situación que requiera atención, repórtala aquí.
            </p>
            <button
              type="button"
              onClick={onNavigateReportar}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Reportar Incidente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
