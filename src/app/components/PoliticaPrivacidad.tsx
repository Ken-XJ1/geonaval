import { X, Shield } from 'lucide-react';
import { Logo } from './Logo';

export function PoliticaPrivacidad({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo className="w-12 h-12 text-white" />
              <div>
                <h2 className="text-2xl font-bold">Política de Privacidad</h2>
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
              <Shield className="w-5 h-5" />
              <p className="text-sm">Fecha de actualización: 20/06/2026</p>
            </div>

            <p className="text-base leading-relaxed mb-6">
              GEONAVAL protege la información personal de sus usuarios conforme a las normativas vigentes en Colombia sobre protección de datos.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">1. Uso de la Información</h3>
                <p className="text-muted-foreground leading-relaxed">
                  La información recolectada será utilizada únicamente para fines operativos, administrativos y de control del transporte fluvial.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">2. Compartir Información</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Los datos personales no serán compartidos con terceros no autorizados.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">3. Derechos del Usuario</h3>
                <p className="text-muted-foreground leading-relaxed">
                  El usuario podrá solicitar actualización, corrección o eliminación de sus datos personales cuando sea permitido por la ley.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">4. Medidas de Seguridad</h3>
                <p className="text-muted-foreground leading-relaxed">
                  GEONAVAL implementa medidas de seguridad para proteger la información almacenada en la plataforma.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">5. Autenticación y Permisos</h3>
                <p className="text-muted-foreground leading-relaxed">
                  El acceso a ciertos módulos del sistema puede requerir autenticación y validación de permisos.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">6. Registros de Actividad</h3>
                <p className="text-muted-foreground leading-relaxed">
                  La plataforma puede almacenar registros de actividad para fines de seguridad y auditoría.
                </p>
              </section>
            </div>

            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 italic">
                GEONAVAL - Sistema Oficial de Control Fluvial
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
