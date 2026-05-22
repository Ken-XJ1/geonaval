import { useState, useEffect } from 'react';
import { Ship, Users, Navigation, AlertTriangle, Clock } from 'lucide-react';
import { StatCard } from './StatCard';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import {
  fetchViajes,
  fetchEmbarcaciones,
  fetchPropietarios,
} from '../../services/api';
import { mapViajeToDashboard } from '../../services/mappers';

export function Dashboard() {
  const [recentTrips, setRecentTrips] = useState<
    ReturnType<typeof mapViajeToDashboard>[]
  >([]);

  useEffect(() => {
    Promise.all([
      fetchViajes(),
      fetchEmbarcaciones(),
      fetchPropietarios(),
    ])
      .then(([viajes, embs, props]) => {
        const embMap = new Map(
          embs.map((e) => [e.id, e.nombre as string])
        );
        const propByEmb = new Map(
          embs.map((e) => [
            e.id,
            props.find((p) => p.id === e.propietario_id)?.nombre as string,
          ])
        );
        setRecentTrips(
          viajes.slice(0, 5).map((v) =>
            mapViajeToDashboard(
              v,
              embMap.get(v.embarcacion_id as number) || '—',
              propByEmb.get(v.embarcacion_id as number) || '—'
            )
          )
        );
      })
      .catch(() => setRecentTrips([]));
  }, []);

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
      render: (value: any) => <StatusBadge status={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Embarcaciones Activas"
          value={24}
          icon={Ship}
          color="blue"
          trend={{ value: '12%', isPositive: true }}
        />
        <StatCard
          title="Viajes en Curso"
          value={8}
          icon={Navigation}
          color="green"
          trend={{ value: '5%', isPositive: true }}
        />
        <StatCard
          title="Pasajeros Transportados"
          value={156}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Alertas Activas"
          value={3}
          icon={AlertTriangle}
          color="orange"
        />

        {/* New Card: Próxima Llegada */}
        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 shadow-sm text-white">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-sm text-white/80 mb-1">Próxima Llegada</p>
              <p className="text-3xl font-bold mb-2">11:45 AM</p>
              <p className="text-sm font-medium">Ferry San José</p>
              <p className="text-xs text-white/70 mt-1">Destino: Istmina</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Monitoreo GPS en Tiempo Real</h3>
        <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center border border-border">
          {/* Map Placeholder */}
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

          {/* Mock GPS Markers */}
          <div className="absolute top-1/4 left-1/3 z-20">
            <div className="relative">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow text-xs whitespace-nowrap">
                Ferry San José
              </div>
            </div>
          </div>
          <div className="absolute top-2/3 right-1/3 z-20">
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg"></div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow text-xs whitespace-nowrap">
                Lancha Rápida 7
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips Table */}
      <div>
        <div className="mb-4">
          <h3 className="font-semibold">Viajes Recientes</h3>
          <p className="text-sm text-muted-foreground">Últimos viajes registrados en el sistema</p>
        </div>
        <DataTable
          columns={columns}
          data={recentTrips}
          onView={(row) => console.log('Ver', row)}
          onEdit={(row) => console.log('Editar', row)}
        />
      </div>
    </div>
  );
}
