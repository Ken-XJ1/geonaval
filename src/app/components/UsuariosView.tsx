import { useState } from 'react';
import { Plus, User, Mail, Shield, Trash2, Edit } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';

export function UsuariosView() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'cliente',
    password: '',
  });

  const usuarios = [
    {
      id: 'U-001',
      nombre: 'Admin Sistema',
      email: 'admin@geonaval.com',
      rol: 'Administrador',
      estado: 'activo' as const,
      ultimoAcceso: '09/05/2026 10:30',
    },
    {
      id: 'U-002',
      nombre: 'Juan Pérez García',
      email: 'juan.perez@email.com',
      rol: 'Operador Fluvial',
      estado: 'activo' as const,
      ultimoAcceso: '09/05/2026 08:15',
    },
    {
      id: 'U-003',
      nombre: 'María González',
      email: 'maria.gonzalez@email.com',
      rol: 'Operador Fluvial',
      estado: 'activo' as const,
      ultimoAcceso: '08/05/2026 16:45',
    },
    {
      id: 'U-004',
      nombre: 'Autoridad Marina',
      email: 'autoridad@maritima.gov.co',
      rol: 'Autoridad',
      estado: 'activo' as const,
      ultimoAcceso: '09/05/2026 09:00',
    },
    {
      id: 'U-005',
      nombre: 'Roberto Sánchez',
      email: 'roberto.sanchez@email.com',
      rol: 'Cliente',
      estado: 'inactivo' as const,
      ultimoAcceso: '01/05/2026 14:20',
    },
  ];

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
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorMap[value]}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: any) => <StatusBadge status={value} />,
    },
    { key: 'ultimoAcceso', label: 'Último Acceso' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Nuevo usuario:', formData);
    setShowForm(false);
    setFormData({
      nombre: '',
      email: '',
      rol: 'cliente',
      password: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administra los usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Crear Nuevo Usuario</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Juan Pérez"
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
                placeholder="usuario@email.com"
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
                placeholder="••••••••"
                required
              />
            </div>

            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-primary font-medium mb-2">Permisos por Rol:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Administrador:</strong> Acceso completo al sistema</li>
                <li>• <strong>Operador Fluvial:</strong> Gestión de viajes y embarcaciones asignadas</li>
                <li>• <strong>Cliente:</strong> Consulta de viajes y reservas</li>
                <li>• <strong>Autoridad:</strong> Consulta de información y reportes oficiales</li>
              </ul>
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
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
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
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Administradores</p>
          <p className="text-2xl font-bold text-red-600">
            {usuarios.filter((u) => u.rol === 'Administrador').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Operadores</p>
          <p className="text-2xl font-bold text-primary">
            {usuarios.filter((u) => u.rol === 'Operador Fluvial').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={usuarios}
        onView={(row) => console.log('Ver', row)}
        onEdit={(row) => console.log('Editar', row)}
        onDelete={(row) => console.log('Eliminar', row)}
      />
    </div>
  );
}
