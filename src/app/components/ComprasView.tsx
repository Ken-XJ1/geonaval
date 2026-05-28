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
  fechaISO: string; // YYYY-MM-DD para filtrado
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

type ComprasStats = {
  ventasHoy: number;
  totalRecaudado: number;
  ticketsConfirmados: number;
  ticketsPendientes: number;
};

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetodoPago(metodo: string | null | undefined) {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
  };
  return metodo ? (map[metodo] ?? metodo) : '—';
}

export function ComprasView() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viajesDisponibles, setViajesDisponibles] = useState<
    { id: string; label: string; asientos: number; precio: number }[]
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFecha, setFiltroFecha] = useState({ desde: '', hasta: '' });
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);
  const [stats, setStats] = useState<ComprasStats>({
    ventasHoy: 0,
    totalRecaudado: 0,
    ticketsConfirmados: 0,
    ticketsPendientes: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pasajeros, viajes, statsData] = await Promise.all([
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getComprasStats() as Promise<ComprasStats>,
      ]);

      // Todos los viajes programados disponibles para inscribir
      const viajesProgramados = (viajes as Record<string, unknown>[]).filter(
        (v) => v.estado === 'programado'
      );

      setViajesDisponibles(
        viajesProgramados.map((v) => {
          // Parsear fecha directamente del string sin conversión
          const fechaStr = String(v.fecha_salida ?? '');
          const datePart = fechaStr.split('T')[0].split(' ')[0];
          const timePart = fechaStr.includes('T')
            ? fechaStr.split('T')[1]
            : fechaStr.split(' ')[1] ?? '';
          const [y, mo, d] = datePart.split('-');
          const [h, mi] = (timePart ?? '').split(':');
          const fechaLabel = d && mo && y ? `${d}/${mo}/${y}` : datePart;
          const horaLabel = h && mi ? ` ${h}:${mi}` : '';
          return {
            id: String(v.id),
            label: `V-${v.id}: ${v.origen} → ${v.destino} — ${fechaLabel}${horaLabel}`,
            asientos: Number(v.cupos_disponibles ?? (v as any).capacidad_pasajeros ?? 0),
            precio: Number(v.precio ?? 0),
          };
        })
      );

      setStats(statsData);

      // Parsear fecha de created_at sin conversión UTC
      setCompras(
        pasajeros.map((p) => {
          const rawFecha = String(p.created_at ?? '');
          const datePart = rawFecha.split('T')[0].split(' ')[0];
          const [y, mo, d] = datePart.split('-');
          const fechaDisplay = d && mo && y ? `${d}/${mo}/${y}` : '—';
          const fechaISO = datePart || '';

          return {
            dbId: Number(p.id),
            id: `C-${String(p.id).padStart(3, '0')}`,
            ticket: `TKT-${String(p.id).padStart(3, '0')}`,
            fecha: fechaDisplay,
            fechaISO,
            pasajero: p.nombre as string,
            documento: p.documento as string,
            viaje: p.viaje_id ? `V-${p.viaje_id}` : '—',
            ruta: p.origen && p.destino ? `${p.origen} - ${p.destino}` : '—',
            asiento: p.asiento ? String(p.asiento) : '—',
            precio: p.precio_pagado != null ? formatCOP(Number(p.precio_pagado)) : '—',
            metodoPago: formatMetodoPago(p.metodo_pago as string | null),
            estado: 'confirmado' as const,
            vendedor: 'Sistema',
          };
        })
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
      if (!formData.viaje) {
        throw new Error('Debes seleccionar un viaje para generar el ticket');
      }
      const viajeSel = viajesDisponibles.find((v) => v.id === formData.viaje);

      // Crear pasajero sin usuario_id (registro presencial en oficina)
      const created = (await api.createPasajero({
        nombre: formData.pasajeroNombre,
        documento: formData.pasajeroDocumento,
        telefono: formData.pasajeroTelefono,
        email: null,
      })) as { id: number };

      // Asignar al viaje
      await api.assignPasajeroViaje(
        parseInt(formData.viaje, 10),
        created.id,
        {
          asiento: formData.asiento || undefined,
          precio_pagado: parseFloat(formData.precio) || viajeSel?.precio || 0,
          metodo_pago: formData.metodoPago,
        }
      );

      setFormData({
        pasajeroNombre: '',
        pasajeroDocumento: '',
        pasajeroTelefono: '',
        viaje: '',
        asiento: '',
        precio: '',
        metodoPago: 'efectivo',
      });
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

  const filteredCompras = compras.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !(
      c.ticket.toLowerCase().includes(q) ||
      c.pasajero.toLowerCase().includes(q) ||
      c.documento.toLowerCase().includes(q)
    )) return false;

    if (filtroFecha.desde && c.fechaISO < filtroFecha.desde) return false;
    if (filtroFecha.hasta && c.fechaISO > filtroFecha.hasta) return false;

    return true;
  });

  const handleExportar = () => {
    const encabezados = ['Ticket', 'Fecha', 'Pasajero', 'Documento', 'Ruta', 'Asiento', 'Precio', 'Método Pago', 'Estado'];
    const filas = filteredCompras.map((c) => [
      c.ticket, c.fecha, c.pasajero, c.documento,
      c.ruta, c.asiento, c.precio, c.metodoPago, c.estado,
    ]);
    const csv = [encabezados, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_geonaval_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <label className="block text-sm font-medium mb-2">Documento de Identidad</label>
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
              />
            </div>

            {/* Información del Viaje */}
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm mb-3 text-primary mt-2">Asignar al Viaje</h4>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Viaje Disponible</label>
              <select
                value={formData.viaje}
                onChange={(e) => {
                  const id = e.target.value;
                  const sel = viajesDisponibles.find((v) => v.id === id);
                  setFormData({
                    ...formData,
                    viaje: id,
                    precio: sel ? String(sel.precio) : '',
                  });
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">— Seleccionar viaje —</option>
                {viajesDisponibles.length === 0 && (
                  <option disabled>No hay viajes programados disponibles</option>
                )}
                {viajesDisponibles.map((viaje) => (
                  <option key={viaje.id} value={viaje.id}>
                    {viaje.label} ({viaje.asientos} cupos) —{' '}
                    {formatCOP(viaje.precio)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Asiento <span className="text-muted-foreground font-normal">(opcional, se asigna automático)</span>
              </label>
              <input
                type="text"
                value={formData.asiento}
                onChange={(e) => setFormData({ ...formData, asiento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ej: A-15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Precio (COP)</label>
              <input
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Se autocompleta al seleccionar viaje"
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
                Registrar y Generar Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold text-primary">{stats.ventasHoy}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-green-600">{formatCOP(stats.totalRecaudado)}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tickets Confirmados</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.ticketsConfirmados}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tickets Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.ticketsPendientes}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ticket, pasajero o documento..."
              className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarFiltroFecha(!mostrarFiltroFecha)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              filtroFecha.desde || filtroFecha.hasta
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Filtrar por Fecha
            {(filtroFecha.desde || filtroFecha.hasta) && (
              <span className="ml-1 text-xs bg-primary text-white rounded-full px-1.5 py-0.5">✓</span>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportar}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar ({filteredCompras.length})
          </button>
        </div>

        {/* Panel de filtro de fecha */}
        {mostrarFiltroFecha && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Desde</label>
              <input
                type="date"
                value={filtroFecha.desde}
                onChange={(e) => setFiltroFecha({ ...filtroFecha, desde: e.target.value })}
                className="px-3 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta</label>
              <input
                type="date"
                value={filtroFecha.hasta}
                onChange={(e) => setFiltroFecha({ ...filtroFecha, hasta: e.target.value })}
                className="px-3 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => { setFiltroFecha({ desde: '', hasta: '' }); setMostrarFiltroFecha(false); }}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
            >
              Limpiar
            </button>
            <p className="text-sm text-muted-foreground self-center">
              {filteredCompras.length} resultado{filteredCompras.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCompras}
        onDelete={handleDelete}
      />
    </div>
  );
}
