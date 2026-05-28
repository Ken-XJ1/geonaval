import { useState, useEffect, useCallback } from 'react';
import { Plus, Ticket, Calendar, Search, Download, CreditCard, Banknote, ArrowLeftRight, CheckCircle, X, AlertCircle, Loader2, HelpCircle, Shield, Smartphone } from 'lucide-react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

type CompraRow = {
  dbId: number; id: string; ticket: string; fecha: string; fechaISO: string;
  pasajero: string; documento: string; viaje: string; ruta: string;
  asiento: string; precio: string; metodoPago: string;
  estado: 'confirmado' | 'pendiente'; vendedor: string;
};
type ComprasStats = { ventasHoy: number; totalRecaudado: number; ticketsConfirmados: number; ticketsPendientes: number; };
type PasoModal = 'seleccion' | 'tarjeta' | 'transferencia' | 'efectivo' | 'procesando' | 'aprobado' | 'rechazado';

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}
function formatMetodoPago(metodo: string | null | undefined) {
  const map: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
  return metodo ? (map[metodo] ?? metodo) : '—';
}

// ─── Tarjeta Visual ──────────────────────────────────────────────────────────
function TarjetaVisual({ numero, nombre, expiry, cvv, mostrarCvv }: {
  numero: string; nombre: string; expiry: string; cvv: string; mostrarCvv: boolean;
}) {
  const n = numero.replace(/\s/g, '').padEnd(16, '•');
  const grupos = [n.slice(0,4), n.slice(4,8), n.slice(8,12), n.slice(12,16)].join(' ');
  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-xl select-none"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="absolute top-4 right-4 flex gap-1">
        <div className="w-8 h-8 rounded-full bg-red-500 opacity-90" />
        <div className="w-8 h-8 rounded-full bg-yellow-400 opacity-90 -ml-4" />
      </div>
      <div className="absolute top-5 left-5">
        <div className="w-10 h-7 rounded bg-yellow-400/80 flex items-center justify-center">
          <div className="w-6 h-4 rounded-sm border-2 border-yellow-600/50 grid grid-cols-2 gap-0.5 p-0.5">
            <div className="bg-yellow-600/40 rounded-sm" /><div className="bg-yellow-600/40 rounded-sm" />
            <div className="bg-yellow-600/40 rounded-sm" /><div className="bg-yellow-600/40 rounded-sm" />
          </div>
        </div>
      </div>
      {mostrarCvv ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <p className="text-white/60 text-xs mb-2">CVV</p>
          <p className="text-white font-mono text-3xl font-bold tracking-widest">{cvv || '•••'}</p>
          <p className="text-white/40 text-xs mt-2">Código de seguridad</p>
        </div>
      ) : (
        <>
          <div className="absolute bottom-14 left-5 right-5">
            <p className="text-white font-mono text-lg tracking-widest">{grupos}</p>
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
            <div>
              <p className="text-white/50 text-[10px] uppercase">Titular</p>
              <p className="text-white text-sm font-medium truncate max-w-[160px]">{nombre || 'NOMBRE TITULAR'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[10px] uppercase">Vence</p>
              <p className="text-white text-sm font-mono">{expiry || 'MM/AA'}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modal de Pago ───────────────────────────────────────────────────────────
function ModalPago({ precio, pasajero, onConfirmar, onCancelar }: {
  precio: number; pasajero: string; onConfirmar: (metodo: string) => void; onCancelar: () => void;
}) {
  const [paso, setPaso] = useState<PasoModal>('seleccion');
  const [metodoElegido, setMetodoElegido] = useState('');
  const [tarjeta, setTarjeta] = useState({ numero: '', nombre: '', expiry: '', cvv: '' });
  const [mostrarCvv, setMostrarCvv] = useState(false);
  const [referencia, setReferencia] = useState('');
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [txnRef] = useState(`TXN-${Date.now().toString(36).toUpperCase()}`);

  const formatNumero = (v: string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g,'').slice(0,4); return d.length>=3?`${d.slice(0,2)}/${d.slice(2)}`:d; };

  const procesarPago = async () => {
    setErrorPago(null);
    if (paso === 'tarjeta') {
      if (tarjeta.numero.replace(/\s/g,'').length < 16) return setErrorPago('Número de tarjeta inválido. Debe tener 16 dígitos.');
      if (!tarjeta.nombre.trim()) return setErrorPago('Ingresa el nombre del titular como aparece en la tarjeta.');
      if (!tarjeta.expiry.match(/^\d{2}\/\d{2}$/)) return setErrorPago('Fecha de vencimiento inválida. Formato: MM/AA');
      if (tarjeta.cvv.length < 3) return setErrorPago('CVV inválido. Son los 3 dígitos al respaldo de la tarjeta.');
    }
    if (paso === 'transferencia') {
      if (!referencia.trim()) return setErrorPago('Ingresa el número de referencia del comprobante.');
    }
    setPaso('procesando');
    await new Promise(r => setTimeout(r, 2500));
    setPaso(Math.random() > 0.05 ? 'aprobado' : 'rechazado');
  };

  const elegirMetodo = (m: string) => { setMetodoElegido(m); setPaso(m as PasoModal); };

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">

        {/* Header dinámico */}
        <div className={`rounded-t-2xl p-5 text-white sticky top-0 z-10 ${
          paso==='aprobado'?'bg-green-600': paso==='rechazado'?'bg-red-600':
          paso==='procesando'?'bg-blue-600': paso==='tarjeta'?'bg-gradient-to-r from-slate-800 to-slate-600':
          paso==='transferencia'?'bg-gradient-to-r from-purple-700 to-purple-500':
          paso==='efectivo'?'bg-gradient-to-r from-green-700 to-green-500':
          'bg-gradient-to-r from-primary to-blue-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {paso==='aprobado'?<CheckCircle className="w-7 h-7"/>:paso==='rechazado'?<AlertCircle className="w-7 h-7"/>:
               paso==='procesando'?<Loader2 className="w-7 h-7 animate-spin"/>:paso==='tarjeta'?<CreditCard className="w-7 h-7"/>:
               paso==='transferencia'?<ArrowLeftRight className="w-7 h-7"/>:paso==='efectivo'?<Banknote className="w-7 h-7"/>:
               <Shield className="w-7 h-7"/>}
              <div>
                <h3 className="text-lg font-bold">
                  {paso==='seleccion'?'Método de Pago': paso==='tarjeta'?'Pago con Tarjeta':
                   paso==='transferencia'?'Transferencia Bancaria': paso==='efectivo'?'Pago en Efectivo':
                   paso==='procesando'?'Procesando pago...': paso==='aprobado'?'Pago Aprobado':'Pago Rechazado'}
                </h3>
                <p className="text-white/80 text-sm">{formatCOP(precio)} · {pasajero}</p>
              </div>
            </div>
            {(paso==='seleccion'||paso==='tarjeta'||paso==='transferencia'||paso==='efectivo') && (
              <button type="button" onClick={onCancelar} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5"/></button>
            )}
          </div>
          {/* Barra de progreso */}
          <div className="mt-3 flex gap-1">
            {['seleccion','formulario','procesando','aprobado'].map((s,i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                (paso==='seleccion'&&i===0)||(paso==='tarjeta'||paso==='transferencia'||paso==='efectivo')&&i<=1||
                paso==='procesando'&&i<=2||paso==='aprobado'&&i<=3?'bg-white':'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="p-6">

          {/* PASO 1: Selección de método */}
          {paso === 'seleccion' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Selecciona cómo deseas pagar el pasaje</p>
              {[
                { id:'tarjeta', icon:<CreditCard className="w-6 h-6"/>, label:'Tarjeta débito / crédito', desc:'Visa, Mastercard, American Express', color:'blue' },
                { id:'transferencia', icon:<ArrowLeftRight className="w-6 h-6"/>, label:'Transferencia bancaria', desc:'PSE, Nequi, Daviplata, Bancolombia', color:'purple' },
                { id:'efectivo', icon:<Banknote className="w-6 h-6"/>, label:'Efectivo', desc:'Pago presencial en taquilla', color:'green' },
              ].map(m => (
                <button key={m.id} type="button" onClick={() => elegirMetodo(m.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:border-${m.color}-400 hover:bg-${m.color}-50 transition-all text-left group border-border`}>
                  <div className={`p-3 rounded-xl bg-${m.color}-100 text-${m.color}-600 group-hover:scale-110 transition-transform`}>{m.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <div className="text-muted-foreground">›</div>
                </button>
              ))}
              <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0"/>
                <p className="text-xs text-muted-foreground">Pago seguro con cifrado SSL. Tus datos están protegidos.</p>
              </div>
            </div>
          )}

          {/* PASO 2A: Tarjeta */}
          {paso === 'tarjeta' && (
            <div className="space-y-4">
              <TarjetaVisual numero={tarjeta.numero} nombre={tarjeta.nombre} expiry={tarjeta.expiry} cvv={tarjeta.cvv} mostrarCvv={mostrarCvv}/>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Tarjeta de prueba (usa estos datos):</p>
                <p>Número: <span className="font-mono">4111 1111 1111 1111</span></p>
                <p>Nombre: <span className="font-mono">USUARIO PRUEBA</span> · Vence: <span className="font-mono">12/28</span> · CVV: <span className="font-mono">123</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de tarjeta</label>
                <input type="text" value={tarjeta.numero} maxLength={19}
                  onChange={e => setTarjeta({...tarjeta, numero: formatNumero(e.target.value)})}
                  onFocus={() => setMostrarCvv(false)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none font-mono tracking-widest text-lg"
                  placeholder="1234 5678 9012 3456"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del titular</label>
                <input type="text" value={tarjeta.nombre}
                  onChange={e => setTarjeta({...tarjeta, nombre: e.target.value.toUpperCase()})}
                  onFocus={() => setMostrarCvv(false)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none uppercase"
                  placeholder="COMO APARECE EN LA TARJETA"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de vencimiento</label>
                  <input type="text" value={tarjeta.expiry} maxLength={5}
                    onChange={e => setTarjeta({...tarjeta, expiry: formatExpiry(e.target.value)})}
                    onFocus={() => setMostrarCvv(false)}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none font-mono text-center"
                    placeholder="MM/AA"/>
                  <p className="text-xs text-muted-foreground mt-1">Mes y año de vencimiento</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium">CVV</label>
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help"/>
                      <div className="absolute bottom-5 left-0 bg-gray-800 text-white text-xs rounded-lg p-2 w-48 hidden group-hover:block z-10">
                        Los 3 dígitos al respaldo de tu tarjeta (Visa/MC) o 4 dígitos al frente (Amex)
                      </div>
                    </div>
                  </div>
                  <input type="password" value={tarjeta.cvv} maxLength={4}
                    onChange={e => setTarjeta({...tarjeta, cvv: e.target.value.replace(/\D/g,'')})}
                    onFocus={() => setMostrarCvv(true)} onBlur={() => setMostrarCvv(false)}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none font-mono text-center text-lg"
                    placeholder="•••"/>
                  <p className="text-xs text-muted-foreground mt-1">3 dígitos al respaldo</p>
                </div>
              </div>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>{errorPago}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaso('seleccion')} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Volver</button>
                <button type="button" onClick={procesarPago} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4"/> Pagar {formatCOP(precio)}
                </button>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-green-600"/> Pago seguro con cifrado SSL de 256 bits
              </div>
            </div>
          )}

          {/* PASO 2B: Transferencia */}
          {paso === 'transferencia' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <p className="font-bold text-purple-900 mb-3 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4"/> Datos para transferencia</p>
                <div className="space-y-2 text-sm">
                  {[['Banco','Bancolombia'],['Tipo de cuenta','Ahorros'],['Número de cuenta','123-456789-00'],['NIT titular','900.123.456-7'],['Nombre','GeoNaval S.A.S']].map(([k,v]) => (
                    <div key={k} className="flex justify-between items-center py-1 border-b border-purple-100 last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-semibold text-purple-900">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 mt-1">
                    <span className="font-bold text-purple-900">Monto exacto</span>
                    <span className="font-bold text-xl text-purple-700">{formatCOP(precio)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">Instrucciones:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Realiza la transferencia por el monto exacto</li>
                  <li>Guarda el comprobante con el número de referencia</li>
                  <li>Ingresa el número de referencia abajo</li>
                </ol>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{icon:<Smartphone className="w-5 h-5"/>, label:'Nequi'},{icon:<ArrowLeftRight className="w-5 h-5"/>, label:'Daviplata'},{icon:<Shield className="w-5 h-5"/>, label:'PSE'}].map(a => (
                  <div key={a.label} className="flex flex-col items-center gap-1 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
                    {a.icon}<span>{a.label}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de referencia del comprobante</label>
                <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-purple-500 focus:outline-none font-mono"
                  placeholder="Ej: 2026052800123456"/>
                <p className="text-xs text-muted-foreground mt-1">Aparece en el comprobante de tu banco o app</p>
              </div>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>{errorPago}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaso('seleccion')} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Volver</button>
                <button type="button" onClick={procesarPago} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  <ArrowLeftRight className="w-4 h-4"/> Verificar Transferencia
                </button>
              </div>
            </div>
          )}

          {/* PASO 2C: Efectivo */}
          {paso === 'efectivo' && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                <Banknote className="w-14 h-14 text-green-600 mx-auto mb-3"/>
                <p className="text-3xl font-black text-green-700">{formatCOP(precio)}</p>
                <p className="text-sm text-muted-foreground mt-1">Monto a cobrar al pasajero</p>
              </div>
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                {[['Pasajero', pasajero],['Método de pago','Efectivo'],['Estado','Pendiente de cobro']].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1">
                  <span className="font-bold">Total a cobrar</span>
                  <span className="font-black text-green-700 text-lg">{formatCOP(precio)}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                Confirma que recibiste el dinero en efectivo antes de generar el ticket. Esta acción no se puede deshacer.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaso('seleccion')} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Volver</button>
                <button type="button" onClick={procesarPago} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  <Banknote className="w-4 h-4"/> Confirmar Pago Recibido
                </button>
              </div>
            </div>
          )}

          {/* PROCESANDO */}
          {paso === 'procesando' && (
            <div className="text-center py-10 space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"/>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"/>
                <div className="absolute inset-3 rounded-full bg-blue-50 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600"/>
                </div>
              </div>
              <div>
                <p className="font-bold text-lg">Procesando el pago</p>
                <p className="text-sm text-muted-foreground mt-1">Verificando con el banco...</p>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Por favor no cierres esta ventana</p>
            </div>
          )}

          {/* APROBADO */}
          {paso === 'aprobado' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30"/>
                <div className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600"/>
                </div>
              </div>
              <div>
                <p className="font-black text-2xl text-green-700">Pago aprobado</p>
                <p className="text-sm text-muted-foreground mt-1">El ticket ha sido generado para <strong>{pasajero}</strong></p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
                {[
                  ['Monto pagado', formatCOP(precio)],
                  ['Método', formatMetodoPago(metodoElegido)],
                  ['Referencia', txnRef],
                  ['Estado', 'APROBADO'],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={`font-bold ${k==='Estado'?'text-green-600':k==='Referencia'?'font-mono text-xs':''}`}>{v}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => onConfirmar(metodoElegido)}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <Ticket className="w-5 h-5"/> Generar Ticket de Pasaje
              </button>
            </div>
          )}

          {/* RECHAZADO */}
          {paso === 'rechazado' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="w-12 h-12 text-red-600"/>
              </div>
              <div>
                <p className="font-black text-2xl text-red-700">Pago rechazado</p>
                <p className="text-sm text-muted-foreground mt-1">No se pudo procesar el pago. Verifica los datos e intenta de nuevo.</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 text-left space-y-1">
                <p className="font-semibold">Posibles causas:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Fondos insuficientes</li>
                  <li>Datos de tarjeta incorrectos</li>
                  <li>Tarjeta bloqueada o vencida</li>
                  <li>Límite de transacciones excedido</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onCancelar} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="button" onClick={() => { setPaso(metodoElegido as PasoModal); setErrorPago(null); }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">Reintentar</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── ComprasView ─────────────────────────────────────────────────────────────
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
    pasajeroNombre: '', pasajeroDocumento: '', pasajeroTelefono: '',
    viaje: '', asiento: '', precio: '', metodoPago: 'efectivo',
  });
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFecha, setFiltroFecha] = useState({ desde: '', hasta: '' });
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);
  const [stats, setStats] = useState<ComprasStats>({ ventasHoy:0, totalRecaudado:0, ticketsConfirmados:0, ticketsPendientes:0 });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pasajeros, viajes, statsData] = await Promise.all([
        api.getPasajeros() as Promise<Record<string, unknown>[]>,
        api.getViajes() as Promise<Record<string, unknown>[]>,
        api.getComprasStats() as Promise<ComprasStats>,
      ]);
      const viajesProgramados = (viajes as Record<string, unknown>[]).filter(v => v.estado === 'programado');
      setViajesDisponibles(viajesProgramados.map(v => {
        const fechaStr = String(v.fecha_salida ?? '');
        const datePart = fechaStr.split('T')[0].split(' ')[0];
        const timePart = fechaStr.includes('T') ? fechaStr.split('T')[1] : fechaStr.split(' ')[1] ?? '';
        const [y,mo,d] = datePart.split('-'); const [h,mi] = (timePart ?? '').split(':');
        const fechaLabel = d&&mo&&y?`${d}/${mo}/${y}`:datePart;
        const horaLabel = h&&mi?` ${h}:${mi}`:'';
        return { id:String(v.id), label:`V-${v.id}: ${v.origen} → ${v.destino} — ${fechaLabel}${horaLabel}`, asientos:Number(v.cupos_disponibles??(v as any).capacidad_pasajeros??0), precio:Number(v.precio??0) };
      }));
      setStats(statsData);
      setCompras(pasajeros.map(p => {
        const rawFecha = String(p.created_at ?? '');
        const datePart = rawFecha.split('T')[0].split(' ')[0];
        const [y,mo,d] = datePart.split('-');
        return {
          dbId:Number(p.id), id:`C-${String(p.id).padStart(3,'0')}`, ticket:`TKT-${String(p.id).padStart(3,'0')}`,
          fecha:d&&mo&&y?`${d}/${mo}/${y}`:'—', fechaISO:datePart||'',
          pasajero:p.nombre as string, documento:p.documento as string,
          viaje:p.viaje_id?`V-${p.viaje_id}`:'—', ruta:p.origen&&p.destino?`${p.origen} - ${p.destino}`:'—',
          asiento:p.asiento?String(p.asiento):'—', precio:p.precio_pagado!=null?formatCOP(Number(p.precio_pagado)):'—',
          metodoPago:formatMetodoPago(p.metodo_pago as string|null), estado:'confirmado' as const, vendedor:'Sistema',
        };
      }));
    } catch(e) { setError(e instanceof Error?e.message:'Error al cargar'); setCompras([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key:'ticket', label:'Ticket' }, { key:'fecha', label:'Fecha' }, { key:'pasajero', label:'Pasajero' },
    { key:'documento', label:'Documento' }, { key:'ruta', label:'Ruta' }, { key:'asiento', label:'Asiento' },
    { key:'precio', label:'Precio' }, { key:'metodoPago', label:'Método Pago' },
    { key:'estado', label:'Estado', render:(value:any) => <StatusBadge status={value}/> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.viaje) { setError('Debes seleccionar un viaje'); return; }
    if (!formData.pasajeroNombre || !formData.pasajeroDocumento) { setError('Nombre y documento son requeridos'); return; }
    setError(null);
    setShowModalPago(true);
  };

  const handlePagoConfirmado = async (metodo: string) => {
    setShowModalPago(false); setPendingSubmit(true);
    try {
      const viajeSel = viajesDisponibles.find(v => v.id === formData.viaje);
      const created = await api.createPasajero({ nombre:formData.pasajeroNombre, documento:formData.pasajeroDocumento, telefono:formData.pasajeroTelefono, email:null }) as { id:number };
      await api.assignPasajeroViaje(parseInt(formData.viaje,10), created.id, { asiento:formData.asiento||undefined, precio_pagado:parseFloat(formData.precio)||viajeSel?.precio||0, metodo_pago:metodo });
      setFormData({ pasajeroNombre:'', pasajeroDocumento:'', pasajeroTelefono:'', viaje:'', asiento:'', precio:'', metodoPago:'efectivo' });
      setShowForm(false); await load();
    } catch(e) { setError(e instanceof Error?e.message:'Error al guardar'); }
    finally { setPendingSubmit(false); }
  };

  const handleDelete = async (row: CompraRow) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try { await api.deletePasajero(row.dbId); await load(); }
    catch(e) { setError(e instanceof Error?e.message:'Error al eliminar'); }
  };

  const filteredCompras = compras.filter(c => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !(c.ticket.toLowerCase().includes(q)||c.pasajero.toLowerCase().includes(q)||c.documento.toLowerCase().includes(q))) return false;
    if (filtroFecha.desde && c.fechaISO < filtroFecha.desde) return false;
    if (filtroFecha.hasta && c.fechaISO > filtroFecha.hasta) return false;
    return true;
  });

  const handleExportar = () => {
    const enc = ['Ticket','Fecha','Pasajero','Documento','Ruta','Asiento','Precio','Método Pago','Estado'];
    const filas = filteredCompras.map(c => [c.ticket,c.fecha,c.pasajero,c.documento,c.ruta,c.asiento,c.precio,c.metodoPago,c.estado]);
    const csv = [enc,...filas].map(f=>f.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `compras_geonaval_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (loading) return <ViewFeedback loading/>;
  if (error && compras.length === 0) return <ViewFeedback error={error}/>;

  return (
    <div className="space-y-6">
      {error ? <ViewFeedback error={error}/> : null}

      {showModalPago && (
        <ModalPago
          precio={parseFloat(formData.precio)||viajesDisponibles.find(v=>v.id===formData.viaje)?.precio||0}
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
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-5 h-5"/> Nueva Compra
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Ticket className="w-5 h-5 text-primary"/> Registrar Nueva Compra</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><h4 className="font-medium text-sm mb-3 text-primary">Datos del Pasajero</h4></div>
            <div>
              <label className="block text-sm font-medium mb-2">Nombre Completo</label>
              <input type="text" value={formData.pasajeroNombre} onChange={e=>setFormData({...formData,pasajeroNombre:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none" placeholder="Nombre del pasajero" required/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Documento de Identidad</label>
              <input type="text" value={formData.pasajeroDocumento} onChange={e=>setFormData({...formData,pasajeroDocumento:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none" placeholder="Número de documento" required/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input type="tel" value={formData.pasajeroTelefono} onChange={e=>setFormData({...formData,pasajeroTelefono:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none" placeholder="+57 300 1234567"/>
            </div>
            <div className="md:col-span-2"><h4 className="font-medium text-sm mb-3 text-primary mt-2">Asignar al Viaje</h4></div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Viaje Disponible</label>
              <select value={formData.viaje} onChange={e=>{const id=e.target.value;const sel=viajesDisponibles.find(v=>v.id===id);setFormData({...formData,viaje:id,precio:sel?String(sel.precio):''});}}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none" required>
                <option value="">— Seleccionar viaje —</option>
                {viajesDisponibles.length===0&&<option disabled>No hay viajes programados disponibles</option>}
                {viajesDisponibles.map(v=><option key={v.id} value={v.id}>{v.label} ({v.asientos} cupos) — {formatCOP(v.precio)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Asiento <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <input type="text" value={formData.asiento} onChange={e=>setFormData({...formData,asiento:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none" placeholder="Ej: A-15"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Precio (COP)</label>
              <input type="number" value={formData.precio} onChange={e=>setFormData({...formData,precio:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none" placeholder="Se autocompleta al seleccionar viaje" required/>
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
              <button type="submit" disabled={pendingSubmit}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60">
                <Ticket className="w-4 h-4"/> {pendingSubmit?'Registrando...':'Continuar al Pago'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p><p className="text-2xl font-bold text-primary">{stats.ventasHoy}</p></div>
        <div className="bg-white rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground mb-1">Total Recaudado</p><p className="text-2xl font-bold text-green-600">{formatCOP(stats.totalRecaudado)}</p></div>
        <div className="bg-white rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground mb-1">Tickets Confirmados</p><p className="text-2xl font-bold text-blue-600">{stats.ticketsConfirmados}</p></div>
        <div className="bg-white rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground mb-1">Tickets Pendientes</p><p className="text-2xl font-bold text-yellow-600">{stats.ticketsPendientes}</p></div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              placeholder="Buscar por ticket, pasajero o documento..."
              className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"/>
          </div>
          <button type="button" onClick={()=>setMostrarFiltroFecha(!mostrarFiltroFecha)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${filtroFecha.desde||filtroFecha.hasta?'border-primary bg-primary/5 text-primary':'border-border hover:bg-muted'}`}>
            <Calendar className="w-4 h-4"/> Filtrar por Fecha
          </button>
          <button type="button" onClick={handleExportar}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4"/> Exportar ({filteredCompras.length})
          </button>
        </div>
        {mostrarFiltroFecha && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-end">
            <div><label className="block text-sm font-medium mb-1">Desde</label>
              <input type="date" value={filtroFecha.desde} onChange={e=>setFiltroFecha({...filtroFecha,desde:e.target.value})}
                className="px-3 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-sm"/></div>
            <div><label className="block text-sm font-medium mb-1">Hasta</label>
              <input type="date" value={filtroFecha.hasta} onChange={e=>setFiltroFecha({...filtroFecha,hasta:e.target.value})}
                className="px-3 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-sm"/></div>
            <button type="button" onClick={()=>{setFiltroFecha({desde:'',hasta:''});setMostrarFiltroFecha(false);}}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm">Limpiar</button>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={filteredCompras} onDelete={handleDelete}/>
    </div>
  );
}
