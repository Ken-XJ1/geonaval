import { Mail, Phone, MapPin, Shield } from 'lucide-react';
import { Logo } from './Logo';
import { useState } from 'react';
import { TerminosCondiciones } from './TerminosCondiciones';
import { PoliticaPrivacidad } from './PoliticaPrivacidad';
import { PoliticaCookies } from './PoliticaCookies';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [showTerminos, setShowTerminos] = useState(false);
  const [showPrivacidad, setShowPrivacidad] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Logo className="w-12 h-12" />
              <div>
                <h3 className="font-bold text-primary text-lg">GEONAVAL</h3>
                <p className="text-xs text-muted-foreground">Control Fluvial</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de Registro y Monitoreo del Transporte Fluvial en Quibdó, Chocó.
            </p>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Contacto</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>+57 (4) 670-1234</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>info@geonaval.gov.co</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Calle Principal #10-20</span>
              </div>
              <div className="ml-6 text-xs">
                Quibdó, Chocó, Colombia
              </div>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={() => setShowTerminos(true)} className="hover:text-primary transition-colors text-left">
                  Términos y Condiciones
                </button>
              </li>
              <li>
                <button onClick={() => setShowPrivacidad(true)} className="hover:text-primary transition-colors text-left">
                  Política de Privacidad
                </button>
              </li>
              <li>
                <button onClick={() => setShowCookies(true)} className="hover:text-primary transition-colors text-left">
                  Política de Cookies
                </button>
              </li>
            </ul>
          </div>

          {/* Información Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Información Legal</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-xs">Sistema Oficial</p>
                  <p className="text-xs">Autorizado por la Capitanía del Puerto</p>
                </div>
              </div>
              <p className="text-xs mt-3">
                Versión 1.0.0 - Mayo {currentYear}
              </p>
              <p className="text-xs">
                Atención 24/7
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-center md:text-left">
              © {currentYear} GEONAVAL - Sistema de Control del Transporte Fluvial. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <button onClick={() => setShowTerminos(true)} className="hover:text-primary transition-colors">
                Términos
              </button>
              <span>•</span>
              <button onClick={() => setShowPrivacidad(true)} className="hover:text-primary transition-colors">
                Privacidad
              </button>
              <span>•</span>
              <button onClick={() => setShowCookies(true)} className="hover:text-primary transition-colors">
                Cookies
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showTerminos && <TerminosCondiciones onClose={() => setShowTerminos(false)} />}
      {showPrivacidad && <PoliticaPrivacidad onClose={() => setShowPrivacidad(false)} />}
      {showCookies && <PoliticaCookies onClose={() => setShowCookies(false)} />}
    </footer>
  );
}
