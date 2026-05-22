import { useState } from 'react';
import { Download, FileText, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ReportFooter } from './ReportFooter';

export function ReportesView() {
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    embarcacion: '',
    ruta: '',
    estado: '',
  });

  const datosViajes = [
    { mes: 'Ene', viajes: 45, pasajeros: 1234 },
    { mes: 'Feb', viajes: 52, pasajeros: 1456 },
    { mes: 'Mar', viajes: 48, pasajeros: 1298 },
    { mes: 'Abr', viajes: 61, pasajeros: 1678 },
    { mes: 'May', viajes: 55, pasajeros: 1512 },
  ];

  const datosEmbarcaciones = [
    { nombre: 'Ferry San José', viajes: 45, horas: 234 },
    { nombre: 'Lancha Rápida 7', viajes: 38, horas: 156 },
    { nombre: 'Bote Atrato', viajes: 28, horas: 98 },
    { nombre: 'Ferry El Progreso', viajes: 22, horas: 145 },
  ];

  const reportesDisponibles = [
    {
      id: 'viajes-mes',
      titulo: 'Viajes del Mes',
      descripcion: 'Listado completo de todos los viajes realizados',
      icono: '📊',
    },
    {
      id: 'pasajeros-transportados',
      titulo: 'Pasajeros Transportados',
      descripcion: 'Registro de pasajeros por período',
      icono: '👥',
    },
    {
      id: 'uso-embarcaciones',
      titulo: 'Uso de Embarcaciones',
      descripcion: 'Estadísticas de operación por embarcación',
      icono: '⚓',
    },
    {
      id: 'historial-rutas',
      titulo: 'Historial de Rutas',
      descripcion: 'Frecuencia y datos de rutas fluviales',
      icono: '🗺️',
    },
    {
      id: 'rendimiento-tripulacion',
      titulo: 'Rendimiento de Tripulación',
      descripcion: 'Desempeño de operadores y personal',
      icono: '👨‍✈️',
    },
    {
      id: 'incidentes-alertas',
      titulo: 'Incidentes y Alertas',
      descripcion: 'Registro de alertas del sistema GPS',
      icono: '⚠️',
    },
  ];

  const handleExportar = (formato: 'pdf' | 'excel') => {
    console.log(`Exportando reporte en formato ${formato}`);
    alert(`Exportando reporte en formato ${formato.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reportes y Estadísticas</h2>
        <p className="text-muted-foreground">Genera informes detallados del sistema de transporte fluvial</p>
      </div>

      {/* Filtros */}
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
              <option value="ferry-sanjose">Ferry San José</option>
              <option value="lancha-7">Lancha Rápida 7</option>
              <option value="bote-atrato">Bote Atrato</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ruta</label>
            <select
              value={filtros.ruta}
              onChange={(e) => setFiltros({ ...filtros, ruta: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="quibdo-istmina">Quibdó - Istmina</option>
              <option value="quibdo-tado">Quibdó - Tadó</option>
              <option value="quibdo-bellavista">Quibdó - Bellavista</option>
            </select>
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
              <option value="en-curso">En Curso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Aplicar Filtros
          </button>
          <button className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            Limpiar
          </button>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de Viajes */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Viajes y Pasajeros por Mes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosViajes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="viajes" stroke="#0B5ED7" strokeWidth={2} name="Viajes" />
              <Line type="monotone" dataKey="pasajeros" stroke="#64b5f6" strokeWidth={2} name="Pasajeros" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica de Embarcaciones */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Uso de Embarcaciones</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosEmbarcaciones}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="viajes" fill="#0B5ED7" name="Viajes" />
              <Bar dataKey="horas" fill="#64b5f6" name="Horas de Operación" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reportes Disponibles */}
      <div>
        <h3 className="font-semibold mb-4">Reportes Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  onClick={() => handleExportar('pdf')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
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

      {/* Resumen Estadístico */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Resumen Estadístico del Período</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary mb-1">261</p>
            <p className="text-sm text-muted-foreground">Total Viajes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 mb-1">7,178</p>
            <p className="text-sm text-muted-foreground">Pasajeros Transportados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 mb-1">831</p>
            <p className="text-sm text-muted-foreground">Horas de Operación</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600 mb-1">98.5%</p>
            <p className="text-sm text-muted-foreground">Tasa de Finalización</p>
          </div>
        </div>

        {/* Report Footer */}
        <ReportFooter
          reportType="Reporte Mensual de Operaciones"
          generatedBy="Administrador del Sistema"
          generatedDate="12 de Mayo, 2026 - 10:30 AM"
          pageNumber={1}
          totalPages={1}
        />
      </div>
    </div>
  );
}
