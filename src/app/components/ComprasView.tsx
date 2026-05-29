import { useState, useEffect, useCallback } from 'react';
import { Plus, Ticket, Calendar, Search, Download, CreditCard, Banknote,
  ArrowLeftRight, CheckCircle, X, AlertCircle, Loader2, HelpCircle,
  Shield, Smartphone, User, Navigation, ChevronRight, Filter } from 'lucide-react';
import { DataTable } from './DataTable';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';
import jsPDF from 'jspdf';

type CompraRow = {
  dbId: number; id: string; ticket: string; fecha: string; fechaISO: string;
  pasajero: string; documento: string; viaje: string; ruta: string;
  asiento: string; precio: string; metodoPago: string; vendedor: string;
};
type ComprasStats = {
  ventasHoy: number; totalRecaudado: number; totalTickets: number;
};
type PasoPago = 'seleccion' | 'tarjeta' | 'transferencia' | 'efectivo' | 'procesando' | 'aprobado' | 'rechazado';
type PasoWizard = 1 | 2 | 3;

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}
function formatMetodoPago(m: string | null | undefined) {
  const map: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
  return m ? (map[m] ?? m) : '—';
}

// ─── Tarjeta Visual ──────────────────────────────────────────────────────────
function TarjetaVisual({ numero, nombre, expiry, cvv, mostrarCvv }: {
  numero: string; nombre: string; expiry: string; cvv: string; mostrarCvv: boolean;
}) {
  const n = numero.replace(/\s/g, '').padEnd(16, '•');
  const grupos = [n.slice(0,4), n.slice(4,8), n.slice(8,12), n.slice(12,16)].join(' ');
  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-xl select-none"
      style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)' }}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%,white 1px,transparent 1px),radial-gradient(circle at 80% 20%,white 1px,transparent 1px)', backgroundSize: '30px 30px' }}/>
      <div className="absolute top-4 right-4 flex gap-1">
        <div className="w-8 h-8 rounded-full bg-red-500 opacity-90"/>
        <div className="w-8 h-8 rounded-full bg-yellow-400 opacity-90 -ml-4"/>
      </div>
      <div className="absolute top-5 left-5">
        <div className="w-10 h-7 rounded bg-yellow-400/80 flex items-center justify-center">
          <div className="w-6 h-4 rounded-sm border-2 border-yellow-600/50 grid grid-cols-2 gap-0.5 p-0.5">
            <div className="bg-yellow-600/40 rounded-sm"/><div className="bg-yellow-600/40 rounded-sm"/>
            <div className="bg-yellow-600/40 rounded-sm"/><div className="bg-yellow-600/40 rounded-sm"/>
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

// ─── Modal de Pago (Paso 3) ──────────────────────────────────────────────────
function ModalPago({ precio, pasajero, onConfirmar, onCancelar }: {
  precio: number; pasajero: string;
  onConfirmar: (metodo: string) => void; onCancelar: () => void;
}) {
  const [paso, setPaso] = useState<PasoPago>('seleccion');
  const [metodoElegido, setMetodoElegido] = useState('');
  const [tarjeta, setTarjeta] = useState({ numero: '', nombre: '', expiry: '', cvv: '' });
  const [mostrarCvv, setMostrarCvv] = useState(false);
  const [referencia, setReferencia] = useState('');
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [txnRef] = useState(`TXN-${Date.now().toString(36).toUpperCase()}`);

  const formatNumero = (v: string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = (v: string) => { const d=v.replace(/\D/g,'').slice(0,4); return d.length>=3?`${d.slice(0,2)}/${d.slice(2)}`:d; };

  const procesarPago = async () => {
    setErrorPago(null);
    if (paso==='tarjeta') {
      if (tarjeta.numero.replace(/\s/g,'').length<16) return setErrorPago('Número de tarjeta inválido. Debe tener 16 dígitos.');
      if (!tarjeta.nombre.trim()) return setErrorPago('Ingresa el nombre del titular como aparece en la tarjeta.');
      if (!tarjeta.expiry.match(/^\d{2}\/\d{2}$/)) return setErrorPago('Fecha de vencimiento inválida. Formato: MM/AA');
      if (tarjeta.cvv.length<3) return setErrorPago('CVV inválido. Son los 3 dígitos al respaldo de la tarjeta.');
    }
    if (paso==='transferencia' && !referencia.trim()) return setErrorPago('Ingresa el número de referencia del comprobante.');
    setPaso('procesando');
    await new Promise(r => setTimeout(r, 2500));
    setPaso(Math.random()>0.05?'aprobado':'rechazado');
  };

  const elegirMetodo = (m: string) => { setMetodoElegido(m); setPaso(m as PasoPago); };

  const headerColor = paso==='aprobado'?'bg-green-600':paso==='rechazado'?'bg-red-600':
    paso==='procesando'?'bg-blue-600':paso==='tarjeta'?'bg-gradient-to-r from-slate-800 to-slate-600':
    paso==='transferencia'?'bg-gradient-to-r from-purple-700 to-purple-500':
    paso==='efectivo'?'bg-gradient-to-r from-green-700 to-green-500':
    'bg-gradient-to-r from-primary to-blue-600';

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className={`rounded-t-2xl p-5 text-white sticky top-0 z-10 ${headerColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {paso==='aprobado'?<CheckCircle className="w-7 h-7"/>:paso==='rechazado'?<AlertCircle className="w-7 h-7"/>:
               paso==='procesando'?<Loader2 className="w-7 h-7 animate-spin"/>:paso==='tarjeta'?<CreditCard className="w-7 h-7"/>:
               paso==='transferencia'?<ArrowLeftRight className="w-7 h-7"/>:paso==='efectivo'?<Banknote className="w-7 h-7"/>:
               <Shield className="w-7 h-7"/>}
              <div>
                <h3 className="text-lg font-bold">
                  {paso==='seleccion'?'Método de Pago':paso==='tarjeta'?'Pago con Tarjeta':
                   paso==='transferencia'?'Transferencia Bancaria':paso==='efectivo'?'Pago en Efectivo':
                   paso==='procesando'?'Procesando pago...':paso==='aprobado'?'Pago Aprobado':'Pago Rechazado'}
                </h3>
                <p className="text-white/80 text-sm">{formatCOP(precio)} · {pasajero}</p>
              </div>
            </div>
            {(paso==='seleccion'||paso==='tarjeta'||paso==='transferencia'||paso==='efectivo') && (
              <button type="button" onClick={onCancelar} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5"/></button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Selección método */}
          {paso==='seleccion' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Selecciona cómo deseas pagar el pasaje</p>
              {[
                {id:'tarjeta',icon:<CreditCard className="w-6 h-6"/>,label:'Tarjeta débito / crédito',desc:'Visa, Mastercard, American Express',color:'blue'},
                {id:'transferencia',icon:<ArrowLeftRight className="w-6 h-6"/>,label:'Transferencia bancaria',desc:'PSE, Nequi, Daviplata, Bancolombia',color:'purple'},
                {id:'efectivo',icon:<Banknote className="w-6 h-6"/>,label:'Efectivo',desc:'Pago presencial en taquilla',color:'green'},
              ].map(m => (
                <button key={m.id} type="button" onClick={()=>elegirMetodo(m.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group">
                  <div className={`p-3 rounded-xl bg-${m.color}-100 text-${m.color}-600 group-hover:scale-110 transition-transform`}>{m.icon}</div>
                  <div className="flex-1"><p className="font-semibold">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground"/>
                </button>
              ))}
              <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0"/>
                <p className="text-xs text-muted-foreground">Pago seguro con cifrado SSL. Tus datos están protegidos.</p>
              </div>
            </div>
          )}

          {/* Tarjeta */}
          {paso==='tarjeta' && (
            <div className="space-y-4">
              <TarjetaVisual numero={tarjeta.numero} nombre={tarjeta.nombre} expiry={tarjeta.expiry} cvv={tarjeta.cvv} mostrarCvv={mostrarCvv}/>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Tarjeta de prueba:</p>
                <p>Número: <span className="font-mono">4111 1111 1111 1111</span></p>
                <p>Nombre: <span className="font-mono">USUARIO PRUEBA</span> · Vence: <span className="font-mono">12/28</span> · CVV: <span className="font-mono">123</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de tarjeta</label>
                <input type="text" value={tarjeta.numero} maxLength={19}
                  onChange={e=>setTarjeta({...tarjeta,numero:formatNumero(e.target.value)})}
                  onFocus={()=>setMostrarCvv(false)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none font-mono tracking-widest text-lg"
                  placeholder="1234 5678 9012 3456"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del titular</label>
                <input type="text" value={tarjeta.nombre}
                  onChange={e=>setTarjeta({...tarjeta,nombre:e.target.value.toUpperCase()})}
                  onFocus={()=>setMostrarCvv(false)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none uppercase"
                  placeholder="COMO APARECE EN LA TARJETA"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Vencimiento</label>
                  <input type="text" value={tarjeta.expiry} maxLength={5}
                    onChange={e=>setTarjeta({...tarjeta,expiry:formatExpiry(e.target.value)})}
                    onFocus={()=>setMostrarCvv(false)}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none font-mono text-center"
                    placeholder="MM/AA"/>
                  <p className="text-xs text-muted-foreground mt-1">Mes/Año de vencimiento</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium">CVV</label>
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help"/>
                      <div className="absolute bottom-5 left-0 bg-gray-800 text-white text-xs rounded-lg p-2 w-48 hidden group-hover:block z-10">
                        Los 3 dígitos al respaldo de tu tarjeta (Visa/MC) o 4 al frente (Amex)
                      </div>
                    </div>
                  </div>
                  <input type="password" value={tarjeta.cvv} maxLength={4}
                    onChange={e=>setTarjeta({...tarjeta,cvv:e.target.value.replace(/\D/g,'')})}
                    onFocus={()=>setMostrarCvv(true)} onBlur={()=>setMostrarCvv(false)}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-blue-500 focus:outline-none font-mono text-center text-lg"
                    placeholder="•••"/>
                  <p className="text-xs text-muted-foreground mt-1">3 dígitos al respaldo</p>
                </div>
              </div>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>{errorPago}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={()=>setPaso('seleccion')} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Volver</button>
                <button type="button" onClick={procesarPago} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4"/> Pagar {formatCOP(precio)}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-green-600"/> Pago seguro con cifrado SSL de 256 bits
              </div>
            </div>
          )}

          {/* Transferencia */}
          {paso==='transferencia' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <p className="font-bold text-purple-900 mb-3 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4"/> Datos para transferencia</p>
                <div className="space-y-2 text-sm">
                  {[['Banco','Bancolombia'],['Tipo de cuenta','Ahorros'],['Número','123-456789-00'],['NIT','900.123.456-7'],['Titular','GeoNaval S.A.S']].map(([k,v])=>(
                    <div key={k} className="flex justify-between py-1 border-b border-purple-100 last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-semibold text-purple-900">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2">
                    <span className="font-bold text-purple-900">Monto exacto</span>
                    <span className="font-bold text-xl text-purple-700">{formatCOP(precio)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{icon:<Smartphone className="w-5 h-5"/>,label:'Nequi'},{icon:<ArrowLeftRight className="w-5 h-5"/>,label:'Daviplata'},{icon:<Shield className="w-5 h-5"/>,label:'PSE'}].map(a=>(
                  <div key={a.label} className="flex flex-col items-center gap-1 p-3 bg-muted rounded-xl text-xs text-muted-foreground">{a.icon}<span>{a.label}</span></div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número de referencia del comprobante</label>
                <input type="text" value={referencia} onChange={e=>setReferencia(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-purple-500 focus:outline-none font-mono"
                  placeholder="Ej: 2026052800123456"/>
                <p className="text-xs text-muted-foreground mt-1">Aparece en el comprobante de tu banco o app</p>
              </div>
              {errorPago && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>{errorPago}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={()=>setPaso('seleccion')} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Volver</button>
                <button type="button" onClick={procesarPago} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  <ArrowLeftRight className="w-4 h-4"/> Verificar Transferencia
                </button>
              </div>
            </div>
          )}

          {/* Efectivo */}
          {paso==='efectivo' && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                <Banknote className="w-14 h-14 text-green-600 mx-auto mb-3"/>
                <p className="text-3xl font-black text-green-700">{formatCOP(precio)}</p>
                <p className="text-sm text-muted-foreground mt-1">Monto a cobrar al pasajero</p>
              </div>
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                {[['Pasajero',pasajero],['Método','Efectivo'],['Estado','Pendiente de cobro']].map(([k,v])=>(
                  <div key={k} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1">
                  <span className="font-bold">Total</span>
                  <span className="font-black text-green-700 text-lg">{formatCOP(precio)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center bg-amber-50 border border-amber-200 rounded-lg p-3">
                Confirma que recibiste el dinero en efectivo antes de generar el ticket.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={()=>setPaso('seleccion')} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Volver</button>
                <button type="button" onClick={procesarPago} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                  <Banknote className="w-4 h-4"/> Confirmar Pago Recibido
                </button>
              </div>
            </div>
          )}

          {/* Procesando */}
          {paso==='procesando' && (
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
              <div className="flex justify-center gap-1">
                {[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </div>
              <p className="text-xs text-muted-foreground">Por favor no cierres esta ventana</p>
            </div>
          )}

          {/* Aprobado */}
          {paso==='aprobado' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30"/>
                <div className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600"/>
                </div>
              </div>
              <div>
                <p className="font-black text-2xl text-green-700">Pago aprobado</p>
                <p className="text-sm text-muted-foreground mt-1">Ticket generado para <strong>{pasajero}</strong></p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
                {[['Monto pagado',formatCOP(precio)],['Método',formatMetodoPago(metodoElegido)],['Referencia',txnRef],['Estado','APROBADO']].map(([k,v])=>(
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={`font-bold ${k==='Estado'?'text-green-600':k==='Referencia'?'font-mono text-xs':''}`}>{v}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={()=>onConfirmar(metodoElegido)}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <Ticket className="w-5 h-5"/> Generar Ticket de Pasaje
              </button>
            </div>
          )}

          {/* Rechazado */}
          {paso==='rechazado' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="w-12 h-12 text-red-600"/>
              </div>
              <div>
                <p className="font-black text-2xl text-red-700">Pago rechazado</p>
                <p className="text-sm text-muted-foreground mt-1">No se pudo procesar el pago.</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 text-left">
                <p className="font-semibold mb-2">Posibles causas:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Fondos insuficientes</li><li>Datos de tarjeta incorrectos</li>
                  <li>Tarjeta bloqueada o vencida</li><li>Límite de transacciones excedido</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onCancelar} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="button" onClick={()=>{setPaso(metodoElegido as PasoPago);setErrorPago(null);}}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">Reintentar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Wizard de Compra ────────────────────────────────────────────────────────
function WizardCompra({ viajesDisponibles, onFinalizar, onCancelar }: {
  viajesDisponibles: { id: string; label: string; asientos: number; precio: number; origen: string; destino: string; fecha: string; inscripcionCerrada?: boolean; mensajeCierre?: string }[];
  onFinalizar: (datos: { nombre: string; documento: string; telefono: string; viajeId: string; asiento: string; precio: number; metodo: string }) => void;
  onCancelar: () => void;
}) {
  const [paso, setPaso] = useState<PasoWizard>(1);
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [viajeId, setViajeId] = useState('');
  const [asiento, setAsiento] = useState('');
  const [asientosOcupados, setAsientosOcupados] = useState<string[]>([]);
  const [filtroRuta, setFiltroRuta] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [showPago, setShowPago] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const viajeSeleccionado = viajesDisponibles.find(v => v.id === viajeId);

  // Cargar asientos ocupados cuando se selecciona un viaje
  useEffect(() => {
    if (viajeId) {
      console.log('🔍 Cargando asientos ocupados para viaje:', viajeId);
      api.getViajePasajeros(parseInt(viajeId))
        .then((pasajeros: any[]) => {
          const ocupados = pasajeros
            .map((p: any) => p.asiento)
            .filter((a: string) => a && a.trim());
          console.log('🔍 Asientos ocupados:', ocupados);
          setAsientosOcupados(ocupados);
        })
        .catch(err => {
          console.error('Error cargando asientos:', err);
          setAsientosOcupados([]);
        });
    } else {
      setAsientosOcupados([]);
    }
  }, [viajeId]);

  const viajesFiltrados = viajesDisponibles.filter(v => {
    const q = filtroRuta.toLowerCase();
    const pasaRuta = !q || v.origen.toLowerCase().includes(q) || v.destino.toLowerCase().includes(q) || v.label.toLowerCase().includes(q);
    
    // Convertir la fecha del viaje a formato YYYY-MM-DD para comparar
    let pasaFecha = true;
    if (filtroFecha) {
      try {
        // v.fecha está en formato "DD/MM/YYYY, HH:mm"
        const partes = v.fecha.split(',')[0].split('/'); // Obtener solo la parte de fecha
        if (partes.length === 3) {
          const fechaViaje = `${partes[2]}-${partes[1]}-${partes[0]}`; // Convertir a YYYY-MM-DD
          pasaFecha = fechaViaje === filtroFecha;
        }
      } catch (e) {
        console.error('Error comparando fechas:', e);
      }
    }
    
    return pasaRuta && pasaFecha;
  });

  const validarPaso1 = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'El nombre es requerido';
    if (!documento.trim()) e.documento = 'El documento es requerido';
    if (documento.trim().length < 5) e.documento = 'Documento inválido';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPaso2 = () => {
    if (!viajeId) { setErrores({ viaje: 'Debes seleccionar un viaje' }); return false; }
    setErrores({});
    return true;
  };

  const pasos = [
    { num: 1, label: 'Datos personales', icon: <User className="w-4 h-4"/> },
    { num: 2, label: 'Seleccionar viaje', icon: <Navigation className="w-4 h-4"/> },
    { num: 3, label: 'Método de pago', icon: <CreditCard className="w-4 h-4"/> },
  ];

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header del wizard */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Ticket className="w-5 h-5"/> Nueva Compra de Pasaje</h3>
          <button type="button" onClick={onCancelar} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
        </div>
        {/* Indicador de pasos */}
        <div className="flex items-center gap-2">
          {pasos.map((p, i) => (
            <div key={p.num} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                paso === p.num ? 'bg-white text-primary' :
                paso > p.num ? 'bg-white/30 text-white' : 'bg-white/10 text-white/60'
              }`}>
                {paso > p.num ? <CheckCircle className="w-3.5 h-3.5"/> : p.icon}
                <span className="hidden sm:inline">{p.label}</span>
                <span className="sm:hidden">{p.num}</span>
              </div>
              {i < pasos.length - 1 && <div className={`flex-1 h-0.5 ${paso > p.num ? 'bg-white/60' : 'bg-white/20'}`}/>}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* PASO 1: Datos personales */}
        {paso === 1 && (
          <div className="space-y-5">
            <div>
              <h4 className="font-semibold text-base mb-1">Datos del pasajero</h4>
              <p className="text-sm text-muted-foreground">Ingresa los datos de la persona que va a viajar</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre completo <span className="text-red-500">*</span></label>
                <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-muted rounded-lg border focus:outline-none transition-colors ${errores.nombre?'border-red-400 focus:border-red-500':'border-border focus:border-primary'}`}
                  placeholder="Ej: Juan Carlos Pérez"/>
                {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Número de documento <span className="text-red-500">*</span></label>
                <input type="text" value={documento} onChange={e=>setDocumento(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-muted rounded-lg border focus:outline-none transition-colors ${errores.documento?'border-red-400 focus:border-red-500':'border-border focus:border-primary'}`}
                  placeholder="Cédula de ciudadanía"/>
                {errores.documento && <p className="text-xs text-red-600 mt-1">{errores.documento}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Teléfono de contacto</label>
                <input type="tel" value={telefono} onChange={e=>setTelefono(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
                  placeholder="+57 300 1234567"/>
                <p className="text-xs text-muted-foreground mt-1">Opcional — para notificaciones del viaje</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={()=>{ if(validarPaso1()) setPaso(2); }}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Siguiente: Seleccionar viaje <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Seleccionar viaje */}
        {paso === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-base mb-1">Selecciona el viaje</h4>
              <p className="text-sm text-muted-foreground">Elige el viaje al que se inscribirá <strong>{nombre}</strong></p>
            </div>

            {/* Filtros */}
            <div className="flex gap-3 p-3 bg-muted rounded-lg">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <input type="text" value={filtroRuta} onChange={e=>setFiltroRuta(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
                  placeholder="Buscar por ruta..."/>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <input type="date" value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-white rounded-lg border border-border focus:border-primary focus:outline-none text-sm"/>
              </div>
              {(filtroRuta||filtroFecha) && (
                <button type="button" onClick={()=>{setFiltroRuta('');setFiltroFecha('');}}
                  className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg bg-white">
                  Limpiar
                </button>
              )}
            </div>

            {/* Lista de viajes */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {viajesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Navigation className="w-8 h-8 mx-auto mb-2 opacity-40"/>
                  <p className="text-sm">No hay viajes disponibles con ese filtro</p>
                </div>
              ) : viajesFiltrados.map(v => {
                const puedeInscribirse = !v.inscripcionCerrada;
                return (
                  <button key={v.id} type="button" 
                    onClick={()=>{ if(puedeInscribirse) { setViajeId(v.id); setErrores({}); } }}
                    disabled={!puedeInscribirse}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      !puedeInscribirse ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
                      viajeId===v.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-primary text-sm">V-{v.id}</span>
                          <span className="font-semibold">{v.origen} → {v.destino}</span>
                          {!puedeInscribirse && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                              {v.mensajeCierre}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {v.fecha}</span>
                          {puedeInscribirse ? (
                            <span className={`font-medium ${v.asientos > 5 ? 'text-green-600' : v.asientos > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                              {v.asientos} cupos disponibles
                            </span>
                          ) : (
                            <span className="font-medium text-red-600">
                              No disponible
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className={`font-bold ${puedeInscribirse ? 'text-green-700' : 'text-gray-400'}`}>{formatCOP(v.precio)}</p>
                        {viajeId===v.id && puedeInscribirse && <CheckCircle className="w-5 h-5 text-primary ml-auto mt-1"/>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {errores.viaje && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errores.viaje}</p>}

            {/* Selector de asientos */}
            {viajeId && (
              <div>
                <label className="block text-sm font-medium mb-2">Selecciona tu asiento</label>
                <div className="bg-muted rounded-xl p-4">
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {['A', 'B', 'C', 'D'].map(fila => (
                      <div key={fila} className="space-y-2">
                        {[1, 2, 3, 4, 5].map(num => {
                          const asientoId = `${fila}-${String(num).padStart(2, '0')}`;
                          const ocupado = asientosOcupados.includes(asientoId);
                          const seleccionado = asiento === asientoId;
                          return (
                            <button
                              key={asientoId}
                              type="button"
                              disabled={ocupado}
                              onClick={() => !ocupado && setAsiento(seleccionado ? '' : asientoId)}
                              className={`w-full py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                                ocupado
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50 relative'
                                  : seleccionado
                                  ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 shadow-lg scale-105'
                                  : 'bg-white border-2 border-border hover:border-primary hover:bg-primary/5 hover:scale-105'
                              }`}
                              title={ocupado ? 'Asiento no disponible - Ya está ocupado' : seleccionado ? 'Clic para deseleccionar' : 'Clic para seleccionar'}
                            >
                              {ocupado && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </span>
                              )}
                              <span className={ocupado ? 'opacity-30' : ''}>{asientoId}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-white border-2 border-border"/>
                      <span className="text-muted-foreground font-medium">Disponible</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-primary shadow"/>
                      <span className="text-muted-foreground font-medium">Seleccionado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-gray-300 opacity-50 relative">
                        <svg className="w-3 h-3 text-gray-600 absolute inset-0 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <span className="text-muted-foreground font-medium">No disponible</span>
                    </div>
                  </div>
                  {asiento && (
                    <p className="text-center mt-3 text-sm font-medium text-primary bg-primary/10 py-2 rounded-lg">
                      ✓ Asiento seleccionado: <span className="font-bold">{asiento}</span>
                    </p>
                  )}
                  {!asiento && (
                    <p className="text-center mt-3 text-xs text-muted-foreground">
                      Selecciona un asiento disponible o deja vacío para asignación automática
                    </p>
                  )}
                  {asientosOcupados.length > 0 && (
                    <p className="text-center mt-2 text-xs text-red-600 bg-red-50 py-1.5 rounded">
                      {asientosOcupados.length} asiento{asientosOcupados.length > 1 ? 's' : ''} ocupado{asientosOcupados.length > 1 ? 's' : ''} en este viaje
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button type="button" onClick={()=>setPaso(1)} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
                Volver
              </button>
              <button type="button" onClick={()=>{ if(validarPaso2()) setPaso(3); }}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Siguiente: Pagar <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Resumen + Pago */}
        {paso === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-base mb-1">Resumen de la compra</h4>
              <p className="text-sm text-muted-foreground">Verifica los datos antes de pagar</p>
            </div>
            <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Pasajero</span><span className="font-semibold">{nombre}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Documento</span><span className="font-mono">{documento}</span></div>
              {telefono && <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span>{telefono}</span></div>}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Viaje</span><span className="font-semibold text-primary">V-{viajeSeleccionado?.id}</span></div>
                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Ruta</span><span>{viajeSeleccionado?.origen} → {viajeSeleccionado?.destino}</span></div>
                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Fecha</span><span>{viajeSeleccionado?.fecha}</span></div>
                {asiento && <div className="flex justify-between mt-1"><span className="text-muted-foreground">Asiento</span><span>{asiento}</span></div>}
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="font-bold text-base">Total a pagar</span>
                <span className="font-black text-xl text-green-700">{formatCOP(viajeSeleccionado?.precio ?? 0)}</span>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={()=>setPaso(2)} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
                Volver
              </button>
              <button type="button" onClick={()=>setShowPago(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold">
                <CreditCard className="w-4 h-4"/> Proceder al Pago
              </button>
            </div>
          </div>
        )}
      </div>

      {showPago && (
        <ModalPago
          precio={viajeSeleccionado?.precio ?? 0}
          pasajero={nombre}
          onConfirmar={(metodo) => {
            setShowPago(false);
            onFinalizar({ nombre, documento, telefono, viajeId, asiento, precio: viajeSeleccionado?.precio ?? 0, metodo });
          }}
          onCancelar={() => setShowPago(false)}
        />
      )}
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export function ComprasView() {
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [stats, setStats] = useState<ComprasStats>({ ventasHoy: 0, totalRecaudado: 0, totalTickets: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [viajesDisponibles, setViajesDisponibles] = useState<{ id: string; label: string; asientos: number; precio: number; origen: string; destino: string; fecha: string; inscripcionCerrada?: boolean; mensajeCierre?: string }[]>([]);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pasajerosRes, viajesRes] = await Promise.all([
        api.getPasajeros(),
        api.getViajes()
      ]);
      
      console.log('🔍 DEBUG - Viajes recibidos del backend:', viajesRes);
      console.log('🔍 DEBUG - Total de viajes:', viajesRes?.length || 0);
      console.log('🔍 DEBUG - Pasajeros recibidos:', pasajerosRes);
      
      // Mapear pasajeros a compras
      const pasajeros = pasajerosRes || [];
      const viajes = viajesRes || [];
      
      const comprasData: CompraRow[] = pasajeros
        .filter((p: any) => p.viaje_id) // Solo pasajeros con viaje asignado
        .map((p: any) => {
          const fecha = p.fecha_compra ? new Date(p.fecha_compra) : (p.created_at ? new Date(p.created_at) : new Date());
          return {
            dbId: p.id,
            id: `T-${String(p.id).padStart(5, '0')}`,
            ticket: `TICKET-${String(p.id).padStart(6, '0')}`,
            fecha: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            fechaISO: fecha.toISOString(),
            pasajero: p.nombre || '—',
            documento: p.documento || '—',
            viaje: p.viaje_id ? `V-${p.viaje_id}` : '—',
            ruta: (p.origen && p.destino) ? `${p.origen} → ${p.destino}` : '—',
            asiento: p.asiento || 'Auto',
            precio: formatCOP(p.precio_pagado || 0),
            metodoPago: formatMetodoPago(p.metodo_pago),
            vendedor: 'Admin',
          };
        });

      // Calcular stats
      const hoy = new Date().toDateString();
      const ventasHoy = comprasData.filter(c => new Date(c.fechaISO).toDateString() === hoy).length;
      const totalRecaudado = comprasData.reduce((sum, c) => {
        const precio = parseFloat(c.precio.replace(/[^0-9,-]/g, '').replace(',', '.'));
        return sum + (isNaN(precio) ? 0 : precio);
      }, 0);
      const totalTickets = comprasData.length;

      setCompras(comprasData);
      setStats({ ventasHoy, totalRecaudado, totalTickets });

      // Preparar viajes disponibles (TODOS los viajes)
      console.log('🔍 DEBUG - Procesando viajes para wizard...');
      const ahora = new Date();
      const viajesDisp = viajes.map((v: any) => {
        console.log('🔍 DEBUG - Procesando viaje:', v.id, v.origen, v.destino, 'Estado:', v.estado);
        
        const totalPasajeros = pasajeros.filter((p: any) => p.viaje_id === v.id).length;
        // La capacidad viene de la embarcación, si no existe usar 20
        const capacidad = v.capacidad_pasajeros || v.capacidad || 20;
        const asientosDisponibles = Math.max(0, capacidad - totalPasajeros);
        
        let fechaSalida;
        try {
          fechaSalida = v.fecha_salida ? new Date(v.fecha_salida) : new Date();
        } catch (e) {
          console.error('Error parseando fecha_salida:', v.fecha_salida);
          fechaSalida = new Date();
        }
        
        // Verificar si la inscripción está cerrada
        let inscripcionCerrada = false;
        let mensajeCierre = '';
        
        // Si el viaje está finalizado o cancelado, no se puede inscribir
        if (v.estado === 'finalizado') {
          inscripcionCerrada = true;
          mensajeCierre = 'Viaje finalizado';
        } else if (v.estado === 'cancelado') {
          inscripcionCerrada = true;
          mensajeCierre = 'Viaje cancelado';
        } else if (asientosDisponibles <= 0) {
          inscripcionCerrada = true;
          mensajeCierre = 'Sin cupos disponibles';
        } else if (v.fecha_limite_inscripcion) {
          try {
            const fechaLimite = new Date(v.fecha_limite_inscripcion);
            if (ahora > fechaLimite) {
              inscripcionCerrada = true;
              mensajeCierre = 'Inscripción cerrada';
            }
          } catch (e) {
            console.error('Error parseando fecha_limite_inscripcion:', v.fecha_limite_inscripcion);
          }
        } else if (v.cierre_inscripcion) {
          try {
            const fechaCierre = new Date(v.cierre_inscripcion);
            if (ahora > fechaCierre) {
              inscripcionCerrada = true;
              mensajeCierre = 'Inscripción cerrada';
            }
          } catch (e) {
            console.error('Error parseando cierre_inscripcion:', v.cierre_inscripcion);
          }
        }
        
        const viajeFormateado = {
          id: String(v.id),
          label: `${v.origen || 'Origen'} → ${v.destino || 'Destino'}`,
          asientos: asientosDisponibles,
          precio: v.precio || 0,
          origen: v.origen || 'Origen',
          destino: v.destino || 'Destino',
          fecha: fechaSalida.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          inscripcionCerrada,
          mensajeCierre,
        };
        
        console.log('🔍 DEBUG - Viaje formateado:', viajeFormateado);
        return viajeFormateado;
      });

      console.log('🔍 DEBUG - Total viajes para wizard:', viajesDisp.length);
      console.log('🔍 DEBUG - Viajes completos:', JSON.stringify(viajesDisp, null, 2));

      setViajesDisponibles(viajesDisp);
    } catch (err: any) {
      console.error('Error al cargar compras:', err);
      setError(err.response?.data?.error || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const finalizarCompra = async (datos: { nombre: string; documento: string; telefono: string; viajeId: string; asiento: string; precio: number; metodo: string }) => {
    try {
      setLoading(true);
      setError(null);
      await api.createPasajero({
        nombre: datos.nombre,
        documento: datos.documento,
        telefono: datos.telefono || null,
        email: null,
        viaje_id: parseInt(datos.viajeId),
        asiento: datos.asiento || null,
        precio: datos.precio,
        metodo_pago: datos.metodo,
      });
      setShowWizard(false);
      await cargarDatos();
    } catch (err: any) {
      console.error('Error al crear pasajero:', err);
      const errorMsg = err.message || 'Error al procesar la compra';
      setError(errorMsg);
      // Si el error es de asiento ocupado, mostrar alert también
      if (errorMsg.includes('asiento') && errorMsg.includes('ocupado')) {
        alert(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const descargarTicket = (compra: CompraRow) => {
    console.log('🎫 Descargando ticket PDF:', compra);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colores
      const primaryColor = '#2563eb'; // Azul
      const grayColor = '#6b7280';
      const darkColor = '#1f2937';
      
      // Header con fondo azul
      doc.setFillColor(37, 99, 235); // Azul primary
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Logo/Título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('GEONAVAL', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Control Fluvial', pageWidth / 2, 28, { align: 'center' });
      doc.text('Quibdó, Chocó - Colombia', pageWidth / 2, 36, { align: 'center' });
      
      // Título del documento
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TICKET DE PASAJE', pageWidth / 2, 60, { align: 'center' });
      
      // Línea separadora
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(20, 65, pageWidth - 20, 65);
      
      let yPos = 80;
      
      // Información del ticket
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('INFORMACIÓN DEL TICKET', 20, yPos);
      
      yPos += 8;
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Ticket:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.ticket, 60, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.fecha, 60, yPos);
      
      yPos += 15;
      
      // Datos del pasajero
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('DATOS DEL PASAJERO', 20, yPos);
      
      yPos += 8;
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Nombre:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.pasajero, 60, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Documento:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.documento, 60, yPos);
      
      yPos += 15;
      
      // Información del viaje
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('INFORMACIÓN DEL VIAJE', 20, yPos);
      
      yPos += 8;
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Código viaje:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.viaje, 60, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Ruta:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.ruta, 60, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Asiento:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.asiento, 60, yPos);
      
      yPos += 15;
      
      // Información de pago
      doc.setFillColor(243, 244, 246); // Gris claro
      doc.rect(15, yPos - 5, pageWidth - 30, 30, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('INFORMACIÓN DE PAGO', 20, yPos);
      
      yPos += 8;
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Precio:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.precio, 60, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Método de pago:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.metodoPago, 60, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Vendedor:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(compra.vendedor, 60, yPos);
      
      yPos += 20;
      
      // Instrucciones
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'bold');
      doc.text('INSTRUCCIONES IMPORTANTES', 20, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const instrucciones = [
        '• Presente este ticket al abordar la embarcación',
        '• Llegue 15 minutos antes de la hora de salida',
        '• Traiga un documento de identidad válido',
        '• No se permiten cambios ni devoluciones'
      ];
      
      instrucciones.forEach(inst => {
        doc.text(inst, 20, yPos);
        yPos += 5;
      });
      
      // Footer
      yPos = pageHeight - 30;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'bold');
      doc.text('Gracias por viajar con GeoNaval', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Calle Principal #10-20, Quibdó, Chocó', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 4;
      doc.text('Tel: +57 (4) 123-4567 | info@geonaval.com', pageWidth / 2, yPos, { align: 'center' });
      
      // Guardar PDF
      const nombreArchivo = `${compra.ticket}_${compra.pasajero.replace(/\s+/g, '_')}.pdf`;
      doc.save(nombreArchivo);
      
      console.log('✅ Ticket PDF descargado exitosamente');
    } catch (error) {
      console.error('❌ Error al descargar ticket PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    }
  };

  const columns = [
    { key: 'ticket', label: 'TICKET', sortable: true },
    { key: 'fecha', label: 'FECHA', sortable: true },
    { key: 'pasajero', label: 'PASAJERO', sortable: true },
    { key: 'documento', label: 'DOCUMENTO', sortable: true },
    { key: 'viaje', label: 'VIAJE', sortable: true },
    { key: 'ruta', label: 'RUTA', sortable: true },
    { key: 'asiento', label: 'ASIENTO', sortable: true },
    { key: 'precio', label: 'PRECIO', sortable: true },
    { key: 'metodoPago', label: 'MÉTODO PAGO', sortable: true },
    {
      key: 'acciones',
      label: 'ACCIONES',
      render: (_value: any, row: CompraRow) => (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Row recibido:', row);
            descargarTicket(row);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          title="Descargar ticket"
        >
          <Download className="w-4 h-4" />
          Descargar
        </button>
      ),
    },
  ];

  if (loading && compras.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-7 h-7 text-primary" />
            Compras y Tickets
          </h2>
          <p className="text-muted-foreground mt-1">Gestión de ventas de pasajes</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nueva Compra
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Ventas Hoy', value: stats.ventasHoy, icon: <Calendar className="w-5 h-5" />, color: 'blue' },
          { label: 'Total Recaudado', value: formatCOP(stats.totalRecaudado), icon: <Banknote className="w-5 h-5" />, color: 'green' },
          { label: 'Total Tickets', value: stats.totalTickets, icon: <Ticket className="w-5 h-5" />, color: 'purple' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-100 text-${stat.color}-600`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <ViewFeedback
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Wizard */}
      {showWizard && (
        <WizardCompra
          viajesDisponibles={viajesDisponibles}
          onFinalizar={finalizarCompra}
          onCancelar={() => setShowWizard(false)}
        />
      )}

      {/* Tabla */}
      {!showWizard && (
        <DataTable
          columns={columns}
          data={compras}
          emptyMessage="No hay compras registradas"
        />
      )}
    </div>
  );
}
