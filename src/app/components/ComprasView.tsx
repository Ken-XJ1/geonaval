import { useState, useEffect, useCallback } from 'react';
import { Plus, Ticket, Calendar, Search, Download } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

type CompraRow = {
  dbId: number;
  id: string;
  ticket: string;
  fecha: string;
  pasajero: string;
  documento: string;
  viaje: string;
  ruta: string;
  asiento: string;
  precio: string;
  metodoPago: string;
  estado: 'confirmado' | 'pendiente';
  vendedor: string;
};

export function ComprasView() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viajesDisponibles, setViajesDisponibles] = useState<
    { id: string; label: string; asientos: number }[]
  >([]);
  const [formData, setFormData] = useState({
    pasajeroNombre: '',
    pasajeroDocumento: '',
    pasajeroTelefono: '',
    viaje: '',
    asiento: '',
    precio: '',
    metodoPago: 'efectivo',
  });

  const [compras, setCompras] = useState<CompraRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pasajeros, viajes] = await Promise.all([
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
        api.getViajes() as Promise<Record<string, unknown>[]>,
      ]);
      setViajesDisponibles(
        viajes.map((v) => ({
          id: String(v.id),
          label: `V-${v.id}: ${v.origen} - ${v.destino}`,
          asientos: 0,
        }))
      );
      setCompras(
        pasajeros.map((p) => ({
          dbId: Number(p.id),
          id: `C-${String(p.id).padStart(3, '0')}`,
          ticket: `TKT-${String(p.id).padStart(3, '0')}`,
          fecha: p.created_at
            ? new Date(p.created_at as string).toLocaleDateString('es-CO')
            : '—',
          pasajero: p.nombre as string,
          documento: p.documento as string,
          viaje: p.viaje_id ? `V-${p.viaje_id}` : '—',
          ruta:
            p.origen && p.destino
              ? `${p.origen} - ${p.destino}`
              : '—',
          asiento: '—',
          precio: '—',
          metodoPago: '—',
          estado: 'confirmado' as const,
          vendedor: 'Sistema',
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setCompras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'ticket', label: 'Ticket' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'pasajero', label: 'Pasajero' },
    { key: 'documento', label: 'Documento' },
    { key: 'ruta', label: 'Ruta' },
    { key: 'asiento', label: 'Asiento' },
    { key: 'precio', label: 'Precio' },
    { key: 'metodoPago', label: 'Método Pago' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: any) => <StatusBadge status={value} />,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = (await api.createPasajero({
        nombre: formData.pasajeroNombre,
        documento: formData.pasajeroDocumento,
        telefono: formData.pasajeroTelefono,
        email: null,
      })) as { id: number };
      if (formData.viaje && created.id) {
        await api.assignPasajeroViaje(
          parseInt(formData.viaje, 10),
          created.id
        );
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleDelete = async (row: CompraRow) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await api.deletePasajero(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && compras.length === 0) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Compras y Tickets</h2>
          <p className="text-muted-foreground">Venta de pasajes y gestión de tickets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Compra
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Registrar Nueva Compra de Ticket
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Información del Pasajero */}
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm mb-3 text-primary">Datos del Pasajero</h4>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.pasajeroNombre}
                onChange={(e) => setFormData({ ...formData, pasajeroNombre: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Nombre del pasajero"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Documento</label>
              <input
                type="text"
                value={formData.pasajeroDocumento}
                onChange={(e) => setFormData({ ...formData, pasajeroDocumento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Número de documento"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.pasajeroTelefono}
                onChange={(e) => setFormData({ ...formData, pasajeroTelefono: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="+57 300 1234567"
                required
              />
            </div>

            {/* Información del Viaje */}
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm mb-3 text-primary mt-4">Información del Viaje</h4>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Viaje</label>
              <select
                value={formData.viaje}
                onChange={(e) => setFormData({ ...formData, viaje: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar viaje</option>
                {viajesDisponibles.map((viaje) => (
                  <option key={viaje.id} value={viaje.id}>
                    {viaje.label} - {viaje.asientos} asientos disponibles
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Asiento</label>
              <input
                type="text"
                value={formData.asiento}
                onChange={(e) => setFormData({ ...formData, asiento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ej: A-15"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Precio</label>
              <input
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="45000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Método de Pago</label>
              <select
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
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
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                Generar Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold text-primary">{compras.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-green-600">{compras.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tickets Confirmados</p>
          <p className="text-2xl font-bold text-blue-600">
            {compras.filter((c) => c.estado === 'confirmado').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tickets Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">
            {compras.filter((c) => c.estado === 'pendiente').length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por ticket, pasajero o documento..."
              className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Calendar className="w-4 h-4" />
            Filtrar por Fecha
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={compras}
        onDelete={handleDelete}
      />
    </div>
  );
}
