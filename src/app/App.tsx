import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { EmbarcacionesView } from './components/EmbarcacionesView';
import { PropietariosView } from './components/PropietariosView';
import { TripulacionView } from './components/TripulacionView';
import { PasajerosView } from './components/PasajerosView';
import { ViajesView } from './components/ViajesView';
import { MonitoreoView } from './components/MonitoreoView';
import { ReportesView } from './components/ReportesView';
import { AutoridadesView } from './components/AutoridadesView';
import { UsuariosView } from './components/UsuariosView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { OperadorDashboard } from './components/OperadorDashboard';
import { ReportarIncidenteView } from './components/ReportarIncidenteView';
import { Footer } from './components/Footer';
import { ComprasView } from './components/ComprasView';
import { NotificacionesView } from './components/NotificacionesView';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState<{
    nombre: string;
    email: string;
    rol: string;
  } | null>(() => {
    const rol = localStorage.getItem('userRole');
    if (!rol) return null;
    return {
      nombre: localStorage.getItem('userNombre') || 'Usuario',
      email: localStorage.getItem('userEmail') || '',
      rol: rol,
    };
  });
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogin = (userData: {
    nombre: string;
    email: string;
    rol: string;
  }) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('userRole', userData.rol);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUser(null);
    setActiveView('dashboard');
  };

  const userRole = user?.rol || '';

  const renderConfiguracion = () => (
    <ConfiguracionView
      user={user}
      onUserUpdate={(updated) =>
        setUser({ nombre: updated.nombre, email: updated.email, rol: user?.rol || '' })
      }
    />
  );

  const getViewTitle = () => {
    // Títulos específicos por rol
    if (userRole === 'operador') {
      const operadorTitles: Record<string, string> = {
        dashboard: 'Mis Viajes',
        'mis-pasajeros': 'Mis Pasajeros',
        'mi-ruta': 'Mi Ruta GPS',
        reportar: 'Reportar Incidente',
        notificaciones: 'Centro de Notificaciones',
        configuracion: 'Configuración',
      };
      return operadorTitles[activeView] || 'Mis Viajes';
    }

    if (userRole === 'cliente') {
      const clienteTitles: Record<string, string> = {
        dashboard: 'Mi Viaje',
        notificaciones: 'Centro de Notificaciones',
        configuracion: 'Mi Perfil',
      };
      return clienteTitles[activeView] || 'Mi Viaje';
    }

    if (userRole === 'autoridad') {
      const autoridadTitles: Record<string, string> = {
        dashboard: 'Panel de Supervisión',
        monitoreo: 'Monitoreo GPS',
        consultas: 'Consultas',
        reportes: 'Reportes Oficiales',
        alertas: 'Alertas de Emergencia',
        notificaciones: 'Centro de Notificaciones',
        configuracion: 'Configuración',
      };
      return autoridadTitles[activeView] || 'Panel de Supervisión';
    }

    // Administrador - Títulos completos
    const adminTitles: Record<string, string> = {
      dashboard: 'Dashboard Principal',
      compras: 'Gestión de Compras y Tickets',
      embarcaciones: 'Gestión de Embarcaciones',
      propietarios: 'Gestión de Propietarios',
      tripulacion: 'Gestión de Tripulación',
      pasajeros: 'Gestión de Pasajeros',
      viajes: 'Gestión de Viajes (Zarpe)',
      monitoreo: 'Monitoreo GPS en Tiempo Real',
      reportes: 'Reportes y Estadísticas',
      autoridades: 'Acceso para Autoridades',
      usuarios: 'Gestión de Usuarios',
      notificaciones: 'Centro de Notificaciones',
      configuracion: 'Configuración del Sistema',
    };
    return adminTitles[activeView] || 'Dashboard Principal';
  };

  const renderView = () => {
    // Renderizado según el rol del usuario
    if (userRole === 'operador') {
      switch (activeView) {
        case 'dashboard':
          return (
            <OperadorDashboard
              onNavigateReportar={() => setActiveView('reportar')}
            />
          );
        case 'mis-pasajeros':
          return <OperadorDashboard section="pasajeros" />;
        case 'mi-ruta':
          return <MonitoreoView />;
        case 'reportar':
          return <ReportarIncidenteView />;
        case 'notificaciones':
          return <NotificacionesView />;
        case 'configuracion':
          return renderConfiguracion();
        default:
          return (
            <OperadorDashboard
              onNavigateReportar={() => setActiveView('reportar')}
            />
          );
      }
    }

    if (userRole === 'autoridad') {
      switch (activeView) {
        case 'dashboard':
          return <AutoridadesView onNavigate={setActiveView} />;
        case 'monitoreo':
          return <MonitoreoView />;
        case 'consultas':
          return <AutoridadesView onNavigate={setActiveView} />;
        case 'reportes':
          return <ReportesView />;
        case 'alertas':
          return (
            <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">Alertas de Emergencia</h3>
              <p className="text-muted-foreground">Sistema de alertas y emergencias</p>
            </div>
          );
        case 'notificaciones':
          return <NotificacionesView />;
        case 'configuracion':
          return renderConfiguracion();
        default:
          return <AutoridadesView onNavigate={setActiveView} />;
      }
    }

    // Administrador - Acceso completo
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'compras':
        return <ComprasView />;
      case 'embarcaciones':
        return <EmbarcacionesView />;
      case 'propietarios':
        return <PropietariosView />;
      case 'tripulacion':
        return <TripulacionView />;
      case 'pasajeros':
        return <PasajerosView />;
      case 'viajes':
        return <ViajesView />;
      case 'monitoreo':
        return <MonitoreoView />;
      case 'reportes':
        return <ReportesView />;
      case 'autoridades':
        return <AutoridadesView onNavigate={setActiveView} />;
      case 'usuarios':
        return <UsuariosView />;
      case 'notificaciones':
        return <NotificacionesView onNavigate={setActiveView} />;
      case 'configuracion':
        return renderConfiguracion();
      default:
        return <Dashboard />;
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(role) => {
      setUser({
        nombre: localStorage.getItem('userNombre') || 'Usuario',
        email: localStorage.getItem('userEmail') || '',
        rol: localStorage.getItem('userRole') || role,
      });
      setIsLoggedIn(true);
    }} />;
  }

  const getRoleName = () => {
    switch (userRole) {
      case 'administrador':
        return 'Administrador';
      case 'operador':
        return 'Operador Fluvial';
      case 'cliente':
        return 'Cliente';
      case 'autoridad':
        return 'Autoridad';
      default:
        return 'Usuario';
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fijo en desktop, drawer en móvil */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => {
            setActiveView(view);
            setSidebarOpen(false);
          }}
          userRole={userRole}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          title={getViewTitle()}
          userName={user?.nombre || getRoleName()}
          userEmail={user?.email}
          onLogout={handleLogout}
          onNavigate={setActiveView}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {renderView()}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
  }