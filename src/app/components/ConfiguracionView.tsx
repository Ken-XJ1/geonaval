import { User, Bell, Shield, LogOut, Settings as SettingsIcon, Moon, Sun } from 'lucide-react';
import { Logo } from './Logo';

interface ConfiguracionViewProps {
  onLogout: () => void;
  user: {
    nombre: string;
    email: string;
    rol: string;
  } | null;
}

export function ConfiguracionView({ onLogout, user }: ConfiguracionViewProps) {
  const roleLabels: Record<string, string> = {
    administrador: 'Administrador',
    operador: 'Operador Fluvial',
    cliente: 'Cliente',
    autoridad: 'Autoridad',
  };
  const roleName = roleLabels[user?.rol || ''] || 'Usuario';
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configuración del Sistema</h2>
        <p className="text-muted-foreground">Personaliza tu experiencia en GEONAVAL</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{user?.nombre || 'Usuario'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email || 'geonaval@colombia.gov.co'}</p>
            <p className="text-xs text-muted-foreground mt-1">Rol: {roleName}</p>
          </div>
          <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            Editar Perfil
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">Último acceso</p>
            <p className="font-medium">09/05/2026 10:30 AM</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Miembro desde</p>
            <p className="font-medium">Enero 2026</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notificaciones */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Notificaciones</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Alertas de viajes</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Notificaciones GPS</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Alertas de embarcaciones</span>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Reportes automáticos</span>
              <input type="checkbox" className="w-4 h-4" />
            </label>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold">Seguridad</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left py-2 text-sm hover:text-primary transition-colors">
              Cambiar contraseña
            </button>
            <button className="w-full text-left py-2 text-sm hover:text-primary transition-colors">
              Autenticación de dos factores
            </button>
            <button className="w-full text-left py-2 text-sm hover:text-primary transition-colors">
              Dispositivos conectados
            </button>
            <button className="w-full text-left py-2 text-sm hover:text-primary transition-colors">
              Historial de sesiones
            </button>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold">Preferencias del Sistema</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Idioma</label>
            <select className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none">
              <option>Español</option>
              <option>English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Zona Horaria</label>
            <select className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none">
              <option>Colombia (UTC-5)</option>
              <option>Otra zona</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Formato de Fecha</label>
            <select className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none">
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tema</label>
            <select className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none">
              <option>Claro</option>
              <option>Oscuro</option>
              <option>Automático</option>
            </select>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <Logo className="w-16 h-16" />
          <div>
            <h3 className="font-semibold">GEONAVAL</h3>
            <p className="text-sm text-muted-foreground">Sistema de Control Fluvial</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Versión</p>
            <p className="font-medium">1.0.0</p>
          </div>
          <div>
            <p className="text-muted-foreground">Última actualización</p>
            <p className="font-medium">Mayo 2026</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <p>© 2026 GEONAVAL - Quibdó, Chocó, Colombia</p>
          <p className="mt-1">Sistema de Registro y Monitoreo del Transporte Fluvial</p>
        </div>
      </div>

    </div>
  );
}
