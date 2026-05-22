import { useState, useEffect, useCallback } from 'react';
import { Ship, Users, Navigation, AlertTriangle, Clock } from 'lucide-react';
import { StatCard } from './StatCard';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapViajeToDashboard } from '../../services/mappers';

export function Dashboard() {
  const [recentTrips, setRecentTrips] = useState<
    ReturnType<typeof mapViajeToDashboard>[]
  >([]);
  const [stats, setStats] = useState({
    embarcacionesActivas: 0,
    viajesEnCurso: 0,
    totalPasajeros: 0,
    viajesHoy: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [viajes, embs, pasajeros] = await Promise.all([
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getEmbarcaciones() as Promise<Record<string, unknown>[]>,
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
      ]);
      const hoy = new Date().toDateString();
      const viajesHoy = viajes.filter(
        (v) => new Date(v.fecha_salida as string).toDateString() === hoy
      ).length;
      setStats({
        embarcacionesActivas: embs.filter((e) => e.estado === 'operativa')
          .length,
        viajesEnCurso: viajes.filter((v) => v.estado === 'en_curso').length,
        totalPasajeros: pasajeros.length,
        viajesHoy,
      });
      const embMap = new Map(
        embs.map((e) => [e.id, e.nombre as string])
      );
      setRecentTrips(
        viajes.slice(0, 5).map((v) =>
          mapViajeToDashboard(v, embMap.get(v.embarcacion_id as number) || '—', '—')
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
      setRecentTrips([]);
      setStats({
        embarcacionesActivas: 0,
        viajesEnCurso: 0,
        totalPasajeros: 0,
        viajesHoy: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'ruta', label: 'Ruta' },
    { key: 'embarcacion', label: 'Embarcación' },
    { key: 'propietario', label: 'Propietario' },
    { key: 'horaSalida', label: 'Hora Salida' },
    { key: 'horaLlegada', label: 'Hora Llegada' },
    { key: 'operador', label: 'Operador Asignado' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => <StatusBadge status={value} />,
    },
  ];

  if (loading) return <ViewFeedback loading />;
  if (error) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Embarcaciones Activas"
          value={stats.embarcacionesActivas}
          icon={Ship}
          color="blue"
        />
        <StatCard
          title="Viajes en Curso"
          value={stats.viajesEnCurso}
          icon={Navigation}
          color="green"
        />
        <StatCard
          title="Pasajeros Registrados"
          value={stats.totalPasajeros}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Viajes Hoy"
          value={stats.viajesHoy}
          icon={AlertTriangle}
          color="orange"
        />

        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 shadow-sm text-white">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-sm text-white/80 mb-1">Próxima Llegada</p>
              <p className="text-3xl font-bold mb-2">
                {recentTrips[0]?.horaLlegada || '—'}
              </p>
              <p className="text-sm font-medium">
                {recentTrips[0]?.embarcacion || 'Sin viajes'}
              </p>
              <p className="text-xs text-white/70 mt-1">
                {recentTrips[0]?.ruta ? `Ruta: ${recentTrips[0].ruta}` : '—'}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Monitoreo GPS en Tiempo Real</h3>
        <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center border border-border">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1689045603970-c4e9f73cb934?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200"
              alt="Río Atrato"
              className="w-full h-full object-cover rounded-lg opacity-30"
            />
          </div>
          <div className="relative z-10 text-center">
            <Navigation className="w-16 h-16 text-primary mx-auto mb-3" />
            <p className="text-lg font-medium text-primary">Mapa GPS</p>
            <p className="text-sm text-muted-foreground">
              Vista de rutas fluviales y ubicación de embarcaciones
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="font-semibold">Viajes Recientes</h3>
          <p className="text-sm text-muted-foreground">
            Últimos viajes registrados en el sistema
          </p>
        </div>
        <DataTable columns={columns} data={recentTrips} />
      </div>
    </div>
  );
}
