import { useState, useEffect, useCallback } from 'react';
import { Plus, Navigation, Calendar, AlertTriangle, Filter, Download, Clock, Users, MapPin, Anchor, X, CheckCircle } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import { mapViajeToUI } from '../../services/mappers';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const inicioIcon = L.divIcon({
  html: `<div style="background:#16a34a;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});
const finIcon = L.divIcon({
  html: `<div style="background:#dc2626;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});

type ResumenViaje = {
  row: ReturnType<typeof mapViajeToUI>;
  puntosGps: { latitud: number; longitud: number }[];
  distanciaKm: number;
};

function calcularDuracion(salida: string, llegada: string): string {
  // Parsear fechas en formato DD/MM/YYYY
  const parseFecha = (fecha: string, hora: string) => {
    const [d, m, y] = fecha.split('/');
    return new Date(`${y}-${m}-${d}T${hora}:00`);
  };
  try {
    const inicio = parseFecha(salida, '00:00');
    const fin = parseFecha(llegada, '23:59');
    const diffMs = fin.getTime() - inicio.getTime();
    if (diffMs <= 0) return '—';
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    return horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
  } catch {
    return '—';
  }
}

function calcularDistancia(puntos: { latitud: number; longitud: number }[]): number {
  if (puntos.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const R = 6371;
    const dLat = ((puntos[i].latitud - puntos[i - 1].latitud) * Math.PI) / 180;
    const dLon = ((puntos[i].longitud - puntos[i - 1].longitud) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((puntos[i - 1].latitud * Math.PI) / 180) *
        Math.cos((puntos[i].latitud * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total * 10) / 10;
}

export function ViajesView() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenViaje | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [embarcacionesList, setEmbarcacionesList] = useState<
    {
      id: number;
      nombre: string;
      capacidad?: number;
      propietarioNombre?: string;
      propietarioId?: number;
      estado?: string;
    }[]
  >([]);
  const [propietariosList, setPropietariosList] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [tripulacionList, setTripulacionList] = useState<
    { id: number; nombre: string; rol: string }[]
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
    propietario: '',
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
  const [assignOperador, setAssignOperador] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [viajes, embs, trip, props] = await Promise.all([
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getEmbarcaciones() as Promise<Record<string, unknown>[]>,
        api.getTripulacion() as Promise<Record<string, unknown>[]>,
        api.getPropietarios() as Promise<Record<string, unknown>[]>,
      ]);
      const embMap = new Map(embs.map((e) => [e.id, e.nombre as string]));
      setEmbarcacionesList(
        embs.map((e) => ({
          id: Number(e.id),
          nombre: e.nombre as string,
          capacidad: Number(e.capacidad_pasajeros || 0),
          propietarioNombre: (e.propietario_nombre as string) || '',
          propietarioId: e.propietario_id ? Number(e.propietario_id) : undefined,
          estado: (e.estado as string) || 'operativa',
        }))
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
    { key: 'propietario', label: 'Propietario' },
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
      // Construir fecha sin conversión de zona horaria
      // Formato: "YYYY-MM-DD HH:mm:ss" — PostgreSQL lo guarda tal cual en TIMESTAMP WITHOUT TIME ZONE
      const fecha_salida = `${formData.fechaSalida} ${formData.horaSalida}:00`;
      const fecha_llegada = formData.fechaLlegada && formData.horaLlegada
        ? `${formData.fechaLlegada} ${formData.horaLlegada}:00`
        : null;
      const cierre_inscripcion = formData.cierreInscripcionFecha
        ? `${formData.cierreInscripcionFecha} ${formData.cierreInscripcionHora || '23:59'}:00`
        : `${formData.fechaSalida} ${formData.horaSalida}:00`;
      if (!formData.operador) {
        throw new Error('Debes asignar un operador al viaje');
      }
      await api.createViaje({
        fecha_salida,
        fecha_llegada,
        cierre_inscripcion,
        fecha_limite_inscripcion: cierre_inscripcion,
        origen: formData.origen,
        destino: formData.destino,
        embarcacion_id: parseInt(formData.embarcacion, 10),
        precio: parseFloat(formData.precio) || 0,
        estado: 'programado',
        tripulante_id: formData.operador
          ? parseInt(formData.operador, 10)
          : undefined,
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

  const handleAsignarOperador = async (viajeId: number) => {
    const tripulanteId = assignOperador[viajeId];
    if (!tripulanteId) {
      setError('Selecciona un operador para asignar');
      return;
    }
    try {
      await api.assignTripulacionViaje(viajeId, parseInt(tripulanteId, 10));
      setSaveOk('Operador asignado correctamente');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar operador');
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

  const handleVerResumen = async (row: ReturnType<typeof mapViajeToUI>) => {
    setLoadingResumen(true);
    setResumen(null);
    try {
      const puntos = (await api.getGpsViaje(row.dbId)) as { latitud: number; longitud: number }[];
      setResumen({
        row,
        puntosGps: puntos,
        distanciaKm: calcularDistancia(puntos),
      });
    } catch {
      setResumen({ row, puntosGps: [], distanciaKm: 0 });
    } finally {
      setLoadingResumen(false);
    }
  };

  const fechasUnicas = [...new Set(viajesLista.map((v) => v.fechaSalida))];

  const handleExportarPDF = () => {
    const titulo = 'Reporte de Viajes - GeoNaval';
    const filtroDesc = filtroFecha ? `Fecha: ${filtroFecha}` : 'Todas las fechas';
    const estadoDesc = filtroEstado !== 'todos' ? ` | Estado: ${filtroEstado}` : '';

    const filas = viajesFiltrados.map((v) => `
      <tr>
        <td>${v.id}</td>
        <td>${v.ruta}</td>
        <td>${v.embarcacion}</td>
        <td>${v.operador}</td>
        <td>${v.fechaSalida}</td>
        <td>${v.horaSalida}</td>
        <td>${v.pasajeros}</td>
        <td>${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v.precio ?? 0)}</td>
        <td>${v.estado}</td>
      </tr>
    `).join('');

    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 13px; }
            h1 { color: #0B5ED7; border-bottom: 2px solid #0B5ED7; padding-bottom: 8px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #0B5ED7; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
            td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            tr:nth-child(even) td { background: #f9fafb; }
            .resumen { display: flex; gap: 24px; margin: 16px 0; }
            .stat { background: #f0f4ff; border-radius: 8px; padding: 12px 20px; text-align: center; }
            .stat strong { display: block; font-size: 22px; color: #0B5ED7; }
            .stat span { font-size: 11px; color: #666; }
            .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #888; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>${titulo}</h1>
          <p class="meta">Filtro: ${filtroDesc}${estadoDesc} &nbsp;|&nbsp; Generado: ${new Date().toLocaleString('es-CO')}</p>
          <div class="resumen">
            <div class="stat"><strong>${viajesFiltrados.length}</strong><span>Total viajes</span></div>
            <div class="stat"><strong>${viajesFiltrados.reduce((s, v) => s + v.pasajeros, 0)}</strong><span>Pasajeros</span></div>
            <div class="stat"><strong>${viajesFiltrados.filter(v => v.estado === 'finalizado').length}</strong><span>Finalizados</span></div>
            <div class="stat"><strong>${viajesFiltrados.filter(v => v.estado === 'cancelado').length}</strong><span>Cancelados</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Ruta</th><th>Embarcación</th><th>Operador</th>
                <th>Fecha</th><th>Hora</th><th>Pasajeros</th><th>Precio</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
          <div class="footer">GeoNaval © ${new Date().getFullYear()} — Reporte generado automáticamente del sistema de gestión de transporte fluvial</div>
          <script>setTimeout(() => window.print(), 300);</script>
        </body>
        </html>
      `);
      ventana.document.close();
    }
  };

  const handleExportarExcel = () => {
    const encabezados = ['ID', 'Ruta', 'Embarcación', 'Propietario', 'Operador', 'Fecha Salida', 'Hora Salida', 'Pasajeros', 'Precio (COP)', 'Estado'];
    const filas = viajesFiltrados.map((v) => [
      v.id,
      v.ruta,
      v.embarcacion,
      v.propietario,
      v.operador,
      v.fechaSalida,
      v.horaSalida,
      v.pasajeros,
      v.precio ?? 0,
      v.estado,
    ]);

    const csvContent = [encabezados, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fechaHoy = new Date().toISOString().split('T')[0];
    link.download = `viajes_geonaval_${fechaHoy}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <ViewFeedback loading />;
  if (error && viajesLista.length === 0)
    return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}

      {/* Modal Resumen de Viaje */}
      {(resumen || loadingResumen) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-2xl p-5 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-7 h-7" />
                  <div>
                    <h3 className="text-lg font-bold">Resumen del Viaje</h3>
                    <p className="text-white/80 text-sm">
                      {resumen ? `${resumen.row.id} — ${resumen.row.ruta}` : 'Cargando...'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setResumen(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingResumen ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                Cargando resumen...
              </div>
            ) : resumen ? (
              <div className="p-6 space-y-5">

                {/* Mapa del recorrido */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Recorrido GPS registrado
                  </h4>
                  {resumen.puntosGps.length >= 2 ? (
                    <div className="rounded-xl overflow-hidden border border-border h-52">
                      <MapContainer
                        center={[Number(resumen.puntosGps[0].latitud), Number(resumen.puntosGps[0].longitud)]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                          subdomains="abcd"
                        />
                        <Polyline
                          positions={resumen.puntosGps.map(p => [Number(p.latitud), Number(p.longitud)] as [number, number])}
                          color="#7c3aed"
                          weight={4}
                          opacity={0.9}
                        />
                        <Marker position={[Number(resumen.puntosGps[0].latitud), Number(resumen.puntosGps[0].longitud)]} icon={inicioIcon}>
                          <Popup><span className="text-xs font-bold text-green-700">Inicio</span></Popup>
                        </Marker>
                        <Marker position={[Number(resumen.puntosGps[resumen.puntosGps.length - 1].latitud), Number(resumen.puntosGps[resumen.puntosGps.length - 1].longitud)]} icon={finIcon}>
                          <Popup><span className="text-xs font-bold text-red-700">Fin</span></Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  ) : (
                    <div className="h-32 bg-muted rounded-xl flex items-center justify-center border border-border">
                      <p className="text-sm text-muted-foreground">Sin recorrido GPS registrado para este viaje</p>
                    </div>
                  )}
                  {resumen.puntosGps.length >= 2 && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-600 rounded-full border border-white shadow" /> Inicio
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-600 rounded-full border border-white shadow" /> Fin
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-6 h-1 bg-purple-600 rounded" /> Recorrido
                      </span>
                    </div>
                  )}
                </div>

                {/* Ruta */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <Navigation className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ruta</p>
                    <p className="font-bold text-blue-900">{resumen.row.ruta}</p>
                  </div>
                </div>

                {/* Grid de datos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-xs text-muted-foreground">Hora de Salida</p>
                    </div>
                    <p className="font-bold text-lg">{resumen.row.horaSalida}</p>
                    <p className="text-xs text-muted-foreground">{resumen.row.fechaSalida}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-muted-foreground">Hora de Llegada</p>
                    </div>
                    <p className="font-bold text-lg">{resumen.row.horaLlegadaReal !== '—' ? resumen.row.horaLlegadaReal : resumen.row.horaLlegada}</p>
                    <p className="text-xs text-muted-foreground">{resumen.row.fechaLlegada}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-orange-600" />
                      <p className="text-xs text-muted-foreground">Pasajeros</p>
                    </div>
                    <p className="font-bold text-lg">{resumen.row.pasajeros}</p>
                    <p className="text-xs text-muted-foreground">transportados</p>
                  </div>

                  <div className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <p className="text-xs text-muted-foreground">Recorrido GPS</p>
                    </div>
                    <p className="font-bold text-lg">
                      {resumen.distanciaKm > 0 ? `${resumen.distanciaKm} km` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">{resumen.puntosGps.length} puntos registrados</p>
                  </div>

                  <div className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Anchor className="w-4 h-4 text-cyan-600" />
                      <p className="text-xs text-muted-foreground">Embarcación</p>
                    </div>
                    <p className="font-bold text-sm">{resumen.row.embarcacion}</p>
                    <p className="text-xs text-muted-foreground">{resumen.row.propietario}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Navigation className="w-4 h-4 text-teal-600" />
                      <p className="text-xs text-muted-foreground">Operador</p>
                    </div>
                    <p className="font-bold text-sm">{resumen.row.operador || '—'}</p>
                    <p className="text-xs text-muted-foreground">a cargo del viaje</p>
                  </div>
                </div>

                {/* Total recaudado */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Recaudado</p>
                    <p className="font-bold text-xl text-green-700">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format((resumen.row.precio ?? 0) * resumen.row.pasajeros)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Precio por pasajero</p>
                    <p className="font-medium text-green-600">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(resumen.row.precio ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <StatusBadge status="finalizado" />
                  <button type="button" onClick={() => setResumen(null)}
                    className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                    Cerrar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
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
                  const id = e.target.value;
                  const sel = embarcacionesList.find((v) => String(v.id) === id);
                  setFormData((prev) => ({
                    ...prev,
                    embarcacion: id,
                    propietario: sel?.propietarioId ? String(sel.propietarioId) : '',
                  }));
                  setTimeout(validarConflictoHorarios, 100);
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar</option>
                {embarcacionesList
                  .filter((e) => e.estado !== 'fuera_servicio')
                  .map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      {e.nombre} {e.estado === 'mantenimiento' ? '(En Mantenimiento)' : ''}
                    </option>
                  ))}
              </select>
              {embarcacionesList.filter((e) => e.estado !== 'fuera_servicio').length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ No hay embarcaciones disponibles. Todas están fuera de servicio.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Propietario</label>
              <select
                value={formData.propietario}
                onChange={(e) => setFormData((prev) => ({ ...prev, propietario: e.target.value }))}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="">Sin propietario asignado</option>
                {propietariosList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {formData.embarcacion && !formData.propietario && (
                <p className="text-xs text-amber-600 mt-1">
                  Esta embarcación no tiene propietario. Puedes asignarlo aquí o en Propietarios.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Operador Asignado *</label>
              <select
                value={formData.operador}
                onChange={(e) => handleFormChange('operador', e.target.value)}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">Seleccionar operador</option>
                {tripulacionList.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.nombre}
                    {t.rol === 'capitan' ? ' (Capitán)' : ''}
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
                <div className="flex flex-col gap-2 min-w-[160px]">

                  {/* Asignar operador si no tiene */}
                  {row.operador === '—' && row.estado !== 'cancelado' && row.estado !== 'finalizado' && (
                    <div className="flex gap-1">
                      <select
                        value={assignOperador[row.dbId] || ''}
                        onChange={(e) =>
                          setAssignOperador((prev) => ({
                            ...prev,
                            [row.dbId]: e.target.value,
                          }))
                        }
                        className="text-xs px-2 py-1 border border-border rounded flex-1"
                      >
                        <option value="">Operador...</option>
                        {tripulacionList.map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAsignarOperador(row.dbId)}
                        className="text-xs px-2 py-1 bg-primary text-white rounded"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* PROGRAMADO → Iniciar */}
                  {row.estado === 'programado' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Iniciar el viaje ${row.id} (${row.ruta})?`)) {
                          handleCambiarEstado(row, 'en_curso');
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      ▶ Iniciar Viaje
                    </button>
                  )}

                  {/* EN CURSO → Finalizar */}
                  {row.estado === 'en_curso' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Finalizar el viaje ${row.id} (${row.ruta})?`)) {
                          handleCambiarEstado(row, 'finalizado');
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      ⏹ Finalizar Viaje
                    </button>
                  )}

                  {/* Cancelar — solo si no está finalizado ni cancelado */}
                  {row.estado !== 'cancelado' && row.estado !== 'finalizado' && (
                    <button
                      type="button"
                      onClick={() => {
                        const razon = prompt(`Razón de cancelación del viaje ${row.id}:`);
                        if (razon !== null) {
                          handleCambiarEstado(row, 'cancelado');
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      ✕ Cancelar
                    </button>
                  )}

                  {/* Finalizado / Cancelado — solo eliminar */}
                  {(row.estado === 'finalizado' || row.estado === 'cancelado') && (
                    <span className="text-xs text-muted-foreground italic text-center py-1">
                      {row.estado === 'finalizado' ? '✓ Completado' : '✗ Cancelado'}
                    </span>
                  )}

                  {/* Resumen — solo viajes finalizados */}
                  {row.estado === 'finalizado' && (
                    <button
                      type="button"
                      onClick={() => handleVerResumen(row)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Ver Resumen
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
