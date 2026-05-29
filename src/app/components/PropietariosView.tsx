import { useState, useEffect, useCallback } from 'react';
import { Plus, Building, User } from 'lucide-react';
import { DataTable } from './DataTable';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapPropietarioToUI } from '../../services/mappers';

export function PropietariosView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'empresa'>('natural');
  const [propietarios, setPropietarios] = useState<
    ReturnType<typeof mapPropietarioToUI>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documento: '',
    telefono: '',
    direccion: '',
    razonSocial: '',
    nit: '',
    telefonoEmpresa: '',
    direccionEmpresa: '',
    camaraComercio: '',
    matriculaMercantil: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await api.getPropietarios()) as Record<string, unknown>[];
      setPropietarios(rows.map(mapPropietarioToUI));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setPropietarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'nombre', label: 'Nombre / Razón Social' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'documento', label: 'Documento / NIT' },
    { key: 'telefono', label: 'Teléfono' },
    {
      key: 'embarcaciones',
      label: 'Embarcaciones',
      render: (value: number) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
  ];

  const resetForm = () => {
    setFormData({
      nombreCompleto: '',
      documento: '',
      telefono: '',
      direccion: '',
      razonSocial: '',
      nit: '',
      telefonoEmpresa: '',
      direccionEmpresa: '',
      camaraComercio: '',
      matriculaMercantil: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body =
        tipoPersona === 'natural'
          ? {
              tipo: 'natural',
              nombre: formData.nombreCompleto,
              identificacion: formData.documento,
              telefono: formData.telefono,
              direccion: formData.direccion,
            }
          : {
              tipo: 'empresa',
              nombre: formData.razonSocial,
              identificacion: formData.nit,
              nit: formData.nit,
              telefono: formData.telefonoEmpresa,
              direccion: formData.direccionEmpresa,
              matricula_mercantil: formData.matriculaMercantil,
            };
      if (editingId) await api.updatePropietario(editingId, body);
      else await api.createPropietario(body);
      setShowForm(false);
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleEdit = (row: ReturnType<typeof mapPropietarioToUI>) => {
    setEditingId(row.dbId);
    if (row.tipo === 'Empresa') {
      setTipoPersona('empresa');
      setFormData({
        ...formData,
        razonSocial: row.nombre,
        nit: row.documento.replace('NIT ', ''),
        telefonoEmpresa: row.telefono,
        direccionEmpresa: row.direccion === '—' ? '' : row.direccion,
        matriculaMercantil: row.matriculaMercantil === '—' ? '' : row.matriculaMercantil,
      });
    } else {
      setTipoPersona('natural');
      setFormData({
        ...formData,
        nombreCompleto: row.nombre,
        documento: row.documento,
        telefono: row.telefono,
        direccion: row.direccion === '—' ? '' : row.direccion,
      });
    }
    setShowForm(true);
  };

  const handleDelete = async (row: ReturnType<typeof mapPropietarioToUI>) => {
    if (!confirm('¿Eliminar este propietario?')) return;
    try {
      await api.deletePropietario(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && propietarios.length === 0)
    return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Propietarios</h2>
          <p className="text-muted-foreground">Administra el registro de propietarios de embarcaciones</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Propietario
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Propietario' : 'Registrar Nuevo Propietario'}
          </h3>
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setTipoPersona('natural')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                tipoPersona === 'natural'
                  ? 'border-primary bg-blue-50 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Persona Natural</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoPersona('empresa')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                tipoPersona === 'empresa'
                  ? 'border-primary bg-blue-50 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Building className="w-5 h-5" />
              <span className="font-medium">Empresa</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            {tipoPersona === 'natural' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dirección</label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Razón Social</label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">NIT</label>
                  <input
                    type="text"
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefonoEmpresa}
                    onChange={(e) => setFormData({ ...formData, telefonoEmpresa: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dirección</label>
                  <input
                    type="text"
                    value={formData.direccionEmpresa}
                    onChange={(e) => setFormData({ ...formData, direccionEmpresa: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Matrícula Mercantil</label>
                  <input
                    type="text"
                    value={formData.matriculaMercantil}
                    onChange={(e) => setFormData({ ...formData, matriculaMercantil: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar Propietario
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        columns={columns}
        data={propietarios}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
