/**
 * Servicio de Tiempo para Colombia
 * Usa WorldTimeAPI para obtener la hora exacta de Colombia
 * 
 * IMPORTANTE: WorldTimeAPI devuelve "2026-05-29T23:57:00.123456-05:00"
 * NO usar new Date() porque convierte a UTC internamente.
 * Extraemos la hora directamente del string.
 */

// Cache del string de hora Colombia para evitar demasiadas llamadas
let cachedSql: string | null = null;
let cachedTimestamp: number = 0; // momento real en que se hizo el fetch
let lastFetch: number = 0;
const CACHE_DURATION = 30000; // 30 segundos

/**
 * Extrae "YYYY-MM-DD HH:mm:ss" directamente del string de WorldTimeAPI
 * sin ninguna conversión de zona horaria.
 * Ejemplo: "2026-05-29T23:57:00.123456-05:00" → "2026-05-29 23:57:00"
 */
function parseDatetimeString(datetimeStr: string): string {
  // Formato: "2026-05-29T23:57:00.123456-05:00"
  // Tomamos solo la parte antes del offset y antes de los microsegundos
  const withoutOffset = datetimeStr.split('-05:00')[0].split('+')[0];
  const normalized = withoutOffset.replace('T', ' ').split('.')[0];
  return normalized; // "2026-05-29 23:57:00"
}

/**
 * Obtiene la hora actual de Colombia en formato SQL "YYYY-MM-DD HH:mm:ss"
 * directamente de WorldTimeAPI sin conversiones UTC.
 */
export async function getColombiaTimeSql(): Promise<string> {
  const now = Date.now();

  // Cache válido: ajustar por tiempo transcurrido
  if (cachedSql && (now - lastFetch) < CACHE_DURATION) {
    const elapsed = Math.floor((now - cachedTimestamp) / 1000);
    // Sumar los segundos transcurridos al string de fecha
    const base = new Date(cachedSql.replace(' ', 'T') + 'Z'); // tratar como UTC solo para sumar
    // Pero en realidad solo necesitamos sumar segundos al string
    const parts = cachedSql.split(' ');
    const datePart = parts[0];
    const timeParts = parts[1].split(':');
    let h = parseInt(timeParts[0]);
    let m = parseInt(timeParts[1]);
    let s = parseInt(timeParts[2]) + elapsed;
    m += Math.floor(s / 60); s = s % 60;
    h += Math.floor(m / 60); m = m % 60;
    h = h % 24;
    return `${datePart} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://worldtimeapi.org/api/timezone/America/Bogota', {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.datetime) {
        // Extraer directamente sin new Date()
        const sqlTime = parseDatetimeString(data.datetime);
        cachedSql = sqlTime;
        cachedTimestamp = now;
        lastFetch = now;
        console.log(`✅ Hora Colombia (WorldTimeAPI): ${sqlTime}`);
        return sqlTime;
      }
    }
  } catch (error) {
    console.warn('⚠️ WorldTimeAPI no disponible, usando fallback Colombia (UTC-5)');
  }

  // Fallback: calcular UTC-5 manualmente
  const utcNow = new Date();
  const colombiaMs = utcNow.getTime() - (5 * 60 * 60 * 1000);
  const colombia = new Date(colombiaMs);
  const year  = colombia.getUTCFullYear();
  const month = String(colombia.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(colombia.getUTCDate()).padStart(2, '0');
  const hours = String(colombia.getUTCHours()).padStart(2, '0');
  const mins  = String(colombia.getUTCMinutes()).padStart(2, '0');
  const secs  = String(colombia.getUTCSeconds()).padStart(2, '0');
  const fallback = `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  
  cachedSql = fallback;
  cachedTimestamp = now;
  lastFetch = now;
  console.log(`⚠️ Hora Colombia (fallback UTC-5): ${fallback}`);
  return fallback;
}

/**
 * Obtiene la hora actual de Colombia como objeto Date
 * (para comparaciones, no para formatear)
 */
export async function getColombiaTime(): Promise<Date> {
  const sql = await getColombiaTimeSql();
  // Crear Date desde el string SQL tratándolo como UTC para comparaciones
  return new Date(sql.replace(' ', 'T') + 'Z');
}

/**
 * Verifica si una fecha es en el pasado (hora de Colombia)
 */
export async function isInPast(dateStr: string): Promise<boolean> {
  const sqlNow = await getColombiaTimeSql();
  return dateStr < sqlNow; // comparación lexicográfica funciona con formato YYYY-MM-DD HH:mm:ss
}

/**
 * Obtiene el offset de Colombia en minutos
 */
export function getColombiaOffset(): number {
  return -300; // UTC-5
}
