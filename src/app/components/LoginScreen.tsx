import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { LogoFull } from './Logo';
import { api } from '../../services/api';
import Swal from 'sweetalert2';

interface LoginScreenProps {
  onLogin: (role: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.login(email, password);

      // Login exitoso
      await Swal.fire({
        icon: 'success',
        title: `¡Bienvenido, ${data.nombre}!`,
        text: 'Sesión iniciada correctamente.',
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true,
      });

      onLogin(data.rol);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor';
      const esBloqueada = msg.toLowerCase().includes('bloqueada') || msg.toLowerCase().includes('bloqueado');
      const tieneIntentos = msg.toLowerCase().includes('intento');

      if (esBloqueada) {
        await Swal.fire({
          icon: 'error',
          title: '🔒 Cuenta Bloqueada',
          html: `
            <p class="text-gray-600 mb-3">${msg}</p>
            <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <strong>¿Qué hacer?</strong><br/>
              Contacta al administrador del sistema para que desbloquee tu cuenta desde el panel de Auditoría.
            </div>
          `,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#dc2626',
        });
      } else if (tieneIntentos) {
        // Extraer número de intentos restantes del mensaje
        const match = msg.match(/(\d+) intento/);
        const restantes = match ? parseInt(match[1]) : null;

        await Swal.fire({
          icon: 'warning',
          title: '⚠️ Contraseña Incorrecta',
          html: `
            <p class="text-gray-600 mb-3">${msg}</p>
            ${restantes === 1 ? `
              <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                <strong>¡Último intento!</strong> Si fallas de nuevo, tu cuenta será bloqueada automáticamente.
              </div>
            ` : ''}
          `,
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: '#f59e0b',
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error al iniciar sesión',
          text: msg,
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: '#0B5ED7',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1744918177842-ef9d9bf7242b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
          alt="Río Atrato"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-blue-900/90" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <LogoFull size="lg" />
            </div>
            <p className="text-foreground font-medium mb-1">
              Sistema de Registro Fluvial y Monitoreo GPS
            </p>
            <p className="text-sm text-muted-foreground">
              Control y seguridad del transporte fluvial
            </p>
          </div>

          {/* Aviso de seguridad */}
          <div className="flex items-start gap-2 mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Las cuentas se bloquean automáticamente tras <strong>3 intentos fallidos</strong>. Solo el administrador puede desbloquearlas.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="ejemplo@correo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Acceso de prueba */}
          <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Acceso de prueba</p>
            <p>test@test.com / 123456 (administrador)</p>
            <p>admin@geonaval.com / admin123</p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Quibdó, Chocó — Colombia
              <br />
              Sistema de Control del Transporte Fluvial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
