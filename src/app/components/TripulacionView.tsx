import { useState, useEffect, useCallback } from 'react';
import { Plus, Anchor } from 'lucide-react';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapTripulacionToUI, tripulacionRolToDb } from '../../services/mappers';

type TripRow = ReturnType<typeof mapTripulacionToUI>;

const EMPTY_FORM = {
  nombreCompleto: '',
  documento: '',
  rol: '',
  licencias: '',
  telefono: '',
  email: '',
  activo: true,
};

const rolDbToForm: Record<string, string> = {
  capitan: 'operador',
  copiloto: 'segundo-operador',
  ayudante_cubierta: 'auxiliar-cubierta',
  motorista: 'motorista',
  auxiliar_pasajeros: 'auxiliar-pasajeros',
};

export function TripulacionView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tripulacion, setTripulacion] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

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

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        nombre: formData.nombreCompleto,
        documento: formData.documento,
        rol: tripulacionRolToDb[formData.rol] || formData.rol || 'capitan',
        telefono: formData.telefono,
        email: formData.email,
        licencias: formData.licencias,
        activo: formData.activo,
      };
      if (editingId) await api.updateTripulante(editingId, body);
      else await api.createTripulante(body);
      setShowForm(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleEdit = (row: TripRow) => {
    setEditingId(row.dbId);
    setFormData({
      nombreCompleto: row.nombre,
      documento: row.documento,
      rol: rolDbToForm[row.rolDb] || 'operador',
      licencias: row.licencias === '—' ? '' : row.licencias,
      telefono: row.telefono === '—' ? '' : row.telefono,
      email: row.email || '',
      activo: row.estado === 'activo',
    });
    setShowForm(true);
  };

  const handleDelete = async (row: TripRow) => {
    if (!confirm('¿Eliminar este tripulante?')) return;
    try {
      await api.deleteTripulante(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && tripulacion.length === 0) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Tripulación</h2>
          <p className="text-muted-foreground">Administra el personal operativo de las embarcaciones</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Tripulante
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Anchor className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          La tripulación representa a todos los que viajan operando la embarcación: operadores fluviales, auxiliares, motoristas y personal de apoyo.
        </p>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Tripulante' : 'Registrar Nuevo Tripulante'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input type="text" value={formData.nombreCompleto}
                onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ej: Juan Carlos Pérez" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Documento</label>
              <input type="text" value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Número de cédula" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rol</label>
              <select value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required>
                <option value="">Seleccionar rol</option>
                <option value="operador">Operador Fluvial</option>
                <option value="segundo-operador">Segundo Operador</option>
                <option value="auxiliar-cubierta">Auxiliar de Cubierta</option>
                <option value="motorista">Motorista</option>
                <option value="auxiliar-pasajeros">Auxiliar de Pasajeros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select value={formData.activo ? 'activo' : 'inactivo'}
                onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'activo' })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input type="tel" value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="+57 300 0000000" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="correo@ejemplo.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Licencias</label>
              <input type="text" value={formData.licencias}
                onChange={(e) => setFormData({ ...formData, licencias: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ej: Licencia fluvial categoría A" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                {editingId ? 'Guardar cambios' : 'Registrar Tripulante'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-bold text-foreground">{tripulacion.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">{tripulacion.filter(t => t.estado === 'activo').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Con embarcación</p>
          <p className="text-2xl font-bold text-primary">{tripulacion.filter(t => t.embarcacion !== '—').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Viajes totales</p>
          <p className="text-2xl font-bold text-blue-600">{tripulacion.reduce((s, t) => s + Number(t.viajes || 0), 0)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Documento</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Embarcación</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Viajes</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Horario</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tripulacion.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No hay tripulantes registrados</td>
                </tr>
              ) : tripulacion.map((t) => (
                <tr key={t.dbId} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{t.nombre}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{t.documento}</td>
                  <td className="px-4 py-3 text-sm">{t.rol}</td>
                  <td className="px-4 py-3 text-sm">
                    {t.embarcacion === '—'
                      ? <span className="text-muted-foreground">—</span>
                      : <span className="font-medium text-primary">{t.embarcacion}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${Number(t.viajes) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {t.viajes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{t.horario}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      t.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {t.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(t)}
                        className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t)}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
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
