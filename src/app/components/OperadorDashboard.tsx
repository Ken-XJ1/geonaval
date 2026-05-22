import { Ship, Users, Navigation, AlertTriangle, MapPin } from 'lucide-react';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';

export function OperadorDashboard() {
  // Solo viajes asignados a este operador
  const misViajes = [
    {
      id: 'V-001',
      fechaSalida: '09/05/2026',
      horaSalida: '08:30',
      horaLlegada: '11:45',
      ruta: 'Quibdó - Istmina',
      embarcacion: 'Ferry San José',
      pasajeros: 45,
      estado: 'en-curso' as const,
    },
    {
      id: 'V-004',
      fechaSalida: '10/05/2026',
      horaSalida: '14:00',
      horaLlegada: '17:15',
      ruta: 'Istmina - Quibdó',
      embarcacion: 'Ferry San José',
      pasajeros: 38,
      estado: 'programado' as const,
    },
  ];

  const misPasajeros = [
    { nombre: 'Roberto Sánchez', documento: '1122334455', destino: 'Istmina', estado: 'embarcado' },
    { nombre: 'Laura Díaz', documento: '2233445566', destino: 'Istmina', estado: 'embarcado' },
    { nombre: 'Pedro Morales', documento: '3344556677', destino: 'Istmina', estado: 'confirmado' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Bienvenido, Operador</h2>
        <p className="text-white/90">Panel de control de tus viajes asignados</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            <span className="font-medium">Ferry San José</span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            <span className="font-medium">2 viajes activos</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Viajes Asignados"
          value={2}
          icon={Navigation}
          color="blue"
        />
        <StatCard
          title="Viaje en Curso"
          value={1}
          icon={Ship}
          color="green"
        />
        <StatCard
          title="Pasajeros a Bordo"
          value={45}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Llegada Estimada"
          value="11:45 AM"
          icon={MapPin}
          color="orange"
        />
      </div>

      {/* Viaje en Curso */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Viaje en Curso</h3>
          <StatusBadge status="en-curso" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Ruta</p>
                <p className="font-medium text-lg">Quibdó - Istmina</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Embarcación</p>
                <p className="font-medium">Ferry San José</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Salida</p>
                  <p className="font-medium">08:30 AM</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Llegada Est.</p>
                  <p className="font-medium">11:45 AM</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-medium text-primary mb-2">Ubicación Actual</p>
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
              <MapPin className="w-12 h-12 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">GPS: 5.6889, -76.6583</p>
          </div>
        </div>
      </div>

      {/* Pasajeros */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Pasajeros de este Viaje</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Destino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {misPasajeros.map((pasajero, idx) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="px-6 py-4 text-sm">{pasajero.nombre}</td>
                  <td className="px-6 py-4 text-sm">{pasajero.documento}</td>
                  <td className="px-6 py-4 text-sm">{pasajero.destino}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      pasajero.estado === 'embarcado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {pasajero.estado === 'embarcado' ? 'Embarcado' : 'Confirmado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Próximos Viajes */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Próximos Viajes Programados</h3>
        <div className="space-y-3">
          {misViajes.filter(v => v.estado === 'programado').map((viaje) => (
            <div key={viaje.id} className="p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{viaje.ruta}</p>
                  <p className="text-sm text-muted-foreground">
                    {viaje.fechaSalida} - Salida: {viaje.horaSalida}
                  </p>
                </div>
                <StatusBadge status={viaje.estado} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reportar Incidente */}
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
            <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
              Reportar Incidente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
