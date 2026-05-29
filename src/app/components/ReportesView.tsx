import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Filter, BarChart3, Users, Anchor } from 'lucide-react';
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
      const [v, p, e] = await Promise.all([
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
        api.getEmbarcaciones() as Promise<Record<string, unknown>[]>,
      ]);
      setViajes(v);
      setPasajeros(p);
      setEmbarcaciones(e);
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
      tasa,
    };
  }, [viajesFiltrados, pasajeros.length]);

  const reportesDisponibles = [
    { id: 'viajes-mes', titulo: 'Viajes del período', descripcion: `${resumen.totalViajes} viajes en el filtro actual`, icono: 'chart-bar' },
    { id: 'pasajeros', titulo: 'Pasajeros', descripcion: `${resumen.pasajeros} registrados`, icono: 'users' },
    { id: 'embarcaciones', titulo: 'Embarcaciones', descripcion: `${embarcaciones.length} en flota`, icono: 'anchor' },
  ];

  const descargarExcel = (reporteId: string) => {
    let csvContent = '';
    let filename = '';

    switch (reporteId) {
      case 'viajes-mes':
        filename = 'viajes_periodo.csv';
        csvContent = 'ID,Fecha Salida,Origen,Destino,Embarcación,Pasajeros,Estado,Precio\n';
        viajesFiltrados.forEach((v) => {
          const fecha = new Date(v.fecha_salida as string).toLocaleDateString('es-CO');
          csvContent += `V-${v.id},${fecha},${v.origen},${v.destino},${v.embarcacion_nombre || 'N/A'},${v.pasajeros_count || 0},${v.estado},${v.precio || 0}\n`;
        });
        break;

      case 'pasajeros':
        filename = 'pasajeros.csv';
        csvContent = 'ID,Nombre,Documento,Teléfono,Email\n';
        pasajeros.forEach((p) => {
          csvContent += `PS-${p.id},${p.nombre},${p.documento},${p.telefono || 'N/A'},${p.email || 'N/A'}\n`;
        });
        break;

      case 'embarcaciones':
        filename = 'embarcaciones.csv';
        csvContent = 'ID,Nombre,Tipo,Capacidad,Estado,Viajes Realizados\n';
        embarcaciones.forEach((e) => {
          const viajesRealizados = viajesFiltrados.filter(v => v.embarcacion_id === e.id).length;
          csvContent += `E-${e.id},${e.nombre},${e.tipo || 'N/A'},${e.capacidad_pasajeros || 0},${e.estado},${viajesRealizados}\n`;
        });
        break;
    }

    // Crear y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const descargarPDF = (reporteId: string) => {
    let contenido = '';
    let titulo = '';

    switch (reporteId) {
      case 'viajes-mes':
        titulo = 'Reporte de Viajes del Período';
        contenido = `Total de viajes: ${resumen.totalViajes}\n`;
        contenido += `Período: ${filtros.fechaInicio || 'Inicio'} - ${filtros.fechaFin || 'Fin'}\n\n`;
        contenido += 'Listado de Viajes:\n';
        viajesFiltrados.forEach((v) => {
          const fecha = new Date(v.fecha_salida as string).toLocaleDateString('es-CO');
          contenido += `- V-${v.id}: ${v.origen} → ${v.destino} (${fecha}) - ${v.pasajeros_count || 0} pasajeros\n`;
        });
        break;

      case 'pasajeros':
        titulo = 'Reporte de Pasajeros';
        contenido = `Total de pasajeros registrados: ${resumen.pasajeros}\n\n`;
        contenido += 'Listado de Pasajeros:\n';
        pasajeros.slice(0, 50).forEach((p) => {
          contenido += `- PS-${p.id}: ${p.nombre} (${p.documento})\n`;
        });
        if (pasajeros.length > 50) {
          contenido += `\n... y ${pasajeros.length - 50} pasajeros más\n`;
        }
        break;

      case 'embarcaciones':
        titulo = 'Reporte de Embarcaciones';
        contenido = `Total de embarcaciones: ${embarcaciones.length}\n\n`;
        contenido += 'Listado de Embarcaciones:\n';
        embarcaciones.forEach((e) => {
          const viajesRealizados = viajesFiltrados.filter(v => v.embarcacion_id === e.id).length;
          contenido += `- E-${e.id}: ${e.nombre} (${e.estado}) - ${viajesRealizados} viajes\n`;
        });
        break;
    }

    // Crear contenido HTML para impresión/PDF
    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${titulo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #0B5ED7; border-bottom: 2px solid #0B5ED7; padding-bottom: 10px; }
            pre { white-space: pre-wrap; font-family: 'Courier New', monospace; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${titulo}</h1>
          <p><strong>Generado:</strong> ${new Date().toLocaleString('es-CO')}</p>
          <p><strong>Sistema:</strong> GeoNaval - Gestión de Transporte Fluvial</p>
          <hr>
          <pre>${contenido}</pre>
          <div class="footer">
            <p>GeoNaval © ${new Date().getFullYear()} - Reporte generado automáticamente</p>
          </div>
        </body>
        </html>
      `);
      ventana.document.close();
      setTimeout(() => {
        ventana.print();
      }, 250);
    }
  };

  const handleExportar = (formato: 'pdf' | 'excel', reporteId: string) => {
    if (formato === 'excel') {
      descargarExcel(reporteId);
    } else {
      descargarPDF(reporteId);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Estado del Viaje</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="finalizado">Finalizado</option>
              <option value="en_curso">En curso</option>
              <option value="programado">Programado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Embarcación</label>
            <select
              value={filtros.embarcacion}
              onChange={(e) => setFiltros({ ...filtros, embarcacion: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="">Todas las embarcaciones</option>
              {embarcaciones.map((e) => (
                <option key={String(e.id)} value={String(e.id)}>
                  {e.nombre as string}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-muted-foreground">
              Mostrando <strong className="text-foreground">{viajesFiltrados.length} viajes</strong>
            </span>
          </div>
          {(filtros.estado || filtros.embarcacion) && (
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
              className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
            >
              Limpiar Filtros
            </button>
          )}
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
                <Bar dataKey="viajes" fill="#0B5ED7" name="Viajes Realizados" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Reportes Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportesDisponibles.map((reporte) => {
            const IconComponent = 
              reporte.icono === 'chart-bar' ? BarChart3 :
              reporte.icono === 'users' ? Users :
              Anchor;
            
            return (
              <div
                key={reporte.id}
                className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">{reporte.titulo}</h4>
                <p className="text-sm text-muted-foreground mb-4">{reporte.descripcion}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportar('pdf', reporte.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportar('excel', reporte.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Resumen del período filtrado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary mb-1">{resumen.totalViajes}</p>
            <p className="text-sm text-muted-foreground">Total Viajes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 mb-1">{resumen.pasajeros}</p>
            <p className="text-sm text-muted-foreground">Pasajeros registrados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600 mb-1">{resumen.tasa}%</p>
            <p className="text-sm text-muted-foreground">Tasa finalización</p>
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
