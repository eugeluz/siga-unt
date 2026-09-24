import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useModal } from './ModalProvider';

interface BulkWhatsAppPanelProps {
  alumnos: any[];
  curso: string;
  selectedIds: Set<string>;
  message: string;
  onMessageChange: (v: string) => void;
  onToggleAll: () => void;
  onClearSelection: () => void;
}

/** Normaliza el teléfono igual que el envío individual (sin pedir dato). */
export const normalizeBulkPhone = (alumno: any): string => {
  const cleanPhone = (alumno.telefono || '').replace(/\D/g, '');
  if (!cleanPhone) return '';
  let finalPhone = cleanPhone;
  if (finalPhone.length === 10) {
    finalPhone = `549${finalPhone}`;
  } else if (finalPhone.startsWith('54') && !finalPhone.startsWith('549') && finalPhone.length === 12) {
    finalPhone = `549${finalPhone.slice(2)}`;
  }
  return finalPhone;
};

/**
 * Panel de mensaje masivo por WhatsApp (archivo aparte para no mezclarlo
 * con la planilla). El navegador bloquea abrir muchas pestañas de golpe,
 * por eso se abre de a un chat por vez con el texto ya cargado.
 */
export const BulkWhatsAppPanel: React.FC<BulkWhatsAppPanelProps> = ({
  alumnos,
  curso,
  selectedIds,
  message,
  onMessageChange,
  onToggleAll,
  onClearSelection,
}) => {
  const { alert } = useModal();

  const buildText = (alumno: any): string => {
    const base = message || '';
    const txt = base.replace('{nombre}', alumno.nombre || '').replace('{apellido}', alumno.apellido || '');
    if (!base.includes('{nombre}') && !base.toLowerCase().startsWith('hola')) {
      return `Hola ${alumno.nombre || ''}, ${txt}`;
    }
    return txt;
  };

  const openChat = (alumno: any) => {
    const phone = normalizeBulkPhone(alumno);
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildText(alumno))}`, '_blank');
  };

  const copyText = async (text: string, okTitle: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      await alert({ title: okTitle, message: okMsg, variant: 'success' });
    } catch {
      await alert({ title: 'No se pudo copiar', message: 'Tu navegador bloqueó el portapapeles. Seleccioná y copiá manualmente.', variant: 'warning' });
    }
  };

  const selected = alumnos.filter(a => selectedIds.has(a.id));
  const withPhone = selected.filter(normalizeBulkPhone).length;
  void curso;

  return (
    <div className="details-box" style={{ marginBottom: '15px', background: 'var(--surface-bg)', border: '1px solid var(--border-card)', padding: '16px' }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
        <MessageSquare size={16} /> Mensaje masivo por WhatsApp
        <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          ({selectedIds.size} seleccionados)
        </span>
      </h4>
      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Tildá alumnos en la primera columna (o <button type="button" onClick={onToggleAll} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>seleccionar todos</button>),
        escribí el aviso y abrí cada chat con el texto ya cargado. Podés usar {'{nombre}'} y {'{apellido}'} como comodines.
      </p>
      <textarea
        className="form-control"
        value={message}
        onChange={e => onMessageChange(e.target.value)}
        rows={3}
        placeholder='Ej: Te avisamos que hoy no se dicta la clase del curso. Te confirmaremos la reprogramación.'
        style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
      />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
        <button type="button" className="btn-secondary" onClick={onToggleAll} style={{ margin: 0, fontSize: '0.82rem' }}>
          {selectedIds.size >= alumnos.length && alumnos.length > 0 ? 'Quitar todos' : 'Seleccionar todos'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={selectedIds.size === 0 || !message.trim()}
          onClick={() => {
            const phones = selected.map(normalizeBulkPhone).filter(Boolean);
            copyText(phones.join(', '), 'Teléfonos copiados', `${phones.length} teléfono(s) copiados, separados por coma. Pegalo en tu lista de difusión.`);
          }}
          style={{ margin: 0, fontSize: '0.82rem', opacity: selectedIds.size === 0 || !message.trim() ? 0.5 : 1 }}
          title="Copia los teléfonos de los seleccionados para una lista de difusión"
        >
          Copiar teléfonos ({withPhone})
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!message.trim()}
          onClick={() => copyText(message, 'Mensaje copiado', 'Texto copiado. Pegalo en WhatsApp.')}
          style={{ margin: 0, fontSize: '0.82rem', opacity: !message.trim() ? 0.5 : 1 }}
        >
          Copiar mensaje
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={selectedIds.size === 0}
          onClick={onClearSelection}
          style={{ margin: 0, fontSize: '0.82rem', opacity: selectedIds.size === 0 ? 0.5 : 1 }}
        >
          Limpiar selección
        </button>
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
          {selected.map(a => {
            const phone = normalizeBulkPhone(a);
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '6px 10px' }}>
                <span style={{ fontWeight: 600 }}>{a.apellido}, {a.nombre}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{phone || 'sin teléfono'}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!phone || !message.trim()}
                  onClick={() => openChat(a)}
                  style={{ margin: 0, marginLeft: 'auto', padding: '2px 10px', minHeight: '28px', fontSize: '0.78rem', opacity: !phone || !message.trim() ? 0.5 : 1 }}
                  title={phone ? `Abrir chat con ${a.nombre}` : 'Sin teléfono registrado'}
                >
                  <MessageSquare size={13} /> WhatsApp
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
