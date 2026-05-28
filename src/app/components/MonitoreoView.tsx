import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation, MapPin, Radio, AlertTriangle, Play, Square, Satellite } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix iconos Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Ícono barco para posición actual
const barcoIcon = L.divIcon({
  html: `<div style="
    background:#1d4ed8;
    border:3px solid white;
    border-radius:50%;
    width:20px;height:20px;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
  ">
    <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Ícono para mi posición (verde)
const miPosicionIcon = L.divIcon({
  html: `<div style="
    background:#16a34a;
    border:3px solid white;
    border-radius:50%;
    width:22px;height:22px;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    animation: pulse-green 1.5s infinite;
  ">
    <div style="width:8px;height:8px;background:white;border-radius:50%;margin:4px auto;"></div>
  </div>
  <style>
    @keyframes pulse-green {
      0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)}
      50%{box-shadow:0 0 0 10px rgba(22,163,74,0)}
    }
  </style>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Quibdó — centrado en el río Atrato (coordenadas exactas del río frente a la ciudad)
const QUIBDO: [number, number] = [5.6950, -76.6620];

// Componente para centrar el mapa en una posición
function CentrarMapa({ pos, zoom }: { pos: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, zoom ?? map.getZoom(), { duration: 1.5 });
  }, [pos, map, zoom]);
  return null;
}

type GpsEnCurso = {
  viaje_id: number;
  origen: string;
  destino: string;
  estado: string;
  embarcacion_nombre: string;
  latitud: number | null;
  longitud: number | null;
  timestamp: string | null;
};

type PuntoGps = {
  latitud: number;
  longitud: number;
  timestamp: string;
};

export function MonitoreoView() {
  const userRol = localStorage.getItem('userRole') || '';
  const esOperador = userRol === 'operador';
  const esAdmin = userRol === 'administrador';
  const esAutoridad = userRol === 'autoridad';

  // Estado del mapa
  const [viajesEnCurso, setViajesEnCurso] = useState<GpsEnCurso[]>([]);
  const [recorridos, setRecorridos] = useState<Record<number, PuntoGps[]>>({});
  const [centrarEn, setCentrarEn] = useState<[number, number] | null>(null);

  // Estado del tracker (operador)
  const [tracking, setTracking] = useState(false);
  const [miPos, setMiPos] = useState<[number, number] | null>(null);
  const [viajeActivo, setViajeActivo] = useState<number | null>(null);
  const [viajesDisponibles, setViajesDisponibles] = useState<{ id: number; label: string }[]>([]);
  const [viajeSeleccionado, setViajeSeleccionado] = useState('');
  const [errorGps, setErrorGps] = useState<string | null>(null);
  const [puntosEnviados, setPuntosEnviados] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ultimaPosRef = useRef<[number, number] | null>(null);

  // Cargar viajes en curso para el mapa
  const cargarGps = useCallback(async () => {
    try {
      const data = (await api.getGpsEnCurso()) as GpsEnCurso[];
      setViajesEnCurso(data);

      // Cargar recorrido de cada viaje
      for (const v of data) {
        const puntos = (await api.getGpsViaje(v.viaje_id)) as PuntoGps[];
        setRecorridos((prev) => ({ ...prev, [v.viaje_id]: puntos }));
      }
    } catch (e) {
      console.error('Error cargando GPS:', e);
    }
  }, []);

  // Cargar viajes disponibles para el operador
  const cargarViajesOperador = useCallback(async () => {
    try {
      const viajes = (await api.getViajes()) as Record<string, unknown>[];
      const enCurso = viajes.filter((v) => v.estado === 'en_curso');
      setViajesDisponibles(
        enCurso.map((v) => ({
          id: Number(v.id),
          label: `V-${v.id}: ${v.origen} → ${v.destino}`,
        }))
      );
      if (enCurso.length === 1) {
        setViajeSeleccionado(String(enCurso[0].id));
      }
    } catch (e) {
      console.error('Error cargando viajes:', e);
    }
  }, []);

  useEffect(() => {
    cargarGps();
    if (esOperador) cargarViajesOperador();

    // Actualizar mapa cada 5 segundos
    const interval = setInterval(cargarGps, 5000);
    return () => clearInterval(interval);
  }, [cargarGps, cargarViajesOperador, esOperador]);

  // Enviar posición al servidor
  const enviarPosicion = useCallback(async (lat: number, lng: number) => {
    const id = viajeActivo || parseInt(viajeSeleccionado, 10);
    if (!id) return;
    try {
      await api.postGpsUbicacion(id, lat, lng);
      setPuntosEnviados((n) => n + 1);
    } catch (e) {
      console.error('Error enviando GPS:', e);
    }
  }, [viajeActivo, viajeSeleccionado]);

  // Iniciar tracking
  const iniciarTracking = () => {
    const id = parseInt(viajeSeleccionado, 10);
    if (!id) {
      setErrorGps('Selecciona un viaje primero');
      return;
    }
    if (!navigator.geolocation) {
      setErrorGps('Tu dispositivo no soporta GPS');
      return;
    }
    setErrorGps(null);
    setViajeActivo(id);
    setPuntosEnviados(0);

    // Obtener posición continua
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMiPos([lat, lng]);
        setCentrarEn([lat, lng]);
        ultimaPosRef.current = [lat, lng];
      },
      (err) => {
        setErrorGps(`Error GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    // Enviar al servidor cada 5 segundos
    intervalRef.current = setInterval(() => {
      if (ultimaPosRef.current) {
        enviarPosicion(ultimaPosRef.current[0], ultimaPosRef.current[1]);
      }
    }, 5000);

    setTracking(true);
    // Centrar en posición actual al iniciar (se actualizará con la primera lectura GPS)
    setCentrarEn(QUIBDO);
  };

  // Detener tracking
  const detenerTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTracking(false);
    setViajeActivo(null);
    ultimaPosRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Monitoreo GPS en Tiempo Real</h2>
        <p className="text-muted-foreground">
          Seguimiento de embarcaciones en el Río Atrato — Quibdó, Chocó
        </p>
      </div>

      {/* Panel Tracker — solo para operadores */}
      {esOperador && (
        <div className={`rounded-xl border-2 shadow-sm p-5 ${
          tracking
            ? 'bg-green-50 border-green-400'
            : 'bg-white border-border'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${tracking ? 'bg-green-100' : 'bg-blue-50'}`}>
              <Satellite className={`w-5 h-5 ${tracking ? 'text-green-600' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="font-semibold">
                {tracking ? '📡 Transmitiendo ubicación en vivo' : 'Compartir mi ubicación GPS'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tracking
                  ? `Viaje V-${viajeActivo} · ${puntosEnviados} puntos enviados`
                  : 'Selecciona el viaje y presiona Iniciar'}
              </p>
            </div>
            {tracking && (
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">EN VIVO</span>
              </div>
            )}
          </div>

          {!tracking ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={viajeSeleccionado}
                onChange={(e) => setViajeSeleccionado(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="">— Seleccionar viaje en curso —</option>
                {viajesDisponibles.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.label}</option>
                ))}
              </select>
              <button
                onClick={iniciarTracking}
                disabled={!viajeSeleccionado}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                <Play className="w-4 h-4" />
                Iniciar Tracking
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {miPos && (
                <div className="flex-1 bg-green-100 rounded-lg px-4 py-2 text-sm">
                  <span className="text-green-800 font-medium">📍 Mi posición: </span>
                  <span className="text-green-700 font-mono">
                    {miPos[0].toFixed(6)}, {miPos[1].toFixed(6)}
                  </span>
                </div>
              )}
              <button
                onClick={detenerTracking}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Square className="w-4 h-4" />
                Detener Tracking
              </button>
            </div>
          )}

          {errorGps && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errorGps}
            </div>
          )}

          {viajesDisponibles.length === 0 && !tracking && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              ⚠️ No hay viajes en curso. El administrador debe cambiar un viaje a "En curso" primero.
            </p>
          )}
        </div>
      )}

      {/* Mapa principal */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Mapa — Río Atrato, Quibdó</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">EN VIVO · actualiza cada 5s</span>
          </div>
        </div>

        <div className="relative w-full h-[520px]">
          <MapContainer
            center={QUIBDO}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            {/* Capa base: CartoDB Voyager — resalta ríos y agua en azul */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />

            {centrarEn && <CentrarMapa pos={centrarEn} zoom={tracking ? 17 : undefined} />}

            {/* Mi posición (operador) */}
            {miPos && (
              <Marker position={miPos} icon={miPosicionIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-green-700">📍 Mi ubicación</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {miPos[0].toFixed(6)}, {miPos[1].toFixed(6)}
                    </p>
                    {viajeActivo && (
                      <p className="text-xs text-green-600 mt-1">Transmitiendo V-{viajeActivo}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Viajes en curso con GPS */}
            {viajesEnCurso.map((v) => {
              const puntos = recorridos[v.viaje_id] || [];
              const posActual: [number, number] | null =
                v.latitud && v.longitud ? [Number(v.latitud), Number(v.longitud)] : null;
              const linea: [number, number][] = puntos.map((p) => [
                Number(p.latitud),
                Number(p.longitud),
              ]);

              return (
                <div key={v.viaje_id}>
                  {/* Línea del recorrido */}
                  {linea.length > 1 && (
                    <Polyline
                      positions={linea}
                      color="#1d4ed8"
                      weight={4}
                      opacity={0.8}
                    />
                  )}
                  {/* Posición actual */}
                  {posActual && (
                    <Marker position={posActual} icon={barcoIcon}>
                      <Popup>
                        <div className="text-sm min-w-[160px]">
                          <p className="font-bold text-blue-700">
                            🚢 {v.embarcacion_nombre || 'Embarcación'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {v.origen} → {v.destino}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-1">
                            {posActual[0].toFixed(6)}, {posActual[1].toFixed(6)}
                          </p>
                          {v.timestamp && (
                            <p className="text-xs text-gray-400 mt-1">
                              Última señal:{' '}
                              {new Date(v.timestamp).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                timeZone: 'America/Bogota',
                              })}
                            </p>
                          )}
                          <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            En curso
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </div>
              );
            })}
          </MapContainer>

          {/* Sin viajes overlay */}
          {viajesEnCurso.length === 0 && !miPos && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
              <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-xl shadow-lg text-center border border-border">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-medium">No hay viajes en curso</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {esOperador
                    ? 'Inicia el tracking arriba para aparecer en el mapa'
                    : 'Las embarcaciones aparecerán aquí cuando zarpen'}
                </p>
              </div>
            </div>
          )}

          {/* Leyenda */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg z-[1000] text-xs space-y-1.5">
            <p className="font-semibold mb-2">Leyenda</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow" />
              <span>Embarcación en curso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full border-2 border-white shadow" />
              <span>Mi posición (operador)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-600 rounded" />
              <span>Recorrido registrado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel embarcaciones activas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Embarcaciones en Tránsito ({viajesEnCurso.length})
          </h3>
          <div className="space-y-3">
            {viajesEnCurso.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay embarcaciones operando en este momento
              </p>
            ) : (
              viajesEnCurso.map((v) => {
                const puntos = recorridos[v.viaje_id] || [];
                return (
                  <div key={v.viaje_id} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{v.embarcacion_nombre || `Viaje V-${v.viaje_id}`}</p>
                        <p className="text-sm text-muted-foreground">{v.origen} → {v.destino}</p>
                      </div>
                      <StatusBadge status="en_curso" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {v.latitud && v.longitud
                          ? `${Number(v.latitud).toFixed(4)}, ${Number(v.longitud).toFixed(4)}`
                          : 'Sin señal GPS aún'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5" />
                        {puntos.length} puntos registrados
                      </div>
                    </div>
                    {v.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Última señal:{' '}
                        {new Date(v.timestamp).toLocaleTimeString('es-CO', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                          timeZone: 'America/Bogota',
                        })}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Estado del Sistema GPS</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm text-green-800">Servidor GPS</span>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Activo</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm text-blue-800">Mapa OpenStreetMap</span>
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Conectado</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
              <span className="text-sm">Viajes monitoreados</span>
              <span className="text-xs font-bold text-primary">{viajesEnCurso.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
              <span className="text-sm">Actualización</span>
              <span className="text-xs text-muted-foreground">Cada 5 segundos</span>
            </div>
          </div>

          {(esAdmin || esAutoridad) && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Instrucciones para el operador:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Inicia sesión con cuenta de operador</li>
                <li>Ve a Monitoreo GPS</li>
                <li>Selecciona el viaje en curso</li>
                <li>Presiona "Iniciar Tracking"</li>
                <li>Permite el acceso al GPS del dispositivo</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
