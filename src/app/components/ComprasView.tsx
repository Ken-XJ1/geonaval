import { useState, useEffect, useCallback } from 'react';
import { Plus, Ticket, Calendar, Search, Download, CreditCard, Banknote, ArrowLeftRight, CheckCircle, X, AlertCircle, Loader2 } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

type CompraRow = {
  dbId: number;
  id: string;
  ticket: string;
  fecha: string;
  fechaISO: string;
  pasajero: string;
  documento: string;
  viaje: string;
  ruta: string;
  asiento: string;
  precio: string;
  metodoPago: string;
  estado: 'confirmado' | 'pendiente';
  vendedor: string;
};

type ComprasStats = {
  ventasHoy: number;
  totalRecaudado: number;
  ticketsConfirmados: number;
  ticketsPendientes: number;
};

type PasoModal = 'formulario_pago' | 'procesando' | 'aprobado' | 'rechazado';

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetodoPago(metodo: string | null | undefined) {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
  };
  return metodo ? (map[metodo] ?? metodo) : '—';
}

// ─── Modal de Pago ───────────────────────────────────────────────────────────
function ModalPago({
  metodoPago,
  precio,
  pasajero,
  onConfirmar,
  onCancelar,
}: {
  metodoPago: string;
  precio: number;
  pasajero: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const [paso, setPaso] = useState<PasoModal>('formulario_pago');
  const [tarjeta, setTarjeta] = useState({ numero: '', nombre: '', expiry: '', cvv: '' });
  const [referencia, setReferencia] = useState('');
  const [errorPago, setErrorPago] = useState<string | null>(null);

  const procesarPago = async () => {
    setErrorPago(null);

    // Validaciones por método
    if (metodoPago === 'tarjeta') {
      if (tarjeta.numero.replace(/\s/g, '').length < 16) return setErrorPago('Número de tarjeta inválido');
      if (!tarjeta.nombre.trim()) return setErrorPago('Ingresa el nombre del titular');
      if (!tarjeta.expiry.match(/^\d{2}\/\d{2}$/)) return setErrorPago('Fecha de vencimiento inválida (MM/AA)');
      if (tarjeta.cvv.length < 3) return setErrorPago('CVV inválido');
    }
    if (metodoPago === 'transferencia') {
      if (!referencia.trim()) return setErrorPago('Ingresa el número de referencia de la transferencia');
    }

    setPaso('procesando');
    // Simular procesamiento (2 segundos)
    await new Promise((r) => setTimeout(r, 2000));
    // Simular aprobación (95% éxito)
    if (Math.random() > 0.05) {
      setPaso('aprobado');
    } else {
      setPaso('rechazado');
    }
  };

  const formatNumeroTarjeta = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className={`rounded-t-2xl p-5 text-white ${
          paso === 'aprobado' ? 'bg-green-600' :
          paso === 'rechazado' ? 'bg-red-600' :
          paso === 'procesando' ? 'bg-blue-600' :
          metodoPago === 'tarjeta' ? 'bg-gradient-to-r from-blue-700 to-blue-500' :
          metodoPago === 'transferencia' ? 'bg-gradient-to-r from-purple-700 to-purple-500' :
          'bg-gradient-to-r from-green-700 to-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {paso === 'aprobado' ? <CheckCircle className="w-7 h-7" /> :
               paso === 'rechazado' ? <AlertCircle className="w-7 h-7" /> :
               paso === 'procesando' ? <Loader2 className="w-7 h-7 animate-spin" /> :
               metodoPago === 'tarjeta' ? <CreditCard className="w-7 h-7" /> :
               metodoPago === 'transferencia' ? <ArrowLeftRight className="w-7 h-7" /> :
               <Banknote className="w-7 h-7" />}
              <div>
                <h3 className="text-lg font-bold">
                  {paso === 'aprobado' ? 'Pago Aprobado' :
                   paso === 'rechazado' ? 'Pago Rechazado' :
                   paso === 'procesando' ? 'Procesando...' :
                   metodoPago === 'tarjeta' ? 'Pago con Tarjeta' :
                   metodoPago === 'transferencia' ? 'Transferencia Bancaria' :
                   'Pago en Efectivo'}
                </h3>
                <p className="text-white/80 text-sm">{formatCOP(precio)} — {pasajero}</p>
              </div>
            </div>
            {paso === 'formulario_pago' && (
              <button type="button" onClick={onCancelar} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">

          {/* PROCESANDO */}
          {paso === 'procesando' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="font-semibold text-lg">Procesando el pago</p>
              <p className="text-sm text-muted-foreground mt-1">Por favor espera...</p>
            </div>
          )}

          {/* APROBADO */}
          {paso === 'aprobado' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-xl text-green-700">Pago exitoso</p>
                <p className="text-sm text-muted-foreground mt-1">
                  El ticket ha sido generado para <strong>{pasajero}</strong>
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto pagado</span>
                  <span className="font-bold text-green-700">{formatCOP(precio)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-medium">{formatMetodoPago(metodoPago)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Referencia</span>
                  <span className="font-mono text-xs">TXN-{Math.random().toString(36).slice(2, 10).toUpperCase()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onConfirmar}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors"
              >
                Confirmar y Generar Ticket
              </button>
            </div>
          )}

          {/* RECHAZADO */}
          {paso === 'rechazado' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-xl text-red-700">Pago rechazado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No se pudo procesar el pago. Verifica los datos e intenta de nuevo.
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onCancelar}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={() => { setPaso('formulario_pago'); setErrorPago(null); }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* FORMULARIO TARJETA */}
          {paso === 'formulario_pago' && metodoPago === 'tarjeta' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl p-4 text-white">
                <p className="text-xs opacity-70 mb-3">Tarjeta de crédito / débito</p>
                <p className="font-mono text-lg tracking-widest">
                  {tarjeta.numero || '•••• •••• •••• ••••'}
                </p>
                <div className="flex justify-between mt-3 text-sm">
                  <span>{tarjeta.nombre || 'NOMBRE TITULAR'}</span>
                  <span>{tarjeta.expiry || 'MM/AA'}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de tarjeta</label>
                <input type="text" value={tarjeta.numero} maxLength={19}
                  onChange={(e) => setTarjeta({ ...tarjeta, numero: formatNumeroTarjeta(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none font-mono tracking-wider"
                  placeholder="1234 5678 9012 3456" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del titular</label>
                <input type="text" value={tarjeta.nombre}
                  onChange={(e) => setTarjeta({ ...tarjeta, nombre: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none uppercase"
                  placeholder="COMO APARECE EN LA TARJETA" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Vencimiento</label>
                  <input type="text" value={tarjeta.expiry} maxLength={5}
                    onChange={(e) => setTarjeta({ ...tarjeta, expiry: formatExpiry(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none font-mono"
                    placeholder="MM/AA" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CVV</label>
                  <input type="password" value={tarjeta.cvv} maxLength={4}
                    onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none font-mono"
                    placeholder="•••" />
                </div>
              </div>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorPago}</p>}
              <button type="button" onClick={procesarPago}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                Pagar {formatCOP(precio)}
              </button>
            </div>
          )}

          {/* FORMULARIO TRANSFERENCIA */}
          {paso === 'formulario_pago' && metodoPago === 'transferencia' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-purple-900 text-sm">Datos para transferencia</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Banco</span>
                    <span className="font-medium">Bancolombia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo de cuenta</span>
                    <span className="font-medium">Ahorros</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número</span>
                    <span className="font-mono font-medium">123-456789-00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Titular</span>
                    <span className="font-medium">GeoNaval S.A.S</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-200 pt-2 mt-2">
                    <span className="text-muted-foreground font-medium">Monto a transferir</span>
                    <span className="font-bold text-purple-700">{formatCOP(precio)}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de referencia / comprobante</label>
                <input type="text" value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                  placeholder="Ej: 2026052800123456" />
                <p className="text-xs text-muted-foreground mt-1">Ingresa el número de referencia del comprobante de pago</p>
              </div>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorPago}</p>}
              <button type="button" onClick={procesarPago}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Verificar Transferencia
              </button>
            </div>
          )}

          {/* EFECTIVO */}
          {paso === 'formulario_pago' && metodoPago === 'efectivo' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <Banknote className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-bold text-2xl text-green-700">{formatCOP(precio)}</p>
                <p className="text-sm text-muted-foreground mt-1">Monto a cobrar al pasajero</p>
              </div>
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pasajero</span>
                  <span className="font-medium">{pasajero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método</span>
                  <span className="font-medium">Efectivo</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-green-700">{formatCOP(precio)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Confirma que recibiste el pago en efectivo para generar el ticket
              </p>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorPago}</p>}
              <button type="button" onClick={procesarPago}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <Banknote className="w-4 h-4" />
                Confirmar Pago Recibido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ComprasView() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModalPago, setShowModalPago] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [viajesDisponibles, setViajesDisponibles] = useState<
    { id: string; label: string; asientos: number; precio: number }[]
  >([]);
  const [formData, setFormData] = useState({
    pasajeroNombre: '',
    pasajeroDocumento: '',
    pasajeroTelefono: '',
    viaje: '',
    asiento: '',
    precio: '',
    metodoPago: 'efectivo',
  });

  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFecha, setFiltroFecha] = useState({ desde: '', hasta: '' });
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);
  const [stats, setStats] = useState<ComprasStats>({
    ventasHoy: 0,
    totalRecaudado: 0,
    ticketsConfirmados: 0,
    ticketsPendientes: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pasajeros, viajes, statsData] = await Promise.all([
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getComprasStats() as Promise<ComprasStats>,
      ]);

      // Todos los viajes programados disponibles para inscribir
      const viajesProgramados = (viajes as Record<string, unknown>[]).filter(
        (v) => v.estado === 'programado'
      );

      setViajesDisponibles(
        viajesProgramados.map((v) => {
          // Parsear fecha directamente del string sin conversión
          const fechaStr = String(v.fecha_salida ?? '');
          const datePart = fechaStr.split('T')[0].split(' ')[0];
          const timePart = fechaStr.includes('T')
            ? fechaStr.split('T')[1]
            : fechaStr.split(' ')[1] ?? '';
          const [y, mo, d] = datePart.split('-');
          const [h, mi] = (timePart ?? '').split(':');
          const fechaLabel = d && mo && y ? `${d}/${mo}/${y}` : datePart;
          const horaLabel = h && mi ? ` ${h}:${mi}` : '';
          return {
            id: String(v.id),
            label: `V-${v.id}: ${v.origen} → ${v.destino} — ${fechaLabel}${horaLabel}`,
            asientos: Number(v.cupos_disponibles ?? (v as any).capacidad_pasajeros ?? 0),
            precio: Number(v.precio ?? 0),
          };
        })
      );

      setStats(statsData);

      // Parsear fecha de created_at sin conversión UTC
      setCompras(
        pasajeros.map((p) => {
          const rawFecha = String(p.created_at ?? '');
          const datePart = rawFecha.split('T')[0].split(' ')[0];
          const [y, mo, d] = datePart.split('-');
          const fechaDisplay = d && mo && y ? `${d}/${mo}/${y}` : '—';
          const fechaISO = datePart || '';

          return {
            dbId: Number(p.id),
            id: `C-${String(p.id).padStart(3, '0')}`,
            ticket: `TKT-${String(p.id).padStart(3, '0')}`,
            fecha: fechaDisplay,
            fechaISO,
            pasajero: p.nombre as string,
            documento: p.documento as string,
            viaje: p.viaje_id ? `V-${p.viaje_id}` : '—',
            ruta: p.origen && p.destino ? `${p.origen} - ${p.destino}` : '—',
            asiento: p.asiento ? String(p.asiento) : '—',
            precio: p.precio_pagado != null ? formatCOP(Number(p.precio_pagado)) : '—',
            metodoPago: formatMetodoPago(p.metodo_pago as string | null),
            estado: 'confirmado' as const,
            vendedor: 'Sistema',
          };
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
      setCompras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { key: 'ticket', label: 'Ticket' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'pasajero', label: 'Pasajero' },
    { key: 'documento', label: 'Documento' },
    { key: 'ruta', label: 'Ruta' },
    { key: 'asiento', label: 'Asiento' },
    { key: 'precio', label: 'Precio' },
    { key: 'metodoPago', label: 'Método Pago' },
    {
      key: 'estado',
      label: 'Estado',
      render: (value: any) => <StatusBadge status={value} />,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validar antes de abrir el modal de pago
    if (!formData.viaje) {
      setError('Debes seleccionar un viaje para generar el ticket');
      return;
    }
    if (!formData.pasajeroNombre || !formData.pasajeroDocumento) {
      setError('Nombre y documento del pasajero son requeridos');
      return;
    }
    setError(null);
    // Abrir modal de pago
    setShowModalPago(true);
  };

  const handlePagoConfirmado = async () => {
    setShowModalPago(false);
    setPendingSubmit(true);
    try {
      const viajeSel = viajesDisponibles.find((v) => v.id === formData.viaje);
      const created = (await api.createPasajero({
        nombre: formData.pasajeroNombre,
        documento: formData.pasajeroDocumento,
        telefono: formData.pasajeroTelefono,
        email: null,
      })) as { id: number };

      await api.assignPasajeroViaje(
        parseInt(formData.viaje, 10),
        created.id,
        {
          asiento: formData.asiento || undefined,
          precio_pagado: parseFloat(formData.precio) || viajeSel?.precio || 0,
          metodo_pago: formData.metodoPago,
        }
      );

      setFormData({
        pasajeroNombre: '',
        pasajeroDocumento: '',
        pasajeroTelefono: '',
        viaje: '',
        asiento: '',
        precio: '',
        metodoPago: 'efectivo',
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setPendingSubmit(false);
    }
  };

  const handleDelete = async (row: CompraRow) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await api.deletePasajero(row.dbId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const filteredCompras = compras.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !(
      c.ticket.toLowerCase().includes(q) ||
      c.pasajero.toLowerCase().includes(q) ||
      c.documento.toLowerCase().includes(q)
    )) return false;

    if (filtroFecha.desde && c.fechaISO < filtroFecha.desde) return false;
    if (filtroFecha.hasta && c.fechaISO > filtroFecha.hasta) return false;

    return true;
  });

  const handleExportar = () => {
    const encabezados = ['Ticket', 'Fecha', 'Pasajero', 'Documento', 'Ruta', 'Asiento', 'Precio', 'Método Pago', 'Estado'];
    const filas = filteredCompras.map((c) => [
      c.ticket, c.fecha, c.pasajero, c.documento,
      c.ruta, c.asiento, c.precio, c.metodoPago, c.estado,
    ]);
    const csv = [encabezados, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_geonaval_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <ViewFeedback loading />;
  if (error && compras.length === 0) return <ViewFeedback error={error} />;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error} /> : null}

      {/* Modal de Pago */}
      {showModalPago && (
        <ModalPago
          metodoPago={formData.metodoPago}
          precio={parseFloat(formData.precio) || viajesDisponibles.find(v => v.id === formData.viaje)?.precio || 0}
          pasajero={formData.pasajeroNombre}
          onConfirmar={handlePagoConfirmado}
          onCancelar={() => setShowModalPago(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Compras y Tickets</h2>
          <p className="text-muted-foreground">Venta de pasajes y gestión de tickets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Compra
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Registrar Nueva Compra de Ticket
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Información del Pasajero */}
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm mb-3 text-primary">Datos del Pasajero</h4>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.pasajeroNombre}
                onChange={(e) => setFormData({ ...formData, pasajeroNombre: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Nombre del pasajero"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Documento de Identidad</label>
              <input
                type="text"
                value={formData.pasajeroDocumento}
                onChange={(e) => setFormData({ ...formData, pasajeroDocumento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Número de documento"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.pasajeroTelefono}
                onChange={(e) => setFormData({ ...formData, pasajeroTelefono: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="+57 300 1234567"
              />
            </div>

            {/* Información del Viaje */}
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm mb-3 text-primary mt-2">Asignar al Viaje</h4>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Viaje Disponible</label>
              <select
                value={formData.viaje}
                onChange={(e) => {
                  const id = e.target.value;
                  const sel = viajesDisponibles.find((v) => v.id === id);
                  setFormData({
                    ...formData,
                    viaje: id,
                    precio: sel ? String(sel.precio) : '',
                  });
                }}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                required
              >
                <option value="">— Seleccionar viaje —</option>
                {viajesDisponibles.length === 0 && (
                  <option disabled>No hay viajes programados disponibles</option>
                )}
                {viajesDisponibles.map((viaje) => (
                  <option key={viaje.id} value={viaje.id}>
                    {viaje.label} ({viaje.asientos} cupos) —{' '}
                    {formatCOP(viaje.precio)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Asiento <span className="text-muted-foreground font-normal">(opcional, se asigna automático)</span>
              </label>
              <input
                type="text"
                value={formData.asiento}
                onChange={(e) => setFormData({ ...formData, asiento: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Ej: A-15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Precio (COP)</label>
              <input
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                placeholder="Se autocompleta al seleccionar viaje"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Método de Pago</label>
              <select
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                {pendingSubmit ? 'Registrando...' : 'Continuar al Pago'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold text-primary">{stats.ventasHoy}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-green-600">{formatCOP(stats.totalRecaudado)}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tickets Confirmados</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.ticketsConfirmados}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Tickets Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats.ticketsPendientes}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ticket, pasajero o documento..."
              className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setMostrarFiltroFecha(!mostrarFiltroFecha)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              filtroFecha.desde || filtroFecha.hasta
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Filtrar por Fecha
            {(filtroFecha.desde || filtroFecha.hasta) && (
              <span className="ml-1 text-xs bg-primary text-white rounded-full px-1.5 py-0.5">✓</span>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportar}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar ({filteredCompras.length})
          </button>
        </div>

        {/* Panel de filtro de fecha */}
        {mostrarFiltroFecha && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Desde</label>
              <input
                type="date"
                value={filtroFecha.desde}
                onChange={(e) => setFiltroFecha({ ...filtroFecha, desde: e.target.value })}
                className="px-3 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hasta</label>
              <input
                type="date"
                value={filtroFecha.hasta}
                onChange={(e) => setFiltroFecha({ ...filtroFecha, hasta: e.target.value })}
                className="px-3 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => { setFiltroFecha({ desde: '', hasta: '' }); setMostrarFiltroFecha(false); }}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
            >
              Limpiar
            </button>
            <p className="text-sm text-muted-foreground self-center">
              {filteredCompras.length} resultado{filteredCompras.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCompras}
        onDelete={handleDelete}
      />
    </div>
  );
}
