import { useState, useEffect, useCallback } from 'react';
import { Plus, LockOpen, Lock } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapUsuarioToUI } from '../../services/mappers';
import Swal from 'sweetalert2';

export function UsuariosView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<ReturnType<typeof mapUsuarioToUI>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'operador',
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

  useEffect(() => { load(); }, [load]);

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
          Autoridad: 'bg-purple-100 text-purple-700',
        };
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-700'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: string, row: ReturnType<typeof mapUsuarioToUI>) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={value} />
          {value === 'bloqueado' && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <Lock className="w-3 h-3" />
              Bloqueada
            </span>
          )}
        </div>
      ),
    },
    { key: 'ultimoAcceso', label: 'Registrado' },
    {
      key: 'acciones_extra',
      label: 'Seguridad',
      render: (_: unknown, row: ReturnType<typeof mapUsuarioToUI>) => {
        if (row.rolDb === 'administrador') {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        if (row.bloqueada) {
          return (
            <button
              type="button"
              onClick={() => handleDesbloquear(row)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
            >
              <LockOpen className="w-3.5 h-3.5" />
              Desbloquear
            </button>
          );
        }
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <LockOpen className="w-3 h-3" />
            Sin bloqueo
          </span>
        );
      },
    },
  ];

  const handleDesbloquear = async (row: ReturnType<typeof mapUsuarioToUI>) => {
    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Desbloquear cuenta?',
      html: `
        <p class="text-gray-600">¿Deseas desbloquear la cuenta de <strong>${row.nombre}</strong>?</p>
        <p class="text-sm text-gray-500 mt-2">El usuario podrá volver a iniciar sesión normalmente.</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, desbloquear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.desbloquearUsuario(row.dbId);
      await Swal.fire({
        icon: 'success',
        title: '✅ Cuenta Desbloqueada',
        text: `La cuenta de ${row.nombre} ha sido desbloqueada exitosamente.`,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      await load();
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e instanceof Error ? e.message : 'No se pudo desbloquear la cuenta',
        confirmButtonColor: '#dc2626',
      });
    }
  };

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
        await Swal.fire({
          icon: 'success',
          title: 'Usuario actualizado',
          timer: 1500,
          showConfirmButton: false,
          timerProgressBar: true,
        });
      } else {
        await api.createUsuario({
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          password: formData.password,
        });
        await Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: `La cuenta de ${formData.nombre} fue creada exitosamente.`,
          timer: 2000,
          showConfirmButton: false,
          timerProgressBar: true,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ nombre: '', email: '', rol: 'operador', password: '' });
      await load();
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: e instanceof Error ? e.message : 'Error desconocido',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const handleEdit = (row: ReturnType<typeof mapUsuarioToUI>) => {
    setEditingId(row.dbId);
    setFormData({ nombre: row.nombre, email: row.email, rol: row.rolDb, password: '' });
    setShowForm(true);
  };

  const handleDelete = async (row: ReturnType<typeof mapUsuarioToUI>) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar usuario?',
      html: `<p>¿Estás seguro de eliminar a <strong>${row.nombre}</strong>?</p><p class="text-sm text-gray-500 mt-1">Esta acción no se puede deshacer.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.deleteUsuario(row.dbId);
      await Swal.fire({
        icon: 'success',
        title: 'Usuario eliminado',
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      await load();
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: e instanceof Error ? e.message : 'Error desconocido',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && usuarios.length === 0) return <ViewFeedback error={error} />;

  const bloqueadas = usuarios.filter(u => u.bloqueada).length;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administra los usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Alerta de cuentas bloqueadas */}
      {bloqueadas > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">
              {bloqueadas} cuenta{bloqueadas > 1 ? 's' : ''} bloqueada{bloqueadas > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600">
              Usa el botón "Desbloquear" en la columna Seguridad para restaurar el acceso.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input type="text" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Correo Electrónico</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rol</label>
              <select value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required>
                <option value="administrador">Administrador</option>
                <option value="operador">Operador Fluvial</option>
                <option value="autoridad">Autoridad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Contraseña {editingId && <span className="text-muted-foreground font-normal">(dejar vacío para no cambiar)</span>}
              </label>
              <input type="password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required={!editingId} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                {editingId ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
          <p className="text-2xl font-bold text-foreground">{usuarios.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Activos</p>
          <p className="text-2xl font-bold text-green-600">
            {usuarios.filter(u => u.estado === 'activo').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Bloqueados</p>
          <p className="text-2xl font-bold text-red-600">{bloqueadas}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Inactivos</p>
          <p className="text-2xl font-bold text-gray-500">
            {usuarios.filter(u => u.estado === 'inactivo').length}
          </p>
        </div>
      </div>

      <DataTable columns={columns} data={usuarios} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
