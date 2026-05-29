import { X, Cookie } from 'lucide-react';
import { Logo } from './Logo';

export function PoliticaCookies({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo className="w-12 h-12 text-white" />
              <div>
                <h2 className="text-2xl font-bold">Política de Cookies</h2>
                <p className="text-white/80 text-sm">GEONAVAL - Control Fluvial</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="prose prose-sm max-w-none">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Cookie className="w-5 h-5" />
              <p className="text-sm">Fecha de actualización: 30/06/2026</p>
            </div>

            <p className="text-base leading-relaxed mb-6">
              Este sitio utiliza cookies para mejorar la experiencia del usuario y optimizar el funcionamiento de la plataforma.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">1. ¿Qué son las Cookies?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Las cookies permiten recordar preferencias, sesiones activas y configuraciones del sistema.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">2. Uso de Cookies</h3>
                <p className="text-muted-foreground leading-relaxed">
                  GEONAVAL puede utilizar cookies técnicas necesarias para el correcto funcionamiento del sitio.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">3. Seguridad</h3>
                <p className="text-muted-foreground leading-relaxed">
                  No se utilizan cookies con fines maliciosos ni para recopilar información sensible sin autorización.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">4. Control del Usuario</h3>
                <p className="text-muted-foreground leading-relaxed">
                  El usuario puede configurar su navegador para bloquear o eliminar cookies en cualquier momento.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">5. Aceptación</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Al continuar navegando en la plataforma, el usuario acepta el uso básico de cookies necesarias para el funcionamiento del sistema.
                </p>
              </section>
            </div>

            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900 italic">
                GEONAVAL - Sistema Oficial de Control Fluvial
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
