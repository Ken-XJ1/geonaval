import { useState } from 'react';
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
import { ClienteDashboard } from './components/ClienteDashboard';
import { Footer } from './components/Footer';
import { ComprasView } from './components/ComprasView';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  const handleLogin = (role: string) => {
    setUserRole(role);
    setIsLoggedIn(true);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    setActiveView('dashboard');
  };

  const getViewTitle = () => {
    // Títulos específicos por rol
    if (userRole === 'operador') {
      const operadorTitles: Record<string, string> = {
        dashboard: 'Mis Viajes',
        'mis-pasajeros': 'Mis Pasajeros',
        'mi-ruta': 'Mi Ruta GPS',
        reportar: 'Reportar Incidente',
        configuracion: 'Configuración',
      };
      return operadorTitles[activeView] || 'Mis Viajes';
    }

    if (userRole === 'cliente') {
      const clienteTitles: Record<string, string> = {
        dashboard: 'Mi Viaje',
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
        case 'configuracion':
          return <ConfiguracionView onLogout={handleLogout} />;
        default:
          return (
            <OperadorDashboard
              onNavigateReportar={() => setActiveView('reportar')}
            />
          );
      }
    }

    if (userRole === 'cliente') {
      switch (activeView) {
        case 'dashboard':
          return <ClienteDashboard />;
        case 'configuracion':
          return <ConfiguracionView onLogout={handleLogout} />;
        default:
          return <ClienteDashboard />;
      }
    }

    if (userRole === 'autoridad') {
      switch (activeView) {
        case 'dashboard':
          return <AutoridadesView />;
        case 'monitoreo':
          return <MonitoreoView />;
        case 'consultas':
          return <AutoridadesView />;
        case 'reportes':
          return <ReportesView />;
        case 'alertas':
          return (
            <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">Alertas de Emergencia</h3>
              <p className="text-muted-foreground">Sistema de alertas y emergencias</p>
            </div>
          );
        case 'configuracion':
          return <ConfiguracionView onLogout={handleLogout} />;
        default:
          return <AutoridadesView />;
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
        return <AutoridadesView />;
      case 'usuarios':
        return <UsuariosView />;
      case 'configuracion':
        return <ConfiguracionView onLogout={handleLogout} />;
      default:
        return <Dashboard />;
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
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
      <Sidebar activeView={activeView} onNavigate={setActiveView} userRole={userRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getViewTitle()} userName={getRoleName()} onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderView()}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}