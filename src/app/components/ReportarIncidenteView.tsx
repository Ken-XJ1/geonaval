import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ViewFeedback } from './ViewFeedback';
import { api } from '../../services/api';

export function ReportarIncidenteView() {
  const [viajes, setViajes] = useState<{ id: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    viaje_id: '',
    tipo: 'retraso',
    severidad: 'media',
    descripcion: '',
  });

  const loadViajes = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await api.getViajes()) as Record<string, unknown>[];
      const activos = rows.filter((v) =>
        ['programado', 'en_curso'].includes(v.estado as string)
      );
      setViajes(
        activos.map((v) => ({
          id: Number(v.id),
          label: `V-${v.id}: ${v.origen} - ${v.destino} (${v.estado})`,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar viajes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViajes();
  }, [loadViajes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim()) {
      setError('Describe el incidente');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createIncidente({
        viaje_id: form.viaje_id ? parseInt(form.viaje_id, 10) : null,
        tipo: form.tipo,
        severidad: form.severidad,
        descripcion: form.descripcion.trim(),
        reportado_por: 'Operador Fluvial',
      });
      setSuccess('Incidente reportado correctamente. El administrador fue notificado.');
      setForm({ viaje_id: '', tipo: 'retraso', severidad: 'media', descripcion: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ViewFeedback loading />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex gap-4">
        <AlertTriangle className="w-8 h-8 text-orange-600 flex-shrink-0" />
        <div>
          <h3 className="text-xl font-semibold text-orange-900">Reportar Incidente</h3>
          <p className="text-sm text-orange-700 mt-1">
            Registra retrasos, averías, emergencias u otras situaciones durante la operación.
          </p>
        </div>
      </div>

      {error ? <ViewFeedback error={error} /> : null}
      {success ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-2">Viaje relacionado (opcional)</label>
          <select
            value={form.viaje_id}
            onChange={(e) => setForm({ ...form, viaje_id: e.target.value })}
            className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
          >
            <option value="">Sin viaje específico</option>
            {viajes.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de incidente</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              required
            >
              <option value="retraso">Retraso</option>
              <option value="averia">Avería mecánica</option>
              <option value="clima">Condiciones climáticas</option>
              <option value="seguridad">Seguridad / alteración</option>
              <option value="emergencia">Emergencia</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Severidad</label>
            <select
              value={form.severidad}
              onChange={(e) => setForm({ ...form, severidad: e.target.value })}
              className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={5}
            className="w-full px-4 py-2 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
            placeholder="Describe qué ocurrió, ubicación aproximada y acciones tomadas..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
        >
          {saving ? 'Enviando...' : 'Enviar reporte'}
        </button>
      </form>
    </div>
  );
}
