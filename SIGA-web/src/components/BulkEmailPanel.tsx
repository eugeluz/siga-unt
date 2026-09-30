import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Mail, Users, ExternalLink } from 'lucide-react';
import { useModal } from './ModalProvider';
import { logAudit } from '../utils/audit';
import { DIFUSION_SHEET_ID, DIFUSION_LOTES, DIFUSION_TRAMO_DEFAULT } from '../config/difusion';

interface BulkEmailPanelProps {
  alumnos?: any[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normKey = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

interface DifusionRow {
  key: string;
  nombre: string;
  email: string;
  dni: string;
  enPadron: boolean;
}

const pickVal = (row: Record<string, any>, aliases: string[]): string => {
  for (const a of aliases) {
    const v = row[normKey(a)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

/**
 * Difusión por Email (réplica por mail del mensaje masivo de Asistencia).
 * Lee el lote en vivo desde Google Sheets (nada se guarda en Firebase),
 * cruza con el padrón por DNI/email, y abre Gmail por tramos en CCO con
 * asunto + texto + link del flyer ya cargados. Solo la ve el admin.
 */
export const BulkEmailPanel: React.FC<BulkEmailPanelProps> = ({ alumnos = [] }) => {
  const { alert } = useModal();
  const [lote, setLote] = useState(DIFUSION_LOTES[0] || '');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DifusionRow[]>([]);
  const [sinEmail, setSinEmail] = useState(0);
  const [loteCargado, setLoteCargado] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [porTramo, setPorTramo] = useState(DIFUSION_TRAMO_DEFAULT);

  const sheetConfigurada = DIFUSION_SHEET_ID.trim() !== '' && DIFUSION_LOTES.length > 0;

  const padron = useMemo(() => {
    const dnis = new Set<string>();
    const mails = new Set<string>();
    (alumnos || []).forEach((a: any) => {
      const d = String(a?.dni ?? '').replace(/\D/g, '');
      if (d) dnis.add(d);
      const m = String(a?.email || '').toLowerCase().trim();
      if (m) mails.add(m);
    });
    return { dnis, mails };
  }, [alumnos]);

  const cargarLote = async () => {
    if (!lote) {
      await alert({ title: 'Sin lote', message: 'Elegí un lote para cargar.', variant: 'info' });
      return;
    }
    setLoading(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${DIFUSION_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(lote)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      const wb = XLSX.read(csv, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const vistos = new Set<string>();
      const validas: DifusionRow[] = [];
      let sin = 0;
      raw.forEach((r) => {
        const norm: Record<string, any> = {};
        Object.keys(r || {}).forEach((k) => { norm[normKey(k)] = r[k]; });
        const email = pickVal(norm, ['email', 'e-mail', 'e mail', 'mail', 'correo', 'correo electronico']).toLowerCase();
        const nombre = pickVal(norm, ['nombre', 'nombres', 'name', 'nombre completo', 'apellido y nombre']);
        const dni = String(pickVal(norm, ['dni', 'documento', 'doc']) || '').replace(/\D/g, '');
        if (!EMAIL_RE.test(email)) { sin++; return; }
        if (vistos.has(email)) return;
        vistos.add(email);
        validas.push({
          key: email,
          nombre,
          email,
          dni,
          enPadron: (dni !== '' && padron.dnis.has(dni)) || padron.mails.has(email),
        });
      });
      setRows(validas);
      setSinEmail(sin);
      setLoteCargado(lote);
      setSelected(new Set(validas.map((v) => v.key)));
      await logAudit('Difusión por email', `Lote “${lote}” cargado: ${validas.length} mails válidos (${sin} filas sin email válido).`);
    } catch (err) {
      console.error('Error cargando lote de difusión:', err);
      await alert({
        title: 'No se pudo leer la planilla',
        message: 'Revisá que la planilla esté publicada (Archivo → Compartir → Publicar en la web), que el ID en src/config/difusion.ts sea correcto y que la hoja se llame igual que el lote.',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const seleccionadas = useMemo(() => rows.filter((r) => selected.has(r.key)), [rows, selected]);
  const enPadronCount = useMemo(() => rows.filter((r) => r.enPadron).length, [rows]);

  const tramos = useMemo(() => {
    const n = Math.max(5, Math.min(100, Number(porTramo) || DIFUSION_TRAMO_DEFAULT));
    const out: DifusionRow[][] = [];
    for (let i = 0; i < seleccionadas.length; i += n) out.push(seleccionadas.slice(i, i + n));
    return out;
  }, [seleccionadas, porTramo]);

  const cuerpoLote = useMemo(() => {
    // En lote el texto es igual para todos: los comodines se vacían.
    const base = mensaje.replace('{nombre}', '').replace('{apellido}', '');
    return flyerUrl.trim() ? `${base}\n\nFlyer del curso: ${flyerUrl.trim()}` : base;
  }, [mensaje, flyerUrl]);

  const gmailUrl = (bcc: string[], subject: string, body: string) =>
    `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bcc.join(','))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const cuerpoIndividual = (r: DifusionRow) => {
    const base = mensaje.replace('{nombre}', r.nombre || '').replace('{apellido}', '');
    return flyerUrl.trim() ? `${base}\n\nFlyer del curso: ${flyerUrl.trim()}` : base;
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size >= rows.length && rows.length > 0 ? new Set() : new Set(rows.map((r) => r.key))));
  };
  const soloPadron = () => setSelected(new Set(rows.filter((r) => r.enPadron).map((r) => r.key)));

  if (!sheetConfigurada) {
    return (
      <div className="details-box" style={{ marginTop: '25px' }}>
        <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={20} color="var(--primary)" /> Difusión por Email
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Para activar la difusión, completá <code>src/config/difusion.ts</code>: ID de la planilla de
          Google Sheets y nombres de las hojas (una por lote). La planilla debe estar publicada en la
          web (Archivo → Compartir → Publicar en la web). No se guarda nada en Firebase.
        </p>
      </div>
    );
  }

  return (
    <div className="details-box" style={{ marginTop: '25px', width: '100%', boxSizing: 'border-box' }}>
      <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Mail size={20} color="var(--primary)" /> Difusión por Email
        <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          (solo administración)
        </span>
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: 1.6 }}>
        Elegí el lote (hoja de la planilla), redactá el aviso con el link del flyer de Drive y abrí Gmail
        por tramos en CCO (los destinatarios no se ven entre sí). Nada se guarda en Firebase.
      </p>

      {/* Paso 1: lote */}
      <div className="form-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
          <label>Lote (hoja de la planilla)</label>
          <select className="form-control" value={lote} onChange={(e) => setLote(e.target.value)} disabled={loading}>
            {DIFUSION_LOTES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={cargarLote} disabled={loading || !lote} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Users size={15} /> {loading ? 'Cargando...' : 'Cargar lote'}
        </button>
      </div>

      {loteCargado && (
        <p style={{ fontSize: '0.85rem', margin: '12px 0 0' }}>
          Lote <strong>{loteCargado}</strong>: {rows.length} mails válidos · {enPadronCount} en padrón
          {sinEmail > 0 ? ` · ${sinEmail} fila(s) sin email válido (se excluyen)` : ''} · {selected.size} seleccionados.
        </p>
      )}

      {rows.length > 0 && (
        <>
          {/* Selección */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={toggleAll} style={{ margin: 0, fontSize: '0.82rem' }}>
              {selected.size >= rows.length ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
            <button type="button" className="btn-secondary" onClick={soloPadron} style={{ margin: 0, fontSize: '0.82rem' }}>
              Solo padrón ({enPadronCount})
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSelected(new Set())} style={{ margin: 0, fontSize: '0.82rem' }}>
              Limpiar selección
            </button>
          </div>

          {/* Vista previa */}
          <div className="preview-table-wrapper" style={{ overflowX: 'auto', maxHeight: '180px', marginTop: '10px' }}>
            <table className="listbox-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr><th></th><th>Nombre</th><th>Email</th><th>DNI</th><th>Padrón</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r) => (
                  <tr key={r.key}>
                    <td><input type="checkbox" checked={selected.has(r.key)} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })} /></td>
                    <td>{r.nombre || '—'}</td>
                    <td>{r.email}</td>
                    <td>{r.dni || '—'}</td>
                    <td>{r.enPadron ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 8 && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>…y {rows.length - 8} más (la selección aplica a todos).</p>}

          {/* Paso 2: mensaje */}
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Asunto</label>
            <input type="text" className="form-control" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej: Nuevos cursos gratuitos para el personal UNT" />
          </div>
          <div className="form-group">
            <label>Mensaje (en lote sale igual para todos; {'{nombre}'} solo se aplica en el envío individual)</label>
            <textarea className="form-control" rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Hola, te contamos los nuevos cursos gratuitos del Centro de Capacitación…" style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }} />
          </div>
          <div className="form-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: '1 1 260px' }}>
              <label>Link del flyer en Drive</label>
              <input type="text" className="form-control" value={flyerUrl} onChange={(e) => setFlyerUrl(e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
            <div className="form-group" style={{ margin: 0, flex: '0 1 140px' }}>
              <label>Destinatarios por tramo</label>
              <input type="number" className="form-control" min={5} max={100} value={porTramo} onChange={(e) => setPorTramo(Number(e.target.value))} />
            </div>
          </div>

          {/* Tramos CCO */}
          {tramos.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <strong style={{ fontSize: '0.85rem' }}>Abrir Gmail por tramos (CCO):</strong>
              {tramos.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn-secondary"
                  disabled={!asunto.trim() || !mensaje.trim()}
                  onClick={() => window.open(gmailUrl(t.map((r) => r.email), asunto, cuerpoLote), '_blank')}
                  style={{ margin: 0, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', opacity: !asunto.trim() || !mensaje.trim() ? 0.5 : 1 }}
                  title={!asunto.trim() || !mensaje.trim() ? 'Completá asunto y mensaje primero' : `Abrir Gmail con ${t.length} destinatarios en CCO`}
                >
                  <ExternalLink size={13} /> Tramo {i + 1} ({t.length} destinatarios)
                </button>
              ))}
            </div>
          )}

          {/* Individual */}
          {seleccionadas.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              <strong style={{ fontSize: '0.85rem' }}>O envío individual (personalizado con {'{nombre}'}):</strong>
              {seleccionadas.slice(0, 50).map((r) => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '6px 10px' }}>
                  <span style={{ fontWeight: 600 }}>{r.nombre || r.email}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.email}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!asunto.trim() || !mensaje.trim()}
                    onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(r.email)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoIndividual(r))}`, '_blank')}
                    style={{ margin: 0, marginLeft: 'auto', padding: '2px 10px', minHeight: '28px', fontSize: '0.78rem', opacity: !asunto.trim() || !mensaje.trim() ? 0.5 : 1 }}
                  >
                    <Mail size={13} /> Gmail
                  </button>
                </div>
              ))}
              {seleccionadas.length > 50 && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>…mostrando 50 de {seleccionadas.length} (usá los tramos para el resto).</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
};
