export type WithDbId<T> = T & { dbId: number };

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

const rolLabels: Record<string, string> = {
  administrador: 'Administrador',
  operador: 'Operador Fluvial',
  cliente: 'Cliente',
  autoridad: 'Autoridad',
  capitan: 'Capitán',
  copiloto: 'Copiloto',
  ayudante_cubierta: 'Ayudante de Cubierta',
  motorista: 'Motorista',
  auxiliar_pasajeros: 'Auxiliar de Pasajeros',
};

export function mapEmbarcacionToUI(
  row: Record<string, unknown>,
  propietarioNombre = '—'
): WithDbId<{
  id: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  estado: 'operativa' | 'mantenimiento' | 'fuera_servicio' | 'inspeccion';
  propietario: string;
  viajesAsignados: number;
  tripulacion: string[];
  viajes: string[];
  ubicacionMantenimiento: {
    lugar: string;
    direccion: string;
    coordenadas: string;
  } | null;
  detallesMantenimiento: {
    tipo: string;
    fechaIngreso: string;
    fechaEstimadaSalida: string;
    descripcion: string;
  } | null;
}> {
  const estado = row.estado as string;
  return {
    dbId: Number(row.id),
    id: `E-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    tipo: (row.tipo as string) || '—',
    capacidad: row.capacidad_pasajeros as number,
    estado: estado as 'operativa' | 'mantenimiento' | 'fuera_servicio' | 'inspeccion',
    propietario: propietarioNombre,
    viajesAsignados: Number(row.viajes_count ?? 0),
    tripulacion: [],
    viajes: [],
    ubicacionMantenimiento:
      estado === 'mantenimiento'
        ? { lugar: 'Taller asignado', direccion: '—', coordenadas: '—' }
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
    dbId: Number(row.id),
    id: `P-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    tipo: isEmpresa ? 'Empresa' : 'Natural',
    documento: isEmpresa
      ? `NIT ${(row.nit as string) || row.identificacion}`
      : (row.identificacion as string),
    telefono: (row.telefono as string) || '—',
    embarcaciones: Number(row.embarcaciones_count ?? 0),
  };
}

export function mapTripulacionToUI(row: Record<string, unknown>) {
  return {
    dbId: Number(row.id),
    id: `T-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    documento: row.documento as string,
    rol: rolLabels[row.rol as string] || (row.rol as string),
    rolDb: row.rol as string,
    licencias: (row.licencias as string) || '—',
    telefono: (row.telefono as string) || '—',
    email: (row.email as string) || '',
    estado: (row.activo ? 'activo' : 'inactivo') as 'activo' | 'inactivo',
    embarcacion: (row.embarcacion_nombre as string) || '—',
    viajes: row.viajes_count != null ? String(row.viajes_count) : '0',
    horario: '—',
  };
}

export function mapPasajeroToUI(row: Record<string, unknown>) {
  const origen = row.origen as string | undefined;
  const destino = row.destino as string | undefined;
  const viajeEstado = row.viaje_estado as string | undefined;
  const fecha = row.fecha_salida as string | undefined;
  const estadoPasajero =
    viajeEstado === 'en_curso'
      ? 'embarcado'
      : viajeEstado === 'programado'
        ? 'confirmado'
        : 'pendiente';
  return {
    dbId: Number(row.id),
    id: `PS-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    documento: row.documento as string,
    telefono: (row.telefono as string) || '—',
    viajeAsociado: row.viaje_id ? `V-${row.viaje_id}` : '—',
    embarcacion: (row.embarcacion_nombre as string) || '—',
    ruta: origen && destino ? `${origen} - ${destino}` : '—',
    horaSalida: fecha ? formatTime(fecha) : '—',
    horaLlegada: fecha ? formatTime(fecha) : '—',
    estado: estadoPasajero as 'confirmado' | 'pendiente' | 'embarcado',
    estadoViaje: (viajeEstado || 'programado') as
      | 'programado'
      | 'en_curso'
      | 'finalizado'
      | 'cancelado',
  };
}

export function mapViajeToUI(
  row: Record<string, unknown>,
  embarcacionNombre?: string
) {
  const fecha = row.fecha_salida as string;
  const origen = row.origen as string;
  const destino = row.destino as string;
  const emb =
    embarcacionNombre || (row.embarcacion_nombre as string) || '—';
  const count = Number(row.pasajeros_count ?? 0);
  return {
    dbId: Number(row.id),
    id: `V-${String(row.id).padStart(3, '0')}`,
    fechaSalida: formatDate(fecha),
    horaSalida: formatTime(fecha),
    fechaLlegada: formatDate(fecha),
    horaLlegada: formatTime(fecha),
    horaLlegadaReal: formatTime(fecha),
    ruta: `${origen} - ${destino}`,
    embarcacion: emb,
    propietario: (row.propietario_nombre as string) || '—',
    operador: (row.operador_nombre as string) || '—',
    pasajeros: count,
    precio: Number(row.precio ?? 0),
    cierreInscripcion: row.cierre_inscripcion as string | undefined,
    estado: row.estado as 'programado' | 'en_curso' | 'finalizado' | 'cancelado',
    duracion: '—',
  };
}

export function mapViajeToDashboard(
  row: Record<string, unknown>,
  embarcacionNombre?: string
) {
  const fecha = row.fecha_salida as string;
  const origen = row.origen as string;
  const destino = row.destino as string;
  const estado = row.estado as string;
  return {
    ruta: `${origen} - ${destino}`,
    embarcacion:
      embarcacionNombre ||
      (row.embarcacion_nombre as string) ||
      '—',
    propietario: (row.propietario_nombre as string) || '—',
    horaSalida: formatTime(fecha),
    horaLlegada: formatTime(fecha),
    operador: (row.operador_nombre as string) || '—',
    estado: (estado === 'en_curso'
      ? 'en-curso'
      : estado) as 'en-curso' | 'finalizado' | 'programado',
  };
}

export function mapUsuarioToUI(row: Record<string, unknown>) {
  return {
    dbId: Number(row.id),
    id: `U-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    email: row.email as string,
    rolDb: row.rol as string,
    rol: rolLabels[row.rol as string] || (row.rol as string),
    estado: (row.activo ? 'activo' : 'inactivo') as 'activo' | 'inactivo',
    ultimoAcceso: row.created_at
      ? formatDate(row.created_at as string)
      : '—',
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

export const tripulacionRolToDb: Record<string, string> = {
  operador: 'capitan',
  'segundo-operador': 'copiloto',
  'auxiliar-cubierta': 'ayudante_cubierta',
  motorista: 'motorista',
  'auxiliar-pasajeros': 'auxiliar_pasajeros',
};
