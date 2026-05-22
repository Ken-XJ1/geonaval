import { useState, useEffect } from 'react';
import { Plus, Ship, ChevronDown, ChevronUp, MapPin, Wrench } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { fetchEmbarcaciones, fetchPropietarios } from '../../services/api';
import { mapEmbarcacionToUI } from '../../services/mappers';

export function EmbarcacionesView() {
  const [showForm, setShowForm] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'lancha',
    capacidad: '',
    estado: 'operativa',
    propietario: '',
    caracteristicas: '',
  });

  const [embarcaciones, setEmbarcaciones] = useState<
    ReturnType<typeof mapEmbarcacionToUI>[]
  >([]);

  useEffect(() => {
    Promise.all([fetchEmbarcaciones(), fetchPropietarios()])
      .then(([embs, props]) => {
        const propMap = new Map(
          props.map((p) => [p.id, p.nombre as string])
        );
        setEmbarcaciones(
          embs.map((e) =>
            mapEmbarcacionToUI(
              e,
              propMap.get(e.propietario_id as number) || '—'
            )
          )
        );
      })
      .catch(() => setEmbarcaciones([]));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Nueva embarcación:', formData);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Embarcaciones</h2>
          <p className="text-muted-foreground">Administra el registro de embarcaciones fluviales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Embarcación
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Registrar Nueva Embarcación</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de Embarcación</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ferry San José"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="lancha">Lancha</option>
                <option value="ferry">Ferry</option>
                <option value="bote">Bote</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Capacidad de Pasajeros</label>
              <input
                type="number"
                value={formData.capacidad}
                onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="operativa">Operativa</option>
                <option value="mantenimiento">En Mantenimiento</option>
                <option value="fuera-servicio">Fuera de Servicio</option>
                <option value="inspeccion">En Inspección</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Propietario Asignado</label>
              <select
                value={formData.propietario}
                onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar propietario</option>
                <option value="naviera-choco">Naviera del Chocó</option>
                <option value="juan-perez">Juan Pérez</option>
                <option value="maria-gonzalez">María González</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Características Técnicas</label>
              <textarea
                value={formData.caracteristicas}
                onChange={(e) => setFormData({ ...formData, caracteristicas: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                rows={3}
                placeholder="Descripción de características técnicas..."
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
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar Embarcación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Embarcaciones</p>
          <p className="text-2xl font-bold text-foreground">{embarcaciones.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Operativas</p>
          <p className="text-2xl font-bold text-green-600">
            {embarcaciones.filter((e) => e.estado === 'operativa').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">En Mantenimiento</p>
          <p className="text-2xl font-bold text-orange-600">
            {embarcaciones.filter((e) => e.estado === 'mantenimiento').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Viajes Totales</p>
          <p className="text-2xl font-bold text-primary">
            {embarcaciones.reduce((sum, e) => sum + e.viajesAsignados, 0)}
          </p>
        </div>
      </div>

      {/* Enhanced Table with Expandable Rows */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Embarcación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Viajes Asignados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {embarcaciones.map((emb) => (
                <>
                  <tr key={emb.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{emb.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{emb.tipo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{emb.propietario}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge status={emb.estado} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-medium text-primary">{emb.viajesAsignados}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setExpandedRow(expandedRow === emb.id ? null : emb.id)}
                        className="flex items-center gap-1 text-primary hover:text-primary/80"
                      >
                        {expandedRow === emb.id ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Ver
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === emb.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-blue-50">
                        {/* Alerta de Mantenimiento */}
                        {emb.estado === 'mantenimiento' && emb.ubicacionMantenimiento && (
                          <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Wrench className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                  <span>EMBARCACIÓN EN MANTENIMIENTO</span>
                                  <span className="text-xs px-2 py-0.5 bg-orange-200 rounded-full">
                                    {emb.detallesMantenimiento?.tipo}
                                  </span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <div className="flex items-start gap-2 mb-2">
                                      <MapPin className="w-4 h-4 text-orange-600 mt-0.5" />
                                      <div>
                                        <p className="text-sm font-semibold text-orange-900">Ubicación Actual:</p>
                                        <p className="text-sm text-orange-800">{emb.ubicacionMantenimiento.lugar}</p>
                                        <p className="text-xs text-orange-700">{emb.ubicacionMantenimiento.direccion}</p>
                                        <p className="text-xs text-orange-600 font-mono mt-1">
                                          📍 {emb.ubicacionMantenimiento.coordenadas}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-sm font-semibold text-orange-900 mb-2">Detalles del Mantenimiento:</p>
                                    <div className="text-sm space-y-1">
                                      <p className="text-orange-800">
                                        <strong>Ingreso:</strong> {emb.detallesMantenimiento?.fechaIngreso}
                                      </p>
                                      <p className="text-orange-800">
                                        <strong>Salida Estimada:</strong> {emb.detallesMantenimiento?.fechaEstimadaSalida}
                                      </p>
                                      <p className="text-orange-700 text-xs mt-2">
                                        {emb.detallesMantenimiento?.descripcion}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Tripulación Asignada:</h4>
                            {emb.tripulacion.length > 0 ? (
                              <ul className="text-sm space-y-1">
                                {emb.tripulacion.map((t, i) => (
                                  <li key={i} className="text-muted-foreground">• {t}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Sin tripulación asignada</p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Viajes:</h4>
                            {emb.viajes.length > 0 ? (
                              <ul className="text-sm space-y-1">
                                {emb.viajes.map((v, i) => (
                                  <li key={i} className="text-muted-foreground">• {v}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Sin viajes asignados</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
