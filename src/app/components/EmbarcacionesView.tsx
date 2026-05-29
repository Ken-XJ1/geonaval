import { useState, useEffect, Fragment } from 'react';
import { Plus, Ship, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapEmbarcacionToUI } from '../../services/mappers';

export function EmbarcacionesView() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [embarcacionEstado, setEmbarcacionEstado] = useState<{
    id: number;
    nombre: string;
    estadoActual: string;
  } | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [tiempoMantenimiento, setTiempoMantenimiento] = useState({
    cantidad: '',
    unidad: 'dias',
  });
  const [motivoMantenimiento, setMotivoMantenimiento] = useState('');
  const [propietariosList, setPropietariosList] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detallesCache, setDetallesCache] = useState<
    Record<
      number,
      {
        embarcacion: Record<string, unknown>;
        viajes: Array<{
          id: number;
          origen: string;
          destino: string;
          estado: string;
          operadores?: string;
        }>;
        tripulacion: Array<{ id: number; nombre: string; rol: string }>;
      }
    >
  >({});
  const [loadingDetalles, setLoadingDetalles] = useState<number | null>(null);
  const [assignViaje, setAssignViaje] = useState('');
  const [assignTripulante, setAssignTripulante] = useState('');
  const [assignPropietario, setAssignPropietario] = useState('');
  const [tripulacionList, setTripulacionList] = useState<
    { id: number; nombre: string; rol: string }[]
  >([]);
  const [todosLosViajes, setTodosLosViajes] = useState<
    { id: number; origen: string; destino: string; estado: string }[]
  >([]);
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [embs, props, trip, viajes] = await Promise.all([
        api.getEmbarcaciones() as Promise<Record<string, unknown>[]>,
        api.getPropietarios() as Promise<Record<string, unknown>[]>,
        api.getTripulacion() as Promise<Record<string, unknown>[]>,
        api.getViajes() as Promise<Record<string, unknown>[]>,
      ]);
      const propMap = new Map(
        props.map((p) => [p.id, p.nombre as string])
      );
      setPropietariosList(
        props.map((p) => ({ id: Number(p.id), nombre: p.nombre as string }))
      );
      setTripulacionList(
        trip
          .filter((t) => t.activo !== false)
          .map((t) => ({
            id: Number(t.id),
            nombre: t.nombre as string,
            rol: t.rol as string,
          }))
      );
      setTodosLosViajes(
        viajes
          .filter((v) => v.estado === 'programado' || v.estado === 'en_curso')
          .map((v) => ({
            id: Number(v.id),
            origen: v.origen as string,
            destino: v.destino as string,
            estado: v.estado as string,
          }))
      );
      setEmbarcaciones(
        embs.map((e) =>
          mapEmbarcacionToUI(
            e,
            (e.propietario_nombre as string) ||
              propMap.get(e.propietario_id as number) ||
              '—'
          )
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setEmbarcaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        capacidad_pasajeros: parseInt(formData.capacidad, 10),
        motor: formData.caracteristicas || null,
        potencia: null,
        dimensiones: null,
        estado: formData.estado.replace('fuera-servicio', 'fuera_servicio'),
        propietario_id: formData.propietario
          ? parseInt(formData.propietario, 10)
          : null,
      };
      if (editingId) await api.updateEmbarcacion(editingId, body);
      else await api.createEmbarcacion(body);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleToggleDetalles = async (emb: ReturnType<typeof mapEmbarcacionToUI>) => {
    if (expandedRow === emb.id) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(emb.id);
    setAssignViaje('');
    setAssignTripulante('');
    setAssignPropietario('');
    setLoadingDetalles(emb.dbId);
    try {
      const data = (await api.getEmbarcacionDetalles(emb.dbId)) as {
        embarcacion: Record<string, unknown>;
        viajes: Array<{
          id: number;
          origen: string;
          destino: string;
          estado: string;
          operadores?: string;
        }>;
        tripulacion: Array<{ id: number; nombre: string; rol: string }>;
      };
      setDetallesCache((prev) => ({ ...prev, [emb.dbId]: data }));
      if (data.embarcacion.propietario_id) {
        setAssignPropietario(String(data.embarcacion.propietario_id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar detalles');
    } finally {
      setLoadingDetalles(null);
    }
  };

  const handleAsignarTripulacion = async (embDbId: number) => {
    if (!assignViaje || !assignTripulante) {
      setError('Selecciona un viaje y un tripulante');
      return;
    }
    try {
      await api.assignTripulacionViaje(
        parseInt(assignViaje, 10),
        parseInt(assignTripulante, 10)
      );
      const data = (await api.getEmbarcacionDetalles(embDbId)) as typeof detallesCache[number];
      setDetallesCache((prev) => ({ ...prev, [embDbId]: data }));
      setAssignViaje('');
      setAssignTripulante('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar tripulación');
    }
  };

  const handleAsignarPropietario = async (emb: ReturnType<typeof mapEmbarcacionToUI>) => {
    if (!assignPropietario) {
      setError('Selecciona un propietario');
      return;
    }
    try {
      const raw = (await api.getEmbarcaciones()) as Record<string, unknown>[];
      const current = raw.find((e) => Number(e.id) === emb.dbId);
      if (!current) throw new Error('Embarcación no encontrada');
      await api.updateEmbarcacion(emb.dbId, {
        nic: current.nic,
        nombre: current.nombre,
        tipo: current.tipo,
        capacidad_pasajeros: current.capacidad_pasajeros,
        motor: current.motor,
        potencia: current.potencia,
        dimensiones: current.dimensiones,
        estado: current.estado,
        propietario_id: parseInt(assignPropietario, 10),
      });
      await load();
      const data = (await api.getEmbarcacionDetalles(emb.dbId)) as typeof detallesCache[number];
      setDetallesCache((prev) => ({ ...prev, [emb.dbId]: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar propietario');
    }
  };

  const handleDelete = async (dbId: number) => {
    if (!confirm('¿Eliminar esta embarcación?')) return;
    try {
      await api.deleteEmbarcacion(dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const handleCambiarEstado = async () => {
    if (!embarcacionEstado || !nuevoEstado) return;
    
    // Validar tiempo de mantenimiento si el nuevo estado lo requiere
    if ((nuevoEstado === 'mantenimiento' || nuevoEstado === 'fuera_servicio') && !tiempoMantenimiento.cantidad) {
      setError('Debes especificar el tiempo estimado de mantenimiento/fuera de servicio');
      return;
    }

    try {
      const raw = (await api.getEmbarcaciones()) as Record<string, unknown>[];
      const current = raw.find((e) => Number(e.id) === embarcacionEstado.id);
      if (!current) throw new Error('Embarcación no encontrada');

      let fecha_inicio_mantenimiento = null;
      let fecha_fin_mantenimiento_estimada = null;
      let tiempo_mantenimiento_estimado = null;
      let motivo_mantenimiento_value = null;

      if (nuevoEstado === 'mantenimiento' || nuevoEstado === 'fuera_servicio') {
        fecha_inicio_mantenimiento = new Date().toISOString();
        const cantidad = parseInt(tiempoMantenimiento.cantidad, 10);
        const fechaFin = new Date();
        
        if (tiempoMantenimiento.unidad === 'dias') {
          fechaFin.setDate(fechaFin.getDate() + cantidad);
          tiempo_mantenimiento_estimado = `${cantidad} día${cantidad !== 1 ? 's' : ''}`;
        } else if (tiempoMantenimiento.unidad === 'meses') {
          fechaFin.setMonth(fechaFin.getMonth() + cantidad);
          tiempo_mantenimiento_estimado = `${cantidad} mes${cantidad !== 1 ? 'es' : ''}`;
        } else if (tiempoMantenimiento.unidad === 'años') {
          fechaFin.setFullYear(fechaFin.getFullYear() + cantidad);
          tiempo_mantenimiento_estimado = `${cantidad} año${cantidad !== 1 ? 's' : ''}`;
        }
        
        fecha_fin_mantenimiento_estimada = fechaFin.toISOString();
        motivo_mantenimiento_value = motivoMantenimiento || null;
      }

      await api.updateEmbarcacion(embarcacionEstado.id, {
        nic: current.nic,
        nombre: current.nombre,
        tipo: current.tipo,
        capacidad_pasajeros: current.capacidad_pasajeros,
        motor: current.motor,
        potencia: current.potencia,
        dimensiones: current.dimensiones,
        estado: nuevoEstado,
        propietario_id: current.propietario_id,
        tiempo_mantenimiento_estimado,
        fecha_inicio_mantenimiento,
        fecha_fin_mantenimiento_estimada,
        motivo_mantenimiento: motivo_mantenimiento_value,
      });

      setShowEstadoModal(false);
      setEmbarcacionEstado(null);
      setNuevoEstado('');
      setTiempoMantenimiento({ cantidad: '', unidad: 'dias' });
      setMotivoMantenimiento('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error && embarcaciones.length === 0)
    return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
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
                {propietariosList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
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
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full">
            <thead className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider">
                  Embarcación
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider">
                  Viajes Asignados
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-black uppercase tracking-wider">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {embarcaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No hay registros aún
                  </td>
                </tr>
              ) : null}
              {embarcaciones.map((emb) => {
                const detalles = detallesCache[emb.dbId];
                return (
                <Fragment key={emb.id}>
                  <tr className="hover:bg-muted/50 transition-colors">
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
                        type="button"
                        onClick={() => handleToggleDetalles(emb)}
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
                        {loadingDetalles === emb.dbId ? (
                          <p className="text-sm text-muted-foreground">Cargando detalles...</p>
                        ) : (
                        <>
                        {/* Alerta Fuera de Servicio */}
                        {emb.estado === 'fuera_servicio' && (
                          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
                            <span className="text-red-600 text-xl flex-shrink-0">🚫</span>
                            <div>
                              <p className="font-semibold text-red-900">Embarcación fuera de servicio</p>
                              <p className="text-sm text-red-700 mt-1">
                                No se pueden asignar viajes ni tripulación a esta embarcación mientras esté fuera de servicio.
                                Cambia su estado a <strong>Operativa</strong> para habilitarla.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Alerta de Mantenimiento */}
                        {(emb.estado === 'mantenimiento' || emb.estado === 'fuera_servicio') && detalles?.embarcacion && (
                          <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Wrench className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                                  <span>
                                    {emb.estado === 'mantenimiento' ? 'EMBARCACIÓN EN MANTENIMIENTO' : 'EMBARCACIÓN FUERA DE SERVICIO'}
                                  </span>
                                </h4>

                                <div className="space-y-3">
                                  {detalles.embarcacion.tiempo_mantenimiento_estimado && (
                                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                                      <p className="text-sm font-semibold text-orange-900 mb-1">⏱️ Tiempo Estimado:</p>
                                      <p className="text-lg font-bold text-orange-800">
                                        {detalles.embarcacion.tiempo_mantenimiento_estimado}
                                      </p>
                                    </div>
                                  )}

                                  {detalles.embarcacion.fecha_inicio_mantenimiento && (
                                    <div>
                                      <p className="text-xs font-semibold text-orange-900 mb-1">📅 Fecha de Inicio:</p>
                                      <p className="text-sm text-orange-800">
                                        {new Date(detalles.embarcacion.fecha_inicio_mantenimiento).toLocaleDateString('es-CO', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  )}

                                  {detalles.embarcacion.motivo_mantenimiento && (
                                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                                      <p className="text-xs font-semibold text-orange-900 mb-1">📝 Motivo:</p>
                                      <p className="text-sm text-orange-700">
                                        {detalles.embarcacion.motivo_mantenimiento}
                                      </p>
                                    </div>
                                  )}

                                  {!detalles.embarcacion.tiempo_mantenimiento_estimado && (
                                    <p className="text-sm text-orange-700 italic">
                                      No se especificó información de mantenimiento. Usa el botón "Cambiar Estado" para agregar detalles.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Tripulación Asignada:</h4>
                            {detalles?.tripulacion && detalles.tripulacion.length > 0 ? (
                              <ul className="text-sm space-y-1 mb-4">
                                {detalles.tripulacion.map((t) => (
                                  <li key={t.id} className="text-muted-foreground">
                                    • {t.nombre} ({t.rol})
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic mb-4">
                                Sin tripulación asignada
                              </p>
                            )}
                            {emb.estado === 'operativa' && (
                            <div className="p-3 bg-white rounded-lg border border-border space-y-2">
                              <p className="text-xs font-medium text-primary">
                                Asignar operador a un viaje
                              </p>
                              <select
                                value={assignViaje}
                                onChange={(e) => setAssignViaje(e.target.value)}
                                className="w-full text-sm px-3 py-2 bg-muted rounded-lg border border-border"
                              >
                                <option value="">Seleccionar viaje</option>
                                {todosLosViajes.map((v) => (
                                  <option key={v.id} value={String(v.id)}>
                                    V-{v.id}: {v.origen} - {v.destino} ({v.estado})
                                  </option>
                                ))}
                              </select>
                              <select
                                value={assignTripulante}
                                onChange={(e) => setAssignTripulante(e.target.value)}
                                className="w-full text-sm px-3 py-2 bg-muted rounded-lg border border-border"
                              >
                                <option value="">Seleccionar tripulante</option>
                                {tripulacionList.map((t) => (
                                  <option key={t.id} value={String(t.id)}>
                                    {t.nombre} — {t.rol}
                                  </option>
                                ))}
                              </select>
                              {todosLosViajes.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                  No hay viajes programados. Crea uno en Viajes (Zarpe).
                                </p>
                              )}
                              <button
                                type="button"
                                disabled={!assignViaje || !assignTripulante}
                                onClick={() => handleAsignarTripulacion(emb.dbId)}
                                className="text-sm px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                Asignar tripulación
                              </button>
                            </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Viajes:</h4>
                            {detalles?.viajes && detalles.viajes.length > 0 ? (
                              <ul className="text-sm space-y-1 mb-4">
                                {detalles.viajes.map((v) => (
                                  <li key={v.id} className="text-muted-foreground">
                                    • V-{v.id}: {v.origen} - {v.destino} ({v.estado})
                                    {v.operadores ? ` — ${v.operadores}` : ' — sin operador'}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic mb-4">
                                Sin viajes asignados. Programa uno en Viajes (Zarpe).
                              </p>
                            )}
                            {emb.estado !== 'fuera_servicio' && (emb.propietario === '—' || !detalles?.embarcacion?.propietario_id) && (
                              <div className="p-3 bg-white rounded-lg border border-border space-y-2">
                                <p className="text-xs font-medium text-primary">
                                  Asignar propietario
                                </p>
                                <select
                                  value={assignPropietario}
                                  onChange={(e) => setAssignPropietario(e.target.value)}
                                  className="w-full text-sm px-3 py-2 bg-muted rounded-lg border border-border"
                                >
                                  <option value="">Seleccionar propietario</option>
                                  {propietariosList.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                      {p.nombre}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAsignarPropietario(emb)}
                                  className="text-sm px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                  Guardar propietario
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botón para cambiar estado */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <button
                            type="button"
                            onClick={() => {
                              setEmbarcacionEstado({
                                id: emb.dbId,
                                nombre: emb.nombre,
                                estadoActual: emb.estado,
                              });
                              setNuevoEstado(emb.estado);
                              setShowEstadoModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Wrench className="w-4 h-4" />
                            Cambiar Estado de Embarcación
                          </button>
                        </div>
                        </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para cambiar estado */}
      {showEstadoModal && embarcacionEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Cambiar Estado de Embarcación</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>{embarcacionEstado.nombre}</strong>
              <br />
              Estado actual: <StatusBadge status={embarcacionEstado.estadoActual} />
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nuevo Estado</label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                >
                  <option value="operativa">Operativa</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="fuera_servicio">Fuera de Servicio</option>
                  <option value="inspeccion">En Inspección</option>
                </select>
              </div>

              {(nuevoEstado === 'mantenimiento' || nuevoEstado === 'fuera_servicio') && (
                <>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      ⚠️ Debes especificar el tiempo estimado de {nuevoEstado === 'mantenimiento' ? 'mantenimiento' : 'fuera de servicio'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tiempo Estimado *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        value={tiempoMantenimiento.cantidad}
                        onChange={(e) => setTiempoMantenimiento({ ...tiempoMantenimiento, cantidad: e.target.value })}
                        className="px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                        placeholder="Cantidad"
                        required
                      />
                      <select
                        value={tiempoMantenimiento.unidad}
                        onChange={(e) => setTiempoMantenimiento({ ...tiempoMantenimiento, unidad: e.target.value })}
                        className="px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                      >
                        <option value="dias">Días</option>
                        <option value="meses">Meses</option>
                        <option value="años">Años</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Motivo (opcional)</label>
                    <textarea
                      value={motivoMantenimiento}
                      onChange={(e) => setMotivoMantenimiento(e.target.value)}
                      className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                      rows={3}
                      placeholder="Describe el motivo del mantenimiento o fuera de servicio..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEstadoModal(false);
                  setEmbarcacionEstado(null);
                  setNuevoEstado('');
                  setTiempoMantenimiento({ cantidad: '', unidad: 'dias' });
                  setMotivoMantenimiento('');
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCambiarEstado}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar Cambio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
