import { useState } from 'react';
import { Shield, Search, Download, Eye, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';

export function AutoridadesView() {
  const [busqueda, setBusqueda] = useState({
    tipo: 'pasajero',
    criterio: '',
  });

  const viajesActivos = [
    {
      id: 'V-001',
      fecha: '09/05/2026',
      embarcacion: 'Ferry San José',
      ruta: 'Quibdó - Istmina',
      operador: 'Juan Pérez',
      pasajeros: 45,
      estado: 'en-curso' as const,
    },
    {
      id: 'V-002',
      fecha: '09/05/2026',
      embarcacion: 'Lancha Rápida 7',
      ruta: 'Quibdó - Tadó',
      operador: 'María González',
      pasajeros: 18,
      estado: 'en-curso' as const,
    },
  ];

  const alertasEmergencia = [
    {
      id: 'A-001',
      tipo: 'warning',
      embarcacion: 'Ferry San José',
      mensaje: 'Retraso de 15 minutos por condiciones climáticas',
      hora: '10:15 AM',
      prioridad: 'Media',
    },
    {
      id: 'A-002',
      tipo: 'info',
      embarcacion: 'Bote Atrato',
      mensaje: 'Señal GPS intermitente en sector río medio',
      hora: '09:45 AM',
      prioridad: 'Baja',
    },
  ];

  const consultasRecientes = [
    {
      id: 'C-001',
      fecha: '09/05/2026 10:30',
      tipo: 'Pasajero',
      criterio: 'Doc: 1234567890',
      usuario: 'Autoridad Marina',
      resultados: 1,
    },
    {
      id: 'C-002',
      fecha: '09/05/2026 09:15',
      tipo: 'Viaje',
      criterio: 'V-001',
      usuario: 'Policía Fluvial',
      resultados: 1,
    },
  ];

  const columns = [
    { key: 'embarcacion', label: 'Embarcación' },
    { key: 'ruta', label: 'Ruta' },
    { key: 'operador', label: 'Operador' },
    { key: 'pasajeros', label: 'Pasajeros' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: any) => <StatusBadge status={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header de Autoridad */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Viajes Activos</p>
          <p className="text-2xl font-bold text-primary">8</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Embarcaciones Operando</p>
          <p className="text-2xl font-bold text-green-600">24</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Pasajeros en Tránsito</p>
          <p className="text-2xl font-bold text-blue-600">156</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Alertas Activas</p>
          <p className="text-2xl font-bold text-orange-600">2</p>
        </div>
      </div>

      {/* Panel de Búsqueda */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Panel de Consultas Oficiales
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Consulta</label>
            <select
              value={busqueda.tipo}
              onChange={(e) => setBusqueda({ ...busqueda, tipo: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="pasajero">Pasajero</option>
              <option value="tripulacion">Tripulación</option>
              <option value="embarcacion">Embarcación</option>
              <option value="viaje">Viaje</option>
              <option value="ruta">Ruta</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Criterio de Búsqueda</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={busqueda.criterio}
                onChange={(e) => setBusqueda({ ...busqueda, criterio: e.target.value })}
                className="flex-1 px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Documento, nombre, ID, NIC, etc."
              />
              <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                <Search className="w-4 h-4" />
                Consultar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
          <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-purple-900">Acceso Restringido y Auditado</p>
            <p className="text-sm text-purple-700 mt-1">
              Todas las consultas son registradas y auditadas. Solo personal autorizado puede acceder a esta información.
            </p>
          </div>
        </div>
      </div>

      {/* Viajes Activos en Supervisión */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Viajes en Curso - Supervisión en Tiempo Real</h3>
            <p className="text-sm text-muted-foreground">Monitoreo activo de embarcaciones</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            <Eye className="w-4 h-4" />
            Ver GPS en Vivo
          </button>
        </div>
        <DataTable
          columns={columns}
          data={viajesActivos}
          onView={(row) => console.log('Ver detalles', row)}
        />
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
            <div
              key={alerta.id}
              className={`p-4 rounded-lg border ${
                alerta.tipo === 'warning'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{alerta.embarcacion}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      alerta.prioridad === 'Media' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
                    }`}>
                      {alerta.prioridad}
                    </span>
                  </div>
                  <p className="text-sm">{alerta.mensaje}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                  {alerta.hora}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funciones Especiales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <Navigation className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold mb-1">GPS en Tiempo Real</h4>
          <p className="text-sm text-muted-foreground">Ver ubicación de embarcaciones</p>
        </button>

        <button className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-3">
            <Download className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold mb-1">Reportes Oficiales</h4>
          <p className="text-sm text-muted-foreground">Descargar informes</p>
        </button>

        <button className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold mb-1">Consulta de Registros</h4>
          <p className="text-sm text-muted-foreground">Historial completo</p>
        </button>

        <button className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold mb-1">Historial de Consultas</h4>
          <p className="text-sm text-muted-foreground">Ver auditoría</p>
        </button>
      </div>

      {/* Historial de Consultas */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Historial de Consultas (Auditoría)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Criterio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Resultados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {consultasRecientes.map((consulta) => (
                <tr key={consulta.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{consulta.fecha}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{consulta.tipo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-xs">{consulta.criterio}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{consulta.usuario}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="font-medium text-primary">{consulta.resultados}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
