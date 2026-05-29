export type WithDbId<T> = T & { dbId: number };

// Recibe un string ISO "YYYY-MM-DDTHH:mm:ss" o "YYYY-MM-DD HH:mm:ss" (de PostgreSQL)
// y devuelve "DD/MM/YYYY" sin ninguna conversión de zona horaria
function formatDate(d: string | Date): string {
  if (!d) return '—';
  const s = String(d).trim();
  // Soporta "2026-05-26T08:00:00" y "2026-05-26 08:00:00"
  const datePart = s.split('T')[0].split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return s;
}

// Devuelve "HH:mm" directamente del string sin conversión
function formatTime(d: string | Date): string {
  if (!d) return '—';
  const s = String(d).trim();
  // Soporta "2026-05-26T08:00:00" y "2026-05-26 08:00:00"
  const timePart = s.includes('T') ? s.split('T')[1] : s.split(' ')[1];
  if (!timePart) return '—';
  const [h, m] = timePart.split(':');
  if (h === undefined || m === undefined) return '—';
  return `${h}:${m}`;
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
    direccion: (row.direccion as string) || '—',
    matriculaMercantil: (row.matricula_mercantil as string) || '—',
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
    horario: (row.telefono as string) || '—',
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
    email: (row.email as string) || '',
    viajeAsociado: row.viaje_id ? `V-${row.viaje_id}` : 'Pendiente',
    embarcacion: (row.embarcacion_nombre as string) || 'Pendiente',
    ruta: origen && destino ? `${origen} - ${destino}` : 'Pendiente',
    horaSalida: fecha ? formatTime(fecha) : 'Pendiente',
    horaLlegada: fecha ? formatTime(fecha) : 'Pendiente',
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
  const fechaSalida = row.fecha_salida as string;
  const fechaLlegada = row.fecha_llegada as string | undefined;
  const origen = row.origen as string;
  const destino = row.destino as string;
  const emb = embarcacionNombre || (row.embarcacion_nombre as string) || '—';
  const count = Number(row.pasajeros_count ?? 0);
  return {
    dbId: Number(row.id),
    id: `V-${String(row.id).padStart(3, '0')}`,
    fechaSalida: formatDate(fechaSalida),
    horaSalida: formatTime(fechaSalida),
    fechaLlegada: fechaLlegada ? formatDate(fechaLlegada) : formatDate(fechaSalida),
    horaLlegada: fechaLlegada ? formatTime(fechaLlegada) : '—',
    horaLlegadaReal: fechaLlegada ? formatTime(fechaLlegada) : '—',
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
  const bloqueada = row.cuenta_bloqueada === true;
  const estado = !row.activo ? 'inactivo' : bloqueada ? 'bloqueado' : 'activo';
  return {
    dbId: Number(row.id),
    id: `U-${String(row.id).padStart(3, '0')}`,
    nombre: row.nombre as string,
    email: row.email as string,
    rolDb: row.rol as string,
    rol: rolLabels[row.rol as string] || (row.rol as string),
    estado: estado as 'activo' | 'inactivo' | 'bloqueado',
    bloqueada,
    intentosFallidos: Number(row.intentos_fallidos ?? 0),
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
