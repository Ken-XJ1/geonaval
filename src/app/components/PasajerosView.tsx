import { useState, useEffect, useCallback } from 'react';
import { Plus, Navigation } from 'lucide-react';
import { DataTable } from './DataTable';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapPasajeroToUI } from '../../services/mappers';

export function PasajerosView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pasajeros, setPasajeros] = useState<
    ReturnType<typeof mapPasajeroToUI>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viajes, setViajes] = useState<Record<string, unknown>[]>([]);
  const [viajeSeleccionado, setViajeSeleccionado] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documento: '',
    telefono: '',
    email: '',
    viajeId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await api.getPasajeros()) as Record<string, unknown>[];
      setPasajeros(rows.map(mapPasajeroToUI));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setPasajeros([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadViajes = useCallback(async () => {
    try {
      const viajesData = (await api.getViajes()) as Record<string, unknown>[];
      // Filtrar solo viajes programados
      const viajesProgramados = viajesData.filter(v => v.estado === 'programado');
      setViajes(viajesProgramados);
    } catch (e) {
      console.error('Error cargando viajes:', e);
    }
  }, []);

  useEffect(() => {
    load();
    loadViajes();
  }, [load, loadViajes]);

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
    { key: 'horaSalida', label: 'Salida' },
    { key: 'horaLlegada', label: 'Llegada Est.' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: 'confirmado' | 'pendiente' | 'embarcado') => {
        const config = estadoConfig[value] || estadoConfig.pendiente;
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      },
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        nombre: formData.nombreCompleto,
        documento: formData.documento,
        telefono: formData.telefono,
        email: formData.email,
      };
      
      let pasajeroId: number;
      
      if (editingId) {
        await api.updatePasajero(editingId, body);
        pasajeroId = editingId;
      } else {
        const result = await api.createPasajero(body) as { id: number };
        pasajeroId = result.id;
      }
      
      // Si se seleccionó un viaje, asignar el pasajero al viaje
      if (formData.viajeId && pasajeroId) {
        await api.assignPasajeroViaje(Number(formData.viajeId), pasajeroId);
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        nombreCompleto: '',
        documento: '',
        telefono: '',
        email: '',
        viajeId: '',
      });
      setViajeSeleccionado(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleEdit = (row: ReturnType<typeof mapPasajeroToUI>) => {
    console.log('handleEdit llamado con:', row);
    setEditingId(row.dbId);
    setFormData({
      nombreCompleto: row.nombre,
      documento: row.documento,
      telefono: row.telefono === '—' || row.telefono === 'Pendiente' ? '' : row.telefono,
      email: '',
      viajeId: '',
    });
    setViajeSeleccionado(null);
    setShowForm(true);
  };

  const handleViajeChange = (viajeId: string) => {
    setFormData({ ...formData, viajeId });
    if (viajeId) {
      const viaje = viajes.find(v => String(v.id) === viajeId);
      setViajeSeleccionado(viaje || null);
    } else {
      setViajeSeleccionado(null);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bogota',
    });
  };

  const formatHora = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    });
  };

  const handleDelete = async (row: ReturnType<typeof mapPasajeroToUI>) => {
    console.log('handleDelete llamado con:', row);
    if (!confirm(`¿Está seguro de eliminar al pasajero ${row.nombre}?`)) return;
    try {
      await api.deletePasajero(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && pasajeros.length === 0) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pasajeros en Viajes Activos</h2>
          <p className="text-muted-foreground">Registro de pasajeros del sistema</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              nombreCompleto: '',
              documento: '',
              telefono: '',
              email: '',
              viajeId: '',
            });
            setViajeSeleccionado(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pasajero
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Navigation className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-primary">Registro de Pasajeros</p>
          <p className="text-sm text-muted-foreground mt-1">
            Datos cargados desde la base de datos en tiempo real.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Pasajero' : 'Registrar Nuevo Pasajero'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombreCompleto}
                onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Asignar Viaje (Opcional)</label>
              <select
                value={formData.viajeId}
                onChange={(e) => handleViajeChange(e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {viajes.map((viaje) => (
                  <option key={viaje.id as number} value={viaje.id as number}>
                    {viaje.origen as string} → {viaje.destino as string} - {formatFecha(viaje.fecha_salida as string)}
                  </option>
                ))}
              </select>
            </div>
            
            {viajeSeleccionado && (
              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3 text-primary">Información del Viaje</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Embarcación</p>
                    <p className="font-medium">{(viajeSeleccionado.embarcacion_nombre as string) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Ruta</p>
                    <p className="font-medium">{viajeSeleccionado.origen as string} → {viajeSeleccionado.destino as string}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Salida</p>
                    <p className="font-medium">{formatHora(viajeSeleccionado.fecha_salida as string)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Llegada Est.</p>
                    <p className="font-medium">{formatHora(viajeSeleccionado.fecha_salida as string)}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    nombreCompleto: '',
                    documento: '',
                    telefono: '',
                    email: '',
                    viajeId: '',
                  });
                  setViajeSeleccionado(null);
                }} 
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Guardar Pasajero
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable columns={columns} data={pasajeros} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
