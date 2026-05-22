import { useState, useEffect } from 'react';
import { Plus, Building, User } from 'lucide-react';
import { DataTable } from './DataTable';
import { fetchPropietarios } from '../../services/api';
import { mapPropietarioToUI } from '../../services/mappers';

export function PropietariosView() {
  const [showForm, setShowForm] = useState(false);
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'empresa'>('natural');
  const [formData, setFormData] = useState({
    // Persona Natural
    nombreCompleto: '',
    documento: '',
    telefono: '',
    direccion: '',
    // Empresa
    razonSocial: '',
    nit: '',
    telefonoEmpresa: '',
    direccionEmpresa: '',
    camaraComercio: '',
    matriculaMercantil: '',
  });

  const [propietarios, setPropietarios] = useState<
    ReturnType<typeof mapPropietarioToUI>[]
  >([]);

  useEffect(() => {
    fetchPropietarios()
      .then((rows) => setPropietarios(rows.map(mapPropietarioToUI)))
      .catch(() => setPropietarios([]));
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Nuevo propietario:', formData, 'Tipo:', tipoPersona);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Propietarios</h2>
          <p className="text-muted-foreground">Administra el registro de propietarios de embarcaciones</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Propietario
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Registrar Nuevo Propietario</h3>

          {/* Tipo de Persona */}
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
                    placeholder="Juan Pérez García"
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
                    placeholder="1234567890"
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
                    placeholder="+57 300 1234567"
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
                    placeholder="Calle 10 # 5-20, Quibdó"
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
                    placeholder="Naviera del Chocó S.A.S."
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
                    placeholder="900123456-7"
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
                    placeholder="+57 300 7654321"
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
                    placeholder="Av. Principal # 15-30, Quibdó"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cámara de Comercio</label>
                  <input
                    type="text"
                    value={formData.camaraComercio}
                    onChange={(e) => setFormData({ ...formData, camaraComercio: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    placeholder="CC Quibdó"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Matrícula Mercantil</label>
                  <input
                    type="text"
                    value={formData.matriculaMercantil}
                    onChange={(e) => setFormData({ ...formData, matriculaMercantil: e.target.value })}
                    className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                    placeholder="MM-123456"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
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
                Guardar Propietario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={propietarios}
        onView={(row) => console.log('Ver', row)}
        onEdit={(row) => console.log('Editar', row)}
        onDelete={(row) => console.log('Eliminar', row)}
      />
    </div>
  );
}
