import { useState, useEffect, useCallback } from 'react';
import { Plus, Anchor } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapTripulacionToUI, tripulacionRolToDb } from '../../services/mappers';

export function TripulacionView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tripulacion, setTripulacion] = useState<
    ReturnType<typeof mapTripulacionToUI>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documento: '',
    rol: 'operador',
    licencias: '',
    telefono: '',
    email: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await api.getTripulacion()) as Record<string, unknown>[];
      setTripulacion(rows.map(mapTripulacionToUI));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setTripulacion([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'nombre', label: 'Nombre Completo' },
    { key: 'rol', label: 'Rol' },
    { key: 'embarcacion', label: 'Embarcación' },
    { key: 'viajes', label: 'Viajes Asignados' },
    { key: 'horario', label: 'Horario' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => <StatusBadge status={value} />,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        nombre: formData.nombreCompleto,
        documento: formData.documento,
        rol: tripulacionRolToDb[formData.rol] || 'capitan',
        telefono: formData.telefono,
        email: formData.email,
        licencias: formData.licencias,
        activo: true,
      };
      if (editingId) await api.updateTripulante(editingId, body);
      else await api.createTripulante(body);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleEdit = (row: ReturnType<typeof mapTripulacionToUI>) => {
    setEditingId(row.dbId);
    setFormData({
      nombreCompleto: row.nombre,
      documento: row.documento,
      rol: 'operador',
      licencias: row.licencias === '—' ? '' : row.licencias,
      telefono: row.telefono === '—' ? '' : row.telefono,
      email: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (row: ReturnType<typeof mapTripulacionToUI>) => {
    if (!confirm('¿Eliminar este tripulante?')) return;
    try {
      await api.deleteTripulante(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && tripulacion.length === 0)
    return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Tripulación</h2>
          <p className="text-muted-foreground">Administra el personal operativo de las embarcaciones</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Tripulante
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Anchor className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-primary">Personal Operativo</p>
          <p className="text-sm text-muted-foreground mt-1">
            La tripulación representa a todos los que viajan operando la embarcación: operadores fluviales, auxiliares, motoristas y personal de apoyo.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Tripulante' : 'Registrar Nuevo Tripulante'}
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
              <label className="block text-sm font-medium mb-2">Rol</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="operador">Operador Fluvial</option>
                <option value="segundo-operador">Segundo Operador</option>
                <option value="auxiliar-cubierta">Auxiliar de Cubierta</option>
                <option value="motorista">Motorista</option>
                <option value="auxiliar-pasajeros">Auxiliar de Pasajeros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Licencias</label>
              <input
                type="text"
                value={formData.licencias}
                onChange={(e) => setFormData({ ...formData, licencias: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
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
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Guardar Tripulante
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Tripulantes</p>
          <p className="text-2xl font-bold text-foreground">{tripulacion.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">
            {tripulacion.filter((t) => t.estado === 'activo').length}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tripulacion}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
