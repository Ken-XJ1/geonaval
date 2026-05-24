import { Bell, User, ChevronDown, LogOut, Settings, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

interface HeaderProps {
  title: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
}

type Notificacion = {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
};

export function Header({ title, userName = "Administrador", userEmail = "geonaval@colombia.gov.co", onLogout, onNavigate }: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const loadNotifs = useCallback(async () => {
    try {
      const rows = await api.getNotificaciones() as Notificacion[];
      setNotificaciones(rows);
    } catch (e) {
      console.error('Error cargando notificaciones:', e);
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 60000); // Polling cada minuto
    return () => clearInterval(id);
  }, [loadNotifs]);

  const unreadCount = notificaciones.filter(n => !n.leida).length;

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

  return (
    <header className="h-16 bg-white border-b border-border shadow-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-lg transition-colors ${showNotifications ? 'bg-muted' : 'hover:bg-muted'}`}
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-[10px] font-bold text-white flex items-center justify-center rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-border z-20 overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="font-semibold text-sm">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No tienes notificaciones
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notificaciones.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-4 transition-colors ${n.leida ? 'opacity-60' : 'bg-primary/5'}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className={`text-sm font-semibold ${n.leida ? 'text-foreground' : 'text-primary'}`}>
                              {n.titulo}
                            </p>
                            {!n.leida && (
                              <button 
                                onClick={() => handleMarkRead(n.id)}
                                className="p-1 hover:bg-primary/10 rounded-full text-primary transition-colors"
                                title="Marcar como leída"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {n.mensaje}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile with Dropdown */}
        <div className="relative pl-4 border-l border-border">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 hover:bg-muted rounded-lg p-2 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Usuario activo</p>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProfileMenu(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-border z-20">
                <div className="p-3 border-b border-border">
                  <p className="font-medium text-sm">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate?.('configuracion');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Configuración</span>
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
