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
    origen: 'Quibdó',
    destino: '',
    embarcacion: '',
    operador: '',
    pasajeros: [] as string[],
  });

  const [viajesFinalizados, setViajesFinalizados] = useState<
    ReturnType<typeof mapViajeToUI>[]
  >([]);

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
        embs.map((e) => ({ id: Number(e.id), nombre: e.nombre as string }))
      );
      setViajesFinalizados(
        viajes
          .filter((v) => v.estado === 'finalizado')
          .map((v) =>
            mapViajeToUI(v, embMap.get(v.embarcacion_id as number) || '—')
          )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setViajesFinalizados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtrar por fecha
  const viajesFiltrados = filtroFecha
    ? viajesFinalizados.filter((v) => v.fechaSalida === filtroFecha)
    : viajesFinalizados;

  // Agrupar por fecha para estadísticas
  const viajesPorFecha = viajesFinalizados.reduce((acc, viaje) => {
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
      label: 'Pasajeros',
      render: (value: number) => (
        <span className="font-medium text-primary">{value}</span>
      ),
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

    const hayConflicto = viajesFinalizados.some((viaje) => {
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
      await api.createViaje({
        fecha_salida,
        origen: formData.origen,
        destino: formData.destino,
        embarcacion_id: parseInt(formData.embarcacion, 10),
        estado: 'programado',
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
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

  const fechasUnicas = [...new Set(viajesFinalizados.map((v) => v.fechaSalida))];

  const handleExportarPDF = () => {
    alert('Exportando viajes finalizados en PDF...');
  };

  const handleExportarExcel = () => {
    alert('Exportando viajes finalizados en Excel...');
  };

  if (loading) return <ViewFeedback loading />;
  if (error && viajesFinalizados.length === 0)
    return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Historial de Viajes Finalizados</h2>
          <p className="text-muted-foreground">Registro completo de viajes completados</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Programar Nuevo Viaje
        </button>
      </div>

      {/* Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
        <Navigation className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-green-900">Vista de Viajes Finalizados</p>
          <p className="text-sm text-green-700 mt-1">
            Esta sección muestra únicamente los viajes que han sido completados. Los viajes en curso o programados se gestionan en otras secciones.
          </p>
        </div>
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
              <label className="block text-sm font-medium mb-2">Operador</label>
              <select
                value={formData.operador}
                onChange={(e) => handleFormChange('operador', e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar</option>
                <option value="juan-perez">Juan Pérez</option>
                <option value="maria-gonzalez">María González</option>
              </select>
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
          <p className="text-sm text-muted-foreground mb-1">Total Finalizados</p>
          <p className="text-2xl font-bold text-foreground">{viajesFinalizados.length}</p>
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
            {viajesFinalizados.reduce((sum, v) => sum + v.pasajeros, 0)}
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
          {filtroFecha ? `Viajes del ${filtroFecha}` : 'Todos los Viajes Finalizados'}
        </h3>
        <DataTable
          columns={columns}
          data={viajesFiltrados}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
