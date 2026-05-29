import { X, FileText } from 'lucide-react';
import { Logo } from './Logo';

export function TerminosCondiciones({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo className="w-12 h-12 text-white" />
              <div>
                <h2 className="text-2xl font-bold">Términos y Condiciones</h2>
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
              <FileText className="w-5 h-5" />
              <p className="text-sm">Fecha de actualización: 15/06/2026</p>
            </div>

            <p className="text-base leading-relaxed mb-6">
              Bienvenido a GEONAVAL. Al utilizar este sistema usted acepta los presentes términos y condiciones relacionados con el uso del sistema de control fluvial.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">1. Finalidad del Sistema</h3>
                <p className="text-muted-foreground leading-relaxed">
                  El sistema GEONAVAL tiene como finalidad facilitar el registro, monitoreo y control del transporte fluvial en el departamento del Chocó.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">2. Responsabilidad del Usuario</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Los usuarios son responsables de la veracidad de la información registrada dentro de la plataforma.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">3. Uso Prohibido</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Queda prohibido el uso indebido del sistema, incluyendo accesos no autorizados, alteración de información o uso con fines ilícitos.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">4. Modificaciones del Sistema</h3>
                <p className="text-muted-foreground leading-relaxed">
                  GEONAVAL podrá actualizar, modificar o suspender funcionalidades del sistema cuando sea necesario por motivos técnicos, legales o administrativos.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">5. Auditoría</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Toda la información registrada puede ser auditada por las autoridades competentes.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">6. Aceptación</h3>
                <p className="text-muted-foreground leading-relaxed">
                  El uso continuo de la plataforma implica la aceptación de estos términos y condiciones.
                </p>
              </section>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 italic">
                GEONAVAL - Sistema Oficial de Control Fluvial
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
