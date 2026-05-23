import { useState, useEffect, useCallback } from 'react';
import {
  Ship,
  Clock,
  MapPin,
  Calendar,
  Navigation,
  Ticket,
  DollarSign,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

type ViajeDisponible = {
  id: number;
  origen: string;
  destino: string;
  fecha_salida: string;
  cierre_inscripcion: string | null;
  precio: number;
  embarcacion_nombre: string;
  capacidad_pasajeros: number;
  pasajeros_count: number;
  cupos_disponibles: number;
};

type MiReserva = ViajeDisponible & {
  asiento: string;
  precio_pagado: number;
  estado: string;
};

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function useCountdown(target: string | null | undefined) {
  const [text, setText] = useState('—');

  useEffect(() => {
    if (!target) {
      setText('Abierto');
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setText('Inscripción cerrada');
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      let result = '';
      if (d > 0) result += `${d}d `;
      result += `${h}h ${m}m ${s}s`;
      setText(result);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return text;
}

function inscripcionAbierta(until: string | null | undefined) {
  if (!until) return true;
  return new Date(until).getTime() > Date.now();
}

function CountdownBadge({ until }: { until: string | null | undefined }) {
  const text = useCountdown(until);
  const closed = text === 'Inscripción cerrada';
  const open = text === 'Abierto';
  
  if (open) return null; // No mostrar si está siempre abierto

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
        closed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
      }`}
    >
      <Clock className="w-3 h-3" />
      {closed ? text : `Cierra en: ${text}`}
    </span>
  );
}

export function ClienteDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disponibles, setDisponibles] = useState<ViajeDisponible[]>([]);
  const [miReserva, setMiReserva] = useState<MiReserva | null>(null);
  const [reservando, setReservando] = useState<number | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [disp, reserva] = await Promise.all([
        api.getViajesDisponibles() as Promise<ViajeDisponible[]>,
        api.getMiViaje() as Promise<MiReserva | null>,
      ]);
      setDisponibles(disp);
      setMiReserva(reserva && (reserva as MiReserva).id ? reserva : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setDisponibles([]);
      setMiReserva(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInscribir = async (viajeId: number) => {
    setReservando(viajeId);
    setError(null);
    setOkMsg(null);
    try {
      await api.inscribirViaje(viajeId);
      setOkMsg('¡Inscripción exitosa! Tu viaje aparece abajo.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo inscribir');
    } finally {
      setReservando(null);
    }
  };

  const handleCancelarInscripcion = async (viajeId: number) => {
    if (!confirm('¿Estás seguro de cancelar tu inscripción?')) return;
    setLoading(true);
    setError(null);
    setOkMsg(null);
    try {
      await api.cancelarInscripcion(viajeId);
      setOkMsg('Inscripción cancelada correctamente.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar');
    } finally {
      setLoading(false);
    }
  };

  const cierreReserva = useCountdown(miReserva?.fecha_limite_inscripcion || miReserva?.cierre_inscripcion);

  if (loading) return <ViewFeedback loading />;
  if (error && !miReserva && disponibles.length === 0) {
    return <ViewFeedback error={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Bienvenido a GEONAVAL</h2>
        <p className="text-white/90">
          Consulta viajes disponibles, precios e inscríbete antes del cierre
        </p>
      </div>

      {error ? <ViewFeedback error={error} /> : null}
      {okMsg ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {okMsg}
        </div>
      ) : null}

      {miReserva ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h3 className="text-xl font-semibold">Tu viaje inscrito</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <StatusBadge
                status={
                  miReserva.estado === 'en_curso' ? 'en_curso' : 'programado'
                }
              />
              <CountdownBadge until={miReserva.fecha_limite_inscripcion || miReserva.cierre_inscripcion} />
            </div>
          </div>

          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">
              Tiempo restante para modificar inscripción
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{cierreReserva}</p>
            <p className="text-xs text-amber-700 mt-1">
              Cierre oficial: {formatDateTime(miReserva.fecha_limite_inscripcion || miReserva.cierre_inscripcion || '')}
            </p>
          </div>

          <div className="flex items-center justify-between relative mb-6">
            <div className="flex-1 text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold">{miReserva.origen}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(miReserva.fecha_salida)}
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Ship className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold">{miReserva.destino}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Fecha de salida</p>
              <p className="font-medium">{formatDate(miReserva.fecha_salida)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Embarcación</p>
              <p className="font-medium">{miReserva.embarcacion_nombre || '—'}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor pagado</p>
              <p className="font-bold text-green-700">
                {formatCOP(Number(miReserva.precio_pagado || miReserva.precio || 0))}
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-blue-100 rounded-lg border border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tu asiento</p>
              <p className="text-2xl font-bold text-primary">
                {miReserva.asiento || 'Por asignar'}
              </p>
            </div>
            {miReserva.estado === 'programado' && (
              <button
                type="button"
                onClick={() => handleCancelarInscripcion(miReserva.id)}
                className="px-6 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium shadow-sm"
              >
                Cancelar mi inscripción
              </button>
            )}
            <Ticket className="w-10 h-10 text-primary opacity-60 hidden md:block" />
          </div>
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-8 text-center border-2 border-dashed border-border">
          <Ticket className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground">
            No estás inscrito en ningún viaje
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            Explora los viajes disponibles abajo y asegura tu cupo para viajar por el Río Atrato.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Viajes disponibles</h3>
        </div>

        {disponibles.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No hay viajes con inscripción abierta en este momento.
          </p>
        ) : (
          <div className="space-y-4">
            {disponibles.map((v) => (
              <div
                key={v.id}
                className="p-4 border border-border rounded-xl hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-wrap justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-lg">
                      {v.origen} → {v.destino}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {v.embarcacion_nombre} · Salida:{' '}
                      {formatDateTime(v.fecha_salida)}
                    </p>
                  </div>
                  <CountdownBadge until={v.fecha_limite_inscripcion || v.cierre_inscripcion} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-bold text-green-700">
                      {formatCOP(Number(v.precio || 0))}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{v.cupos_disponibles}</strong>{' '}
                    cupos libres
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Capacidad: {v.capacidad_pasajeros}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ID: V-{v.id}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    reservando === v.id ||
                    v.cupos_disponibles <= 0 ||
                    !!miReserva ||
                    !inscripcionAbierta(v.fecha_limite_inscripcion || v.cierre_inscripcion)
                  }
                  onClick={() => handleInscribir(v.id)}
                  className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {reservando === v.id
                    ? 'Inscribiendo...'
                    : !!miReserva
                      ? 'Ya tienes un viaje activo'
                      : !inscripcionAbierta(v.fecha_limite_inscripcion || v.cierre_inscripcion)
                        ? 'Inscripción cerrada'
                        : v.cupos_disponibles <= 0
                          ? 'Sin cupos'
                          : 'Inscribirme en este viaje'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-primary mb-3">¿Necesitas ayuda?</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Teléfono: +57 (4) 670-1234 · soporte@geonaval.gov.co
        </p>
      </div>
    </div>
  );
}
