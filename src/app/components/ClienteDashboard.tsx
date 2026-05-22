import { Ship, Clock, MapPin, Calendar, Navigation } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function ClienteDashboard() {
  // Información del viaje del cliente
  const miViaje = {
    id: 'V-001',
    fechaSalida: '09/05/2026',
    horaSalida: '08:30 AM',
    horaLlegada: '11:45 AM',
    ruta: 'Quibdó - Istmina',
    origen: 'Quibdó',
    destino: 'Istmina',
    embarcacion: 'Ferry San José',
    estado: 'en-curso' as const,
    asiento: 'A-15',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Bienvenido a GEONAVAL</h2>
        <p className="text-white/90">Información de tu viaje</p>
      </div>

      {/* Estado del Viaje */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Tu Viaje</h3>
          <StatusBadge status={miViaje.estado} />
        </div>

        {/* Ruta Visual */}
        <div className="mb-6">
          <div className="flex items-center justify-between relative">
            <div className="flex-1 text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold">{miViaje.origen}</p>
              <p className="text-sm text-muted-foreground">{miViaje.horaSalida}</p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-16 h-0.5 bg-primary"></div>
                <Ship className="w-8 h-8 text-primary" />
                <div className="w-16 h-0.5 bg-primary"></div>
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold">{miViaje.destino}</p>
              <p className="text-sm text-muted-foreground">{miViaje.horaLlegada}</p>
            </div>
          </div>
        </div>

        {/* Información del Viaje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Viaje</p>
                <p className="font-medium">{miViaje.fechaSalida}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Ship className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Embarcación</p>
                <p className="font-medium">{miViaje.embarcacion}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Hora de Salida</p>
                <p className="font-medium">{miViaje.horaSalida}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Llegada Estimada</p>
                <p className="font-medium text-green-600">{miViaje.horaLlegada}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Asiento */}
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-blue-100 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tu Asiento</p>
              <p className="text-2xl font-bold text-primary">{miViaje.asiento}</p>
            </div>
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <p className="text-xl font-bold text-primary">{miViaje.asiento}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ubicación Básica */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Ubicación del Viaje</h3>
        </div>
        <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center border border-border">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-primary mx-auto mb-3 animate-pulse" />
            <p className="text-lg font-medium text-primary">En Tránsito</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tu embarcación está en camino
            </p>
          </div>
        </div>
      </div>

      {/* Estado de la Embarcación */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4">Estado de la Embarcación</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2 animate-pulse"></div>
            <p className="text-sm font-medium text-green-700">Operando</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-2xl font-bold text-primary mb-1">45</p>
            <p className="text-sm text-muted-foreground">Pasajeros</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-2xl font-bold text-orange-600 mb-1">2:15</p>
            <p className="text-sm text-muted-foreground">Restantes</p>
          </div>
        </div>
      </div>

      {/* Información de Contacto */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-primary mb-3">¿Necesitas Ayuda?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Si tienes alguna pregunta o necesitas asistencia durante tu viaje, contáctanos.
        </p>
        <div className="space-y-2 text-sm">
          <p><strong>Teléfono:</strong> +57 (4) 670-1234</p>
          <p><strong>Email:</strong> soporte@geonaval.gov.co</p>
          <p><strong>Atención:</strong> 24/7</p>
        </div>
      </div>
    </div>
  );
}
