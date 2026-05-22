import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { ReportFooter } from './ReportFooter';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ReportesView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viajes, setViajes] = useState<Record<string, unknown>[]>([]);
  const [pasajeros, setPasajeros] = useState<Record<string, unknown>[]>([]);
  const [embarcaciones, setEmbarcaciones] = useState<Record<string, unknown>[]>([]);
  const [incidentes, setIncidentes] = useState<Record<string, unknown>[]>([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    embarcacion: '',
    ruta: '',
    estado: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, p, e, i] = await Promise.all([
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
        api.getEmbarcaciones() as Promise<Record<string, unknown>[]>,
        api.getIncidentes() as Promise<Record<string, unknown>[]>,
      ]);
      setViajes(v);
      setPasajeros(p);
      setEmbarcaciones(e);
      setIncidentes(i);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viajesFiltrados = useMemo(() => {
    return viajes.filter((v) => {
      const fecha = new Date(v.fecha_salida as string);
      if (filtros.fechaInicio && fecha < new Date(filtros.fechaInicio)) return false;
      if (filtros.fechaFin && fecha > new Date(`${filtros.fechaFin}T23:59:59`)) return false;
      if (
        filtros.embarcacion &&
        String(v.embarcacion_id) !== filtros.embarcacion
      )
        return false;
      if (filtros.estado && v.estado !== filtros.estado.replace('-', '_')) return false;
      if (filtros.ruta) {
        const ruta = `${v.origen}-${v.destino}`.toLowerCase().replace(/\s/g, '');
        if (!ruta.includes(filtros.ruta.replace(/\s/g, '').toLowerCase())) return false;
      }
      return true;
    });
  }, [viajes, filtros]);

  const datosViajes = useMemo(() => {
    const porMes: Record<number, { viajes: number; pasajeros: number }> = {};
    const year = new Date().getFullYear();
    for (let m = 0; m < 12; m++) porMes[m] = { viajes: 0, pasajeros: 0 };

    viajesFiltrados.forEach((v) => {
      const d = new Date(v.fecha_salida as string);
      if (d.getFullYear() !== year) return;
      const m = d.getMonth();
      porMes[m].viajes += 1;
      porMes[m].pasajeros += Number(v.pasajeros_count ?? 0);
    });

    const now = new Date().getMonth();
    const start = Math.max(0, now - 4);
    return Array.from({ length: 5 }, (_, i) => {
      const m = start + i;
      return {
        mes: MESES[m],
        viajes: porMes[m].viajes,
        pasajeros: porMes[m].pasajeros || pasajeros.length,
      };
    });
  }, [viajesFiltrados, pasajeros.length]);

  const datosEmbarcaciones = useMemo(() => {
    const counts: Record<string, { nombre: string; viajes: number }> = {};
    embarcaciones.forEach((e) => {
      counts[String(e.id)] = { nombre: e.nombre as string, viajes: 0 };
    });
    viajesFiltrados.forEach((v) => {
      const id = String(v.embarcacion_id);
      if (counts[id]) counts[id].viajes += 1;
    });
    return Object.values(counts)
      .filter((x) => x.viajes > 0)
      .slice(0, 6)
      .map((x) => ({
        nombre: x.nombre.length > 14 ? `${x.nombre.slice(0, 14)}…` : x.nombre,
        viajes: x.viajes,
        horas: x.viajes * 3,
      }));
  }, [embarcaciones, viajesFiltrados]);

  const resumen = useMemo(() => {
    const totalViajes = viajesFiltrados.length;
    const finalizados = viajesFiltrados.filter((v) => v.estado === 'finalizado').length;
    const tasa =
      totalViajes > 0 ? Math.round((finalizados / totalViajes) * 1000) / 10 : 0;
    return {
      totalViajes,
      pasajeros: pasajeros.length,
      horas: totalViajes * 3,
      tasa,
      incidentes: incidentes.length,
    };
  }, [viajesFiltrados, pasajeros.length, incidentes.length]);

  const reportesDisponibles = [
    { id: 'viajes-mes', titulo: 'Viajes del período', descripcion: `${resumen.totalViajes} viajes en el filtro actual`, icono: '📊' },
    { id: 'pasajeros', titulo: 'Pasajeros', descripcion: `${resumen.pasajeros} registrados`, icono: '👥' },
    { id: 'embarcaciones', titulo: 'Embarcaciones', descripcion: `${embarcaciones.length} en flota`, icono: '⚓' },
    { id: 'incidentes', titulo: 'Incidentes', descripcion: `${resumen.incidentes} reportados`, icono: '⚠️' },
  ];

  const handleExportar = (formato: 'pdf' | 'excel') => {
    alert(
      `Resumen (${formato.toUpperCase()}): ${resumen.totalViajes} viajes, ${resumen.pasajeros} pasajeros, ${resumen.incidentes} incidentes.`
    );
  };

  if (loading) return <ViewFeedback loading />;
  if (error) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reportes y Estadísticas</h2>
        <p className="text-muted-foreground">
          Datos en tiempo real desde la base de datos del sistema
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Filtros de Búsqueda</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fecha Fin</label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Embarcación</label>
            <select
              value={filtros.embarcacion}
              onChange={(e) => setFiltros({ ...filtros, embarcacion: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="">Todas</option>
              {embarcaciones.map((e) => (
                <option key={String(e.id)} value={String(e.id)}>
                  {e.nombre as string}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ruta (texto)</label>
            <input
              type="text"
              placeholder="ej. quibdo-istmina"
              value={filtros.ruta}
              onChange={(e) => setFiltros({ ...filtros, ruta: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="finalizado">Finalizado</option>
              <option value="en_curso">En curso</option>
              <option value="programado">Programado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {}}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Filtros activos ({viajesFiltrados.length} viajes)
          </button>
          <button
            type="button"
            onClick={() =>
              setFiltros({
                fechaInicio: '',
                fechaFin: '',
                embarcacion: '',
                ruta: '',
                estado: '',
              })
            }
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Viajes por mes (año actual)</h3>
          {datosViajes.every((d) => d.viajes === 0) ? (
            <p className="text-muted-foreground text-sm py-12 text-center">
              Sin viajes en el período. Programa viajes en Gestión de Viajes.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={datosViajes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="viajes" stroke="#0B5ED7" strokeWidth={2} name="Viajes" />
                <Line type="monotone" dataKey="pasajeros" stroke="#64b5f6" strokeWidth={2} name="Pasajeros/viaje" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Uso de Embarcaciones</h3>
          {datosEmbarcaciones.length === 0 ? (
            <p className="text-muted-foreground text-sm py-12 text-center">
              Sin datos de embarcaciones con viajes filtrados.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosEmbarcaciones}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="viajes" fill="#0B5ED7" name="Viajes" />
                <Bar dataKey="horas" fill="#64b5f6" name="Horas est." />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Reportes Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportesDisponibles.map((reporte) => (
            <div
              key={reporte.id}
              className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-3">{reporte.icono}</div>
              <h4 className="font-semibold mb-2">{reporte.titulo}</h4>
              <p className="text-sm text-muted-foreground mb-4">{reporte.descripcion}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportar('pdf')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExportar('excel')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Resumen del período filtrado</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary mb-1">{resumen.totalViajes}</p>
            <p className="text-sm text-muted-foreground">Total Viajes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 mb-1">{resumen.pasajeros}</p>
            <p className="text-sm text-muted-foreground">Pasajeros registrados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 mb-1">{resumen.horas}</p>
            <p className="text-sm text-muted-foreground">Horas est. operación</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600 mb-1">{resumen.tasa}%</p>
            <p className="text-sm text-muted-foreground">Tasa finalización</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600 mb-1">{resumen.incidentes}</p>
            <p className="text-sm text-muted-foreground">Incidentes</p>
          </div>
        </div>

        <ReportFooter
          reportType="Reporte de Operaciones GeoNaval"
          generatedBy="Sistema GeoNaval"
          generatedDate={new Date().toLocaleString('es-CO')}
          pageNumber={1}
          totalPages={1}
        />
      </div>
    </div>
  );
}
