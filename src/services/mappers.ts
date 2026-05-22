function formatDate(d: string | Date): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(d: string | Date): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rolLabel(rol: string): string {
  const labels: Record<string, string> = {
    capitan: 'Capitán',
    copiloto: 'Copiloto',
    ayudante_cubierta: 'Ayudante de Cubierta',
    motorista: 'Motorista',
    auxiliar_pasajeros: 'Auxiliar de Pasajeros',
  };
  return labels[rol] || rol;
}

export function mapEmbarcacionToUI(
  row: Record<string, unknown>,
  propietarioNombre = '—'
) {
  const estado = row.estado as string;
  return {
    id: `E-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    tipo: row.tipo as string,
    capacidad: row.capacidad_pasajeros as number,
    estado: estado as 'operativa' | 'mantenimiento' | 'fuera_servicio' | 'inspeccion',
    propietario: propietarioNombre,
    viajesAsignados: 0,
    tripulacion: [] as string[],
    viajes: [] as string[],
    ubicacionMantenimiento:
      estado === 'mantenimiento'
        ? {
            lugar: 'Taller asignado',
            direccion: '—',
            coordenadas: '—',
          }
        : null,
    detallesMantenimiento:
      estado === 'mantenimiento'
        ? {
            tipo: 'Preventivo',
            fechaIngreso: formatDate(row.created_at as string),
            fechaEstimadaSalida: '—',
            descripcion: (row.motor as string) || 'En mantenimiento',
          }
        : null,
  };
}

export function mapPropietarioToUI(row: Record<string, unknown>) {
  const tipo = row.tipo as string;
  const isEmpresa = tipo === 'empresa';
  return {
    id: `P-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    tipo: isEmpresa ? 'Empresa' : 'Natural',
    documento: isEmpresa
      ? `NIT ${(row.nit as string) || row.identificacion}`
      : (row.identificacion as string),
    telefono: (row.telefono as string) || '—',
    embarcaciones: 0,
  };
}

export function mapTripulacionToUI(row: Record<string, unknown>) {
  return {
    id: `T-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    documento: row.documento as string,
    rol: rolLabel(row.rol as string),
    licencias: (row.licencias as string) || '—',
    telefono: (row.telefono as string) || '—',
    estado: (row.activo ? 'activo' : 'inactivo') as 'activo' | 'inactivo',
    embarcacion: '—',
    viajes: '—',
    horario: '—',
  };
}

export function mapPasajeroToUI(row: Record<string, unknown>) {
  return {
    id: `PS-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    documento: row.documento as string,
    telefono: (row.telefono as string) || '—',
    viajeAsociado: '—',
    embarcacion: '—',
    ruta: '—',
    horaSalida: '—',
    horaLlegada: '—',
    estado: 'pendiente' as const,
    estadoViaje: 'programado' as const,
  };
}

export function mapViajeToUI(
  row: Record<string, unknown>,
  embarcacionNombre = '—'
) {
  const fecha = row.fecha_salida as string;
  const origen = row.origen as string;
  const destino = row.destino as string;
  return {
    id: `V-${String(row.id).padStart(3, '0')}`,
    fechaSalida: formatDate(fecha),
    horaSalida: formatTime(fecha),
    fechaLlegada: formatDate(fecha),
    horaLlegada: formatTime(fecha),
    horaLlegadaReal: formatTime(fecha),
    ruta: `${origen} - ${destino}`,
    embarcacion: embarcacionNombre,
    operador: '—',
    pasajeros: 0,
    estado: row.estado as 'programado' | 'en_curso' | 'finalizado' | 'cancelado',
    duracion: '—',
  };
}

export function mapViajeToDashboard(
  row: Record<string, unknown>,
  embarcacionNombre = '—',
  propietarioNombre = '—'
) {
  const fecha = row.fecha_salida as string;
  const origen = row.origen as string;
  const destino = row.destino as string;
  const estado = row.estado as string;
  return {
    ruta: `${origen} - ${destino}`,
    embarcacion: embarcacionNombre,
    propietario: propietarioNombre,
    horaSalida: formatTime(fecha),
    horaLlegada: formatTime(fecha),
    operador: '—',
    estado: (estado === 'en_curso'
      ? 'en-curso'
      : estado) as 'en-curso' | 'finalizado' | 'programado',
  };
}

export function mapEmbarcacionToMonitoreo(row: Record<string, unknown>) {
  return {
    id: `E-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    viaje: '—',
    ruta: '—',
    latitud: 5.6942,
    longitud: -76.6611,
    velocidad: 0,
    estado: 'en-curso' as const,
    ultimaActualizacion: '—',
    alertas: 0,
  };
}
