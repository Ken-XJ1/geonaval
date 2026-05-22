import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapUsuarioToUI } from '../../services/mappers';

export function UsuariosView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<ReturnType<typeof mapUsuarioToUI>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'cliente',
    password: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await api.getUsuarios()) as Record<string, unknown>[];
      setUsuarios(rows.map(mapUsuarioToUI));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Correo Electrónico' },
    {
      key: 'rol',
      label: 'Rol',
      render: (value: string) => {
        const colorMap: Record<string, string> = {
          Administrador: 'bg-red-100 text-red-700',
          'Operador Fluvial': 'bg-blue-100 text-blue-700',
          Cliente: 'bg-green-100 text-green-700',
          Autoridad: 'bg-purple-100 text-purple-700',
        };
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string) => <StatusBadge status={value} />,
    },
    { key: 'ultimoAcceso', label: 'Registrado' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateUsuario(editingId, {
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          activo: true,
          ...(formData.password ? { password: formData.password } : {}),
        });
      } else {
        await api.createUsuario({
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          password: formData.password,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ nombre: '', email: '', rol: 'cliente', password: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleEdit = (row: ReturnType<typeof mapUsuarioToUI>) => {
    setEditingId(row.dbId);
    setFormData({
      nombre: row.nombre,
      email: row.email,
      rol: row.rolDb,
      password: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (row: ReturnType<typeof mapUsuarioToUI>) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.deleteUsuario(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && usuarios.length === 0) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administra los usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Correo Electrónico</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                required
              >
                <option value="administrador">Administrador</option>
                <option value="operador">Operador Fluvial</option>
                <option value="cliente">Cliente</option>
                <option value="autoridad">Autoridad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required={!editingId}
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                {editingId ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
          <p className="text-2xl font-bold text-foreground">{usuarios.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">
            {usuarios.filter((u) => u.estado === 'activo').length}
          </p>
        </div>
      </div>

      <DataTable columns={columns} data={usuarios} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
