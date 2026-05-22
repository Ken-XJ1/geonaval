import { useState, useEffect } from 'react';
import { Navigation, MapPin, Clock, Radio } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../../services/api';
import { mapEmbarcacionToMonitoreo } from '../../services/mappers';

export function MonitoreoView() {
  const [embarcacionesActivas, setEmbarcacionesActivas] = useState<
    ReturnType<typeof mapEmbarcacionToMonitoreo>[]
  >([]);

  useEffect(() => {
    api.getEmbarcaciones()
      .then((rows) =>
        setEmbarcacionesActivas(
          rows
            .filter((e) => e.estado === 'operativa')
            .map(mapEmbarcacionToMonitoreo)
        )
      )
      .catch(() => setEmbarcacionesActivas([]));
  }, []);

  const alertas = [
    {
      id: 'A-001',
      tipo: 'info',
      mensaje: 'Ferry San José: 15 min de retraso estimado',
      hora: '10:15 AM',
    },
    {
      id: 'A-002',
      tipo: 'warning',
      mensaje: 'Bote Atrato: Señal GPS intermitente',
      hora: '09:45 AM',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Monitoreo GPS en Tiempo Real</h2>
        <p className="text-muted-foreground">Seguimiento de embarcaciones y rutas fluviales</p>
      </div>

      {/* Main Map */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="relative w-full h-[500px] bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-border overflow-hidden">
          {/* Background Map Image */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1689045603970-c4e9f73cb934?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600"
              alt="Río Atrato"
              className="w-full h-full object-cover opacity-40"
            />
          </div>

          {/* Map Overlay */}
          <div className="absolute inset-0 bg-blue-900/10"></div>

          {/* GPS Markers */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20">
            <div className="relative group cursor-pointer">
              <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse shadow-lg border-2 border-white"></div>
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                <p className="font-medium text-sm">Ferry San José</p>
                <p className="text-xs text-muted-foreground">V-001: Quibdó - Istmina</p>
                <p className="text-xs text-green-600 mt-1">En curso • 15 km/h</p>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 right-1/3 z-20">
            <div className="relative group cursor-pointer">
              <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse shadow-lg border-2 border-white"></div>
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                <p className="font-medium text-sm">Lancha Rápida 7</p>
                <p className="text-xs text-muted-foreground">V-002: Quibdó - Tadó</p>
                <p className="text-xs text-blue-600 mt-1">En curso • 22 km/h</p>
              </div>
            </div>
          </div>

          {/* Route Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1="50%"
              y1="33%"
              x2="70%"
              y2="60%"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
            <line
              x1="67%"
              y1="50%"
              x2="85%"
              y2="70%"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
          </svg>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg">
            <p className="text-sm font-medium mb-2">Leyenda</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>En curso</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Programado</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Alerta</span>
              </div>
            </div>
          </div>

          {/* Live Indicator */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">EN VIVO</span>
          </div>
        </div>
      </div>

      {/* Active Vessels Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embarcaciones Activas */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Embarcaciones Activas
          </h3>
          <div className="space-y-3">
            {embarcacionesActivas.map((emb) => (
              <div key={emb.id} className="p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{emb.nombre}</p>
                    <p className="text-sm text-muted-foreground">{emb.ruta}</p>
                  </div>
                  <StatusBadge status={emb.estado} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs">
                      {emb.latitud.toFixed(4)}, {emb.longitud.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs">{emb.velocidad} km/h</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Actualizado: {emb.ultimaActualizacion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Alertas del Sistema</h3>
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                className={`p-4 rounded-lg border ${
                  alerta.tipo === 'warning'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium flex-1">{alerta.mensaje}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                    {alerta.hora}
                  </span>
                </div>
              </div>
            ))}

            {alertas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No hay alertas activas</p>
              </div>
            )}
          </div>

          {/* Tipos de Alertas */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Tipos de Alertas:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Desvío de ruta programada</li>
              <li>• Paradas no autorizadas</li>
              <li>• Pérdida de señal GPS</li>
              <li>• Velocidad inusual</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
