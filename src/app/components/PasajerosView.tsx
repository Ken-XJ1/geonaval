import { useState, useEffect } from 'react';
import { Plus, Users, Navigation, Clock } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { fetchPasajeros } from '../../services/api';
import { mapPasajeroToUI } from '../../services/mappers';

export function PasajerosView() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documento: '',
    telefono: '',
    email: '',
  });

  const [pasajeros, setPasajeros] = useState<
    ReturnType<typeof mapPasajeroToUI>[]
  >([]);

  useEffect(() => {
    fetchPasajeros()
      .then((rows) => setPasajeros(rows.map(mapPasajeroToUI)))
      .catch(() => setPasajeros([]));
  }, []);

  const estadoConfig = {
    confirmado: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmado' },
    pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
    embarcado: { bg: 'bg-green-100', text: 'text-green-700', label: 'Embarcado' },
  };

  const columns = [
    { key: 'nombre', label: 'Nombre Completo' },
    { key: 'documento', label: 'Documento' },
    { key: 'viajeAsociado', label: 'Viaje' },
    { key: 'embarcacion', label: 'Embarcación' },
    { key: 'ruta', label: 'Ruta' },
    {
      key: 'horaSalida',
      label: 'Salida',
      render: (value: string) => (
        <span className="text-sm font-medium">{value}</span>
      ),
    },
    {
      key: 'horaLlegada',
      label: 'Llegada Est.',
      render: (value: string) => (
        <span className="text-sm font-medium text-green-600">{value}</span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: 'confirmado' | 'pendiente' | 'embarcado') => {
        const config = estadoConfig[value];
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      },
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Nuevo pasajero:', formData);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pasajeros en Viajes Activos</h2>
          <p className="text-muted-foreground">Solo pasajeros en viajes que están en curso actualmente</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pasajero
        </button>
      </div>

      {/* Info Alert - Solo viajes en curso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Navigation className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-primary">Vista de Viajes en Curso</p>
          <p className="text-sm text-muted-foreground mt-1">
            Esta sección muestra únicamente los pasajeros que están actualmente en viaje. Los viajes programados y finalizados no se muestran aquí.
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Registrar Nuevo Pasajero</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombreCompleto}
                onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Roberto Sánchez"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Documento</label>
              <input
                type="text"
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="1122334455"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="+57 310 1122334"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email (Opcional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar Pasajero
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats - Solo viajes en curso */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Viajes en Curso</p>
          <p className="text-2xl font-bold text-green-600">2</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Pasajeros Activos</p>
          <p className="text-2xl font-bold text-foreground">{pasajeros.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Embarcados</p>
          <p className="text-2xl font-bold text-green-600">
            {pasajeros.filter((p) => p.estado === 'embarcado').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tiempo Promedio</p>
          <p className="text-2xl font-bold text-primary">3.5h</p>
        </div>
      </div>

      {/* Viajes Activos Cards */}
      <div>
        <h3 className="font-semibold mb-3">Viajes Actualmente en Curso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">V-001: Ferry San José</span>
              </div>
              <StatusBadge status="en-curso" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Ruta:</strong> Quibdó - Istmina
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>08:30 AM - 11:45 AM</span>
                </div>
              </div>
              <p className="text-primary font-medium">2 pasajeros a bordo</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">V-004: Lancha Rápida 7</span>
              </div>
              <StatusBadge status="en-curso" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Ruta:</strong> Quibdó - Tadó
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>12:00 PM - 01:15 PM</span>
                </div>
              </div>
              <p className="text-primary font-medium">1 pasajero a bordo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <h3 className="font-semibold mb-3">Listado de Pasajeros en Viaje</h3>
        <DataTable
          columns={columns}
          data={pasajeros}
          onView={(row) => console.log('Ver', row)}
          onEdit={(row) => console.log('Editar', row)}
          onDelete={(row) => console.log('Eliminar', row)}
        />
      </div>
    </div>
  );
}
