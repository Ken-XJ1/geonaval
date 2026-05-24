import {
  LayoutDashboard,
  Ship,
  Users,
  UserCog,
  UserCheck,
  Navigation,
  Radar,
  FileText,
  Shield,
  Settings,
  User,
  AlertTriangle,
  Ticket,
  Bell
} from 'lucide-react';
import { LogoFull } from './Logo';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userRole: string;
}

// Menú completo para Administrador
const adminMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'compras', label: 'Compras y Tickets', icon: Ticket },
  { id: 'embarcaciones', label: 'Embarcaciones', icon: Ship },
  { id: 'propietarios', label: 'Propietarios', icon: Users },
  { id: 'tripulacion', label: 'Tripulación', icon: UserCog },
  { id: 'pasajeros', label: 'Pasajeros', icon: UserCheck },
  { id: 'viajes', label: 'Viajes (Zarpe)', icon: Navigation },
  { id: 'monitoreo', label: 'Monitoreo GPS', icon: Radar },
  { id: 'reportes', label: 'Reportes', icon: FileText },
  { id: 'autoridades', label: 'Autoridades', icon: Shield },
  { id: 'usuarios', label: 'Usuarios', icon: User },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

// Menú limitado para Operador Fluvial
const operadorMenuItems = [
  { id: 'dashboard', label: 'Mis Viajes', icon: LayoutDashboard },
  { id: 'mis-pasajeros', label: 'Mis Pasajeros', icon: UserCheck },
  { id: 'mi-ruta', label: 'Mi Ruta GPS', icon: Radar },
  { id: 'reportar', label: 'Reportar Incidente', icon: AlertTriangle },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

// Menú básico para Cliente
const clienteMenuItems = [
  { id: 'dashboard', label: 'Mi Viaje', icon: LayoutDashboard },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'configuracion', label: 'Mi Perfil', icon: Settings },
];

// Menú especial para Autoridad
const autoridadMenuItems = [
  { id: 'dashboard', label: 'Supervisión', icon: Shield },
  { id: 'monitoreo', label: 'Monitoreo GPS', icon: Radar },
  { id: 'consultas', label: 'Consultas', icon: FileText },
  { id: 'reportes', label: 'Reportes Oficiales', icon: FileText },
  { id: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar({ activeView, onNavigate, userRole }: SidebarProps) {
  // Seleccionar menú según el rol
  const getMenuItems = () => {
    switch (userRole) {
      case 'administrador':
        return adminMenuItems;
      case 'operador':
        return operadorMenuItems;
      case 'cliente':
        return clienteMenuItems;
      case 'autoridad':
        return autoridadMenuItems;
      default:
        return adminMenuItems;
    }
  };

  const menuItems = getMenuItems();
  return (
    <div className="w-64 h-screen bg-white border-r border-border flex flex-col shadow-sm">
      {/* Logo y Header */}
      <div className="p-6 border-b border-border">
        <LogoFull size="md" />
      </div>
      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200
                  ${isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground hover:bg-muted'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Sistema de Registro Fluvial
          <br />
          Quibdó, Chocó
        </div>
      </div>
    </div>
  );
}
