"use strict";
/**
 * Servicio de Tiempo para Colombia
 * Usa WorldTimeAPI para obtener la hora exacta de Colombia
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getColombiaTime = getColombiaTime;
exports.formatColombiaDateTime = formatColombiaDateTime;
exports.getColombiaTimeSql = getColombiaTimeSql;
exports.isInPast = isInPast;
exports.getColombiaOffset = getColombiaOffset;
// Cache de la hora para evitar demasiadas llamadas a la API
let cachedTime = null;
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minuto
/**
 * Obtiene la hora actual de Colombia desde WorldTimeAPI
 */
async function getColombiaTime() {
    const now = Date.now();
    // Si tenemos un cache válido (menos de 1 minuto), usarlo
    if (cachedTime && (now - lastFetch) < CACHE_DURATION) {
        // Ajustar por el tiempo transcurrido
        const elapsed = now - lastFetch;
        return new Date(cachedTime.getTime() + elapsed);
    }
    try {
        // Intentar obtener la hora de la API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
        const response = await fetch('https://worldtimeapi.org/api/timezone/America/Bogota', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const data = await response.json();
            if (data && data.datetime) {
                const colombiaTime = new Date(data.datetime);
                cachedTime = colombiaTime;
                lastFetch = now;
                console.log('✅ Hora de Colombia obtenida de WorldTimeAPI:', colombiaTime.toISOString());
                return colombiaTime;
            }
        }
    }
    catch (error) {
        console.warn('⚠️ No se pudo obtener hora de WorldTimeAPI, usando hora del servidor');
    }
    // Fallback: usar hora del servidor (asumiendo que está configurado en America/Bogota)
    const serverTime = new Date();
    cachedTime = serverTime;
    lastFetch = now;
    return serverTime;
}
/**
 * Formatea una fecha de Colombia en formato legible
 */
function formatColombiaDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
/**
 * Obtiene la hora actual de Colombia en formato SQL
 */
async function getColombiaTimeSql() {
    const time = await getColombiaTime();
    // Formato: YYYY-MM-DD HH:mm:ss
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
/**
 * Verifica si una fecha es en el pasado (hora de Colombia)
 */
async function isInPast(dateStr) {
    const colombiaTime = await getColombiaTime();
    const targetDate = new Date(dateStr);
    return targetDate < colombiaTime;
}
/**
 * Obtiene el offset de Colombia en minutos
 */
function getColombiaOffset() {
    // Colombia está en UTC-5 (300 minutos)
    return -300;
}
