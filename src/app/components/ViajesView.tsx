import { useState, useEffect, useCallback } from 'react';
import { Plus, Navigation, Calendar, AlertTriangle, Filter, Download } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapViajeToUI } from '../../services/mappers';

export function ViajesView() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embarcacionesList, setEmbarcacionesList] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [conflictoDetectado, setConflictoDetectado] = useState(false);
  const [formData, setFormData] = useState({
    fechaSalida: '',
    horaSalida: '',
    fechaLlegada: '',
    horaLlegada: '',
    cierreInscripcionFecha: '',
    cierreInscripcionHora: '',
    origen: 'Quibdó',
    destino: '',
    embarcacion: '',
    operador: '',
    precio: '',
    pasajeros: [] as string[],
  });

  const [filtroEstado, setFiltroEstado] = useState<
    'todos' | 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
  >('todos');
  const [viajesLista, setViajesLista] = useState<
    ReturnType<typeof mapViajeToUI>[]
  >([]);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [viajes, embs] = await Promise.all([
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getEmbarcaciones() as Promise<Record<string, unknown>[]>,
      ]);
      const embMap = new Map(embs.map((e) => [e.id, e.nombre as string]));
      setEmbarcacionesList(
        embs.map((e) => ({
          id: Number(e.id),
          nombre: e.nombre as string,
          capacidad: Number(e.capacidad_pasajeros || 0),
        }))
      );
      setViajesLista(
        viajes.map((v) =>
          mapViajeToUI(
            v,
            (v.embarcacion_nombre as string) ||
              embMap.get(v.embarcacion_id as number) ||
              '—'
          )
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setViajesLista([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viajesPorEstado =
    filtroEstado === 'todos'
      ? viajesLista
      : viajesLista.filter((v) => v.estado === filtroEstado);

  const viajesFiltrados = filtroFecha
    ? viajesPorEstado.filter((v) => v.fechaSalida === filtroFecha)
    : viajesPorEstado;

  const viajesFinalizados = viajesLista.filter((v) => v.estado === 'finalizado');

  const viajesPorFecha = viajesLista.reduce((acc, viaje) => {
    const fecha = viaje.fechaSalida;
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(viaje);
    return acc;
  }, {} as Record<string, typeof viajesFinalizados>);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'ruta', label: 'Ruta' },
    {
      key: 'precio',
      label: 'Precio',
      render: (_: unknown, row: ReturnType<typeof mapViajeToUI>) => (
        <span className="font-medium text-green-700">
          {new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
          }).format(row.precio ?? 0)}
        </span>
      ),
    },
    { key: 'embarcacion', label: 'Embarcación' },
    { key: 'operador', label: 'Operador Asignado' },
    {
      key: 'fechaSalida',
      label: 'Fecha',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-muted-foreground">
            {row.horaSalida} - {row.horaLlegadaReal}
          </p>
        </div>
      ),
    },
    {
      key: 'duracion',
      label: 'Duración',
      render: (value: string) => (
        <span className="text-sm font-medium text-blue-600">{value}</span>
      ),
    },
    {
      key: 'pasajeros',
      label: 'Ocupación',
      render: (value: number, row: any) => {
        const capacidad =
          embarcacionesList.find((e) => e.nombre === row.embarcacion)?.capacidad ||
          '?';
        return (
          <div className="flex flex-col">
            <span
              className={`font-medium ${
                value >= Number(capacidad) ? 'text-red-600' : 'text-primary'
              }`}
            >
              {value} / {capacidad}
            </span>
            {value >= Number(capacidad) && (
              <span className="text-[10px] text-red-500 uppercase font-bold">
                Lleno
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: any) => <StatusBadge status={value} />,
    },
  ];

  // Validación automática de conflictos de horarios
  const validarConflictoHorarios = () => {
    const { fechaSalida, horaSalida, fechaLlegada, horaLlegada, embarcacion } = formData;

    if (!fechaSalida || !horaSalida || !fechaLlegada || !horaLlegada || !embarcacion) {
      setConflictoDetectado(false);
      return;
    }

    const nuevaFechaSalida = new Date(`${fechaSalida}T${horaSalida}`).getTime();
    const nuevaFechaLlegada = new Date(`${fechaLlegada}T${horaLlegada}`).getTime();

    const hayConflicto = viajesLista.some((viaje) => {
      if (viaje.embarcacion !== getEmbarcacionNombre(embarcacion)) return false;

      const viajeExistenteSalida = new Date(`${convertirFecha(viaje.fechaSalida)}T${viaje.horaSalida}`).getTime();
      const viajeExistenteLlegada = new Date(`${convertirFecha(viaje.fechaLlegada)}T${viaje.horaLlegada}`).getTime();

      return (
        (nuevaFechaSalida >= viajeExistenteSalida && nuevaFechaSalida <= viajeExistenteLlegada) ||
        (nuevaFechaLlegada >= viajeExistenteSalida && nuevaFechaLlegada <= viajeExistenteLlegada) ||
        (nuevaFechaSalida <= viajeExistenteSalida && nuevaFechaLlegada >= viajeExistenteLlegada)
      );
    });

    setConflictoDetectado(hayConflicto);
  };

  const convertirFecha = (fecha: string) => {
    const [dia, mes, año] = fecha.split('/');
    return `${año}-${mes}-${dia}`;
  };

  const getEmbarcacionNombre = (id: string) => {
    const emb = embarcacionesList.find((e) => String(e.id) === id);
    return emb?.nombre || '';
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictoDetectado) {
      alert('⚠️ No se puede programar: Conflicto de horarios detectado');
      return;
    }
    try {
      const fecha_salida = `${formData.fechaSalida}T${formData.horaSalida}:00`;
      const cierre_inscripcion = formData.cierreInscripcionFecha
        ? `${formData.cierreInscripcionFecha}T${formData.cierreInscripcionHora || '23:59'}:00`
        : new Date(
            new Date(fecha_salida).getTime() - 2 * 60 * 60 * 1000
          ).toISOString();
      await api.createViaje({
        fecha_salida,
        cierre_inscripcion,
        fecha_limite_inscripcion: cierre_inscripcion,
        origen: formData.origen,
        destino: formData.destino,
        embarcacion_id: parseInt(formData.embarcacion, 10),
        precio: parseFloat(formData.precio) || 0,
        estado: 'programado',
      });
      setShowForm(false);
      setSaveOk('Viaje programado correctamente. Aparece en la lista con estado Programado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleCambiarEstado = async (
    row: ReturnType<typeof mapViajeToUI>,
    nuevoEstado: string
  ) => {
    try {
      await api.updateViaje(row.dbId, { estado: nuevoEstado });
      setSaveOk(`Viaje ${row.id} actualizado a ${nuevoEstado.replace('_', ' ')}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const handleDelete = async (row: ReturnType<typeof mapViajeToUI>) => {
    if (!confirm('¿Eliminar este viaje?')) return;
    try {
      await api.deleteViaje(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const fechasUnicas = [...new Set(viajesLista.map((v) => v.fechaSalida))];

  const handleExportarPDF = () => {
    alert('Exportando viajes finalizados en PDF...');
  };

  const handleExportarExcel = () => {
    alert('Exportando viajes finalizados en Excel...');
  };

  if (loading) return <ViewFeedback loading />;
  if (error && viajesLista.length === 0)
    return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      {saveOk ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {saveOk}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setSaveOk(null)}
          >
            Cerrar
          </button>
        </div>
      ) : null}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Viajes (Zarpe)</h2>
          <p className="text-muted-foreground">
            Programa viajes y cambia su estado (programado → en curso → finalizado)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Programar Nuevo Viaje
        </button>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['todos', 'Todos'],
            ['programado', 'Programados'],
            ['en_curso', 'En curso'],
            ['finalizado', 'Finalizados'],
            ['cancelado', 'Cancelados'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFiltroEstado(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroEstado === key
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {label} (
            {key === 'todos'
              ? viajesLista.length
              : viajesLista.filter((v) => v.estado === key).length}
            )
          </button>
        ))}
      </div>

      {/* Form - Programar nuevo viaje */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Programar Nuevo Viaje</h3>

          {conflictoDetectado && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">¡Conflicto de Horarios Detectado!</p>
                <p className="text-sm text-red-700 mt-1">
                  La embarcación seleccionada ya tiene un viaje programado en este horario.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Salida</label>
              <input
                type="date"
                value={formData.fechaSalida}
                onChange={(e) => {
                  handleFormChange('fechaSalida', e.target.value);
                  setTimeout(validarConflictoHorarios, 100);
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hora de Salida</label>
              <input
                type="time"
                value={formData.horaSalida}
                onChange={(e) => {
                  handleFormChange('horaSalida', e.target.value);
                  setTimeout(validarConflictoHorarios, 100);
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Llegada</label>
              <input
                type="date"
                value={formData.fechaLlegada}
                onChange={(e) => {
                  handleFormChange('fechaLlegada', e.target.value);
                  setTimeout(validarConflictoHorarios, 100);
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hora Estimada de Llegada</label>
              <input
                type="time"
                value={formData.horaLlegada}
                onChange={(e) => {
                  handleFormChange('horaLlegada', e.target.value);
                  setTimeout(validarConflictoHorarios, 100);
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Origen</label>
              <select
                value={formData.origen}
                onChange={(e) => handleFormChange('origen', e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="Quibdó">Quibdó</option>
                <option value="Istmina">Istmina</option>
                <option value="Tadó">Tadó</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Destino</label>
              <select
                value={formData.destino}
                onChange={(e) => handleFormChange('destino', e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar destino</option>
                <option value="Istmina">Istmina</option>
                <option value="Tadó">Tadó</option>
                <option value="Bellavista">Bellavista</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Embarcación</label>
              <select
                value={formData.embarcacion}
                onChange={(e) => {
                  handleFormChange('embarcacion', e.target.value);
                  setTimeout(validarConflictoHorarios, 100);
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar</option>
                {embarcacionesList.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Precio del viaje (COP)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.precio}
                onChange={(e) => handleFormChange('precio', e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ej: 45000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha límite de inscripción (fecha)
              </label>
              <input
                type="date"
                value={formData.cierreInscripcionFecha}
                onChange={(e) =>
                  handleFormChange('cierreInscripcionFecha', e.target.value)
                }
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha límite de inscripción (hora)
              </label>
              <input
                type="time"
                value={formData.cierreInscripcionHora}
                onChange={(e) =>
                  handleFormChange('cierreInscripcionHora', e.target.value)
                }
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si lo dejas vacío, cierra 2 h antes de la salida
              </p>
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
                disabled={conflictoDetectado}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  conflictoDetectado
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                Programar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Filtrar por Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="">Todas las fechas</option>
                {fechasUnicas.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFiltroFecha('')}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Limpiar
            </button>
            <button
              onClick={handleExportarPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleExportarExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Viajes</p>
          <p className="text-2xl font-bold text-foreground">{viajesLista.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Finalizados Hoy</p>
          <p className="text-2xl font-bold text-green-600">
            {fechasUnicas.length > 0
              ? viajesPorFecha[fechasUnicas[0]]?.length || 0
              : 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Días con viajes</p>
          <p className="text-2xl font-bold text-blue-600">
            {fechasUnicas.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Pasajeros</p>
          <p className="text-2xl font-bold text-primary">
            {viajesLista.reduce((sum, v) => sum + v.pasajeros, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Filtrados</p>
          <p className="text-2xl font-bold text-orange-600">{viajesFiltrados.length}</p>
        </div>
      </div>

      {/* Resumen por Día */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Resumen por Día</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(viajesPorFecha).map(([fecha, viajes]) => (
            <div key={fecha} className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">{fecha}</p>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{viajes.length}</strong> viajes finalizados
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{viajes.reduce((sum, v) => sum + v.pasajeros, 0)}</strong> pasajeros transportados
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div>
        <h3 className="font-semibold mb-3">
          {filtroFecha
            ? `Viajes del ${filtroFecha}`
            : `Viajes (${viajesFiltrados.length})`}
        </h3>
        <DataTable
          columns={[
            ...columns,
            {
              key: 'acciones',
              label: 'Acciones',
              render: (_: unknown, row: ReturnType<typeof mapViajeToUI>) => (
                <div className="flex flex-wrap gap-1">
                  {row.estado === 'programado' && (
                    <button
                      type="button"
                      onClick={() => handleCambiarEstado(row, 'en_curso')}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                    >
                      Iniciar
                    </button>
                  )}
                  {row.estado === 'en_curso' && (
                    <button
                      type="button"
                      onClick={() => handleCambiarEstado(row, 'finalizado')}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                    >
                      Finalizar
                    </button>
                  )}
                  {row.estado !== 'cancelado' && row.estado !== 'finalizado' && (
                    <button
                      type="button"
                      onClick={() => handleCambiarEstado(row, 'cancelado')}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={viajesFiltrados}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
