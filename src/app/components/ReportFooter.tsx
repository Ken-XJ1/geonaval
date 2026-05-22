import { Logo } from './Logo';

interface ReportFooterProps {
  reportType: string;
  generatedBy: string;
  generatedDate: string;
  pageNumber?: number;
  totalPages?: number;
}

export function ReportFooter({
  reportType,
  generatedBy,
  generatedDate,
  pageNumber = 1,
  totalPages = 1,
}: ReportFooterProps) {
  return (
    <div className="mt-8 pt-6 border-t-2 border-primary">
      <div className="flex items-start justify-between">
        {/* Logo and Info */}
        <div className="flex items-center gap-3">
          <Logo className="w-14 h-14" />
          <div>
            <h4 className="font-bold text-primary text-lg">GEONAVAL</h4>
            <p className="text-xs text-muted-foreground">Sistema de Control Fluvial</p>
            <p className="text-xs text-muted-foreground mt-1">Quibdó, Chocó - Colombia</p>
          </div>
        </div>

        {/* Report Details */}
        <div className="text-right text-sm">
          <p className="font-semibold text-foreground">{reportType}</p>
          <p className="text-xs text-muted-foreground mt-1">Generado por: {generatedBy}</p>
          <p className="text-xs text-muted-foreground">Fecha: {generatedDate}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Página {pageNumber} de {totalPages}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground mb-1">Contacto</p>
          <p>info@geonaval.gov.co</p>
          <p>+57 (4) 670-1234</p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">Dirección</p>
          <p>Calle Principal #10-20</p>
          <p>Quibdó, Chocó</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground mb-1">Sistema Oficial</p>
          <p>Control del Transporte</p>
          <p>Fluvial del Chocó</p>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground italic">
          Este documento es un reporte oficial generado por el Sistema GEONAVAL
        </p>
      </div>
    </div>
  );
}
