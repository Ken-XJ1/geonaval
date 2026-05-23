import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Trash2, Calendar } from 'lucide-react';
import { api } from '../../services/api';
import { ViewFeedback } from './ViewFeedback';

type Notificacion = {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
};

export function NotificacionesView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getNotificaciones() as Notificacion[];
      setNotificaciones(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.marcarNotificacionLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.marcarTodasNotificacionesLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <ViewFeedback loading />;
  if (error) return <ViewFeedback error={error} />;

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Centro de Notificaciones</h2>
          <p className="text-muted-foreground">Mantente al tanto de tus viajes y alertas</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-medium">No tienes notificaciones</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            Te avisaremos cuando haya nuevos viajes disponibles o actualizaciones importantes sobre tu cuenta.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {notificaciones.map((n) => (
              <div
                key={n.id}
                className={`p-6 transition-colors hover:bg-muted/30 ${
                  !n.leida ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className={`mt-1 p-2 rounded-full ${
                      !n.leida ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${!n.leida ? 'text-primary' : 'text-foreground'}`}>
                        {n.titulo}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {n.mensaje}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Calendar className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleDateString()}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!n.leida && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Marcar como leída"
                    >
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline">Leída</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
