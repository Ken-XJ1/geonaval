interface StatusBadgeProps {
  status: 'operativa' | 'mantenimiento' | 'fuera-servicio' | 'inspeccion' |
          'programado' | 'en-curso' | 'finalizado' | 'cancelado' |
          'activo' | 'inactivo' | 'pendiente' | 'confirmado' | 'embarcado';
  label?: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  operativa: { bg: 'bg-green-100', text: 'text-green-700', label: 'Operativa' },
  mantenimiento: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En Mantenimiento' },
  'fuera-servicio': { bg: 'bg-red-100', text: 'text-red-700', label: 'Fuera de Servicio' },
  inspeccion: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Inspección' },

  programado: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Programado' },
  'en-curso': { bg: 'bg-green-100', text: 'text-green-700', label: 'En Curso' },
  finalizado: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Finalizado' },
  cancelado: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },

  activo: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activo' },
  inactivo: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactivo' },
  pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
  confirmado: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmado' },
  embarcado: { bg: 'bg-green-100', text: 'text-green-700', label: 'Embarcado' },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  // Manejo de error: si el estado no existe, usar un estado por defecto
  const config = statusConfig[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: status || 'Desconocido'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {label || config.label}
    </span>
  );
}
