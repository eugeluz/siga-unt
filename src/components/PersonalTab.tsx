import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocs, doc, setDoc, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { formatDateAR } from '../utils/dateAR';
import { Users, Printer, FileText, CheckSquare, RefreshCw, ClipboardCheck, History } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../img/logoCentro.png';

const MOTIVOS_FALTA = [
  'Familiar enfermo',
  'Lic. Enfermedad',
  'Paro Administrativo',
  'Paro Gral. Tpte.',
  'Razones particulares',
  'Rendir Examen',
  'Vacaciones'
];

const calcularDiasCorridos = (desdeStr: string, hastaStr: string): number => {
  if (!desdeStr || !hastaStr) return 1;
  const d1 = new Date(desdeStr + 'T00:00:00');
  const d2 = new Date(hastaStr + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : 1;
};

export const PersonalTab: React.FC = () => {
  const [personalList, setPersonalList] = useState<any[]>([]);
  const [selectedPersonal, setSelectedPersonal] = useState<any[]>([]);
  const [fechaPlanilla, setFechaPlanilla] = useState(new Date().toISOString().split('T')[0]);
  const [motivosSeleccionados, setMotivosSeleccionados] = useState<Record<string, string>>({}); // dni -> motivo
  const [turnoTarde, setTurnoTarde] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Cargar lista de Personal (usuarios registrados en la colección 'usuarios')
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'usuarios'), (snap) => {
      const list = snap.docs
        .map(d => ({
          id: d.id,
          legajo: d.data().legajo || d.data().dni || '—', // Legajo fallback a DNI
          ...d.data()
        } as any))
        .filter((u: any) => !(u.email || '').toLowerCase().includes('mesa')); // Excluir usuario mesa

      // Ordenar alfabéticamente por Nombre/Apellido
      list.sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
      setPersonalList(list);
    }, (err) => console.error('Error leyendo personal:', err));
    return unsub;
  }, []);

  // Cargar licencias/faltas guardadas para la fecha seleccionada 'fechaPlanilla'
  useEffect(() => {
    if (!fechaPlanilla) return;
    const q = query(collection(db, 'licencias_personal'), limit(150));
    const unsub = onSnapshot(q, (snap) => {
      const dailyMap: Record<string, string> = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Verificar si la fecha seleccionada 'fechaPlanilla' cae dentro del rango de la licencia o coincide
        const targetDate = new Date(fechaPlanilla + 'T00:00:00');
        const desdeDate = new Date(data.desde + 'T00:00:00');
        const hastaDate = new Date(data.hasta + 'T00:00:00');
        
        if (targetDate >= desdeDate && targetDate <= hastaDate) {
          if (data.motivo === 'Razones particulares') {
            dailyMap[data.userId] = `${data.motivo} (Fecha: ${formatDateAR(data.fechaParticular)})`;
          } else {
            dailyMap[data.userId] = `${data.motivo} (Desde: ${formatDateAR(data.desde)} Hasta: ${formatDateAR(data.hasta)} - ${data.dias} días)`;
          }
        }
      });
      setMotivosSeleccionados(dailyMap);
    }, (err) => console.error('Error cargando licencias:', err));
    return unsub;
  }, [fechaPlanilla]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPersonal([...personalList]);
    } else {
      setSelectedPersonal([]);
    }
  };

  const handleSelectOne = (person: any, checked: boolean) => {
    if (checked) {
      setSelectedPersonal(prev => [...prev, person]);
    } else {
      setSelectedPersonal(prev => prev.filter(p => p.id !== person.id));
    }
  };

  const [showFaltaModal, setShowFaltaModal] = useState(false);
  const [faltaForm, setFaltaForm] = useState({
    userId: '',
    motivo: '',
    fechaParticular: new Date().toISOString().split('T')[0],
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
    dias: '1'
  });

  const handleDesdeChange = (newDesde: string) => {
    const newHasta = faltaForm.hasta < newDesde ? newDesde : faltaForm.hasta;
    const computedDias = calcularDiasCorridos(newDesde, newHasta);
    setFaltaForm(prev => ({
      ...prev,
      desde: newDesde,
      hasta: newHasta,
      dias: String(computedDias)
    }));
  };

  const handleHastaChange = (newHasta: string) => {
    const computedDias = calcularDiasCorridos(faltaForm.desde, newHasta);
    setFaltaForm(prev => ({
      ...prev,
      hasta: newHasta,
      dias: String(computedDias)
    }));
  };

  const handleConfirmFalta = async () => {
    if (!faltaForm.userId || !faltaForm.motivo) {
      alert('Seleccione un empleado y un motivo.');
      return;
    }

    const selectedPerson = personalList.find(p => p.id === faltaForm.userId);
    if (!selectedPerson) return;

    // Calcular el rango dependiendo del motivo
    const desdeVal = faltaForm.motivo === 'Razones particulares' ? faltaForm.fechaParticular : faltaForm.desde;
    const hastaVal = faltaForm.motivo === 'Razones particulares' ? faltaForm.fechaParticular : faltaForm.hasta;
    const diasVal = faltaForm.motivo === 'Razones particulares' ? '1' : faltaForm.dias;

    try {
      // Guardar la falta de forma persistente en Firestore
      const idUnicoFalta = `${faltaForm.userId}_${desdeVal}_${Date.now()}`;
      await setDoc(doc(db, 'licencias_personal', idUnicoFalta), {
        userId: faltaForm.userId,
        nombre: selectedPerson.nombre || selectedPerson.email,
        motivo: faltaForm.motivo,
        fechaParticular: faltaForm.fechaParticular,
        desde: desdeVal,
        hasta: hastaVal,
        dias: Number(diasVal),
        registradoAt: new Date().toISOString()
      });

      await logAudit(
        'Falta registrada', 
        `${selectedPerson.nombre || selectedPerson.email} — Motivo: ${faltaForm.motivo} (Desde: ${desdeVal} Hasta: ${hastaVal})`
      );

      alert('Falta registrada con éxito.');
      setShowFaltaModal(false);
      
      // Reset form
      setFaltaForm({
        userId: '',
        motivo: '',
        fechaParticular: new Date().toISOString().split('T')[0],
        desde: new Date().toISOString().split('T')[0],
        hasta: new Date().toISOString().split('T')[0],
        dias: '1'
      });
    } catch (err) {
      console.error('Error al registrar falta en Firebase:', err);
      alert('Error al registrar la falta.');
    }
  };

  const handleQuitarFalta = async (userId: string) => {
    if (!confirm('¿Desea quitar esta falta registrada del sistema?')) return;
    try {
      // Para quitarla, buscamos las licencias guardadas de este empleado que coincidan con la fecha actual de la planilla
      const q = query(
        collection(db, 'licencias_personal'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const targetDate = new Date(fechaPlanilla + 'T00:00:00');
      
      for (const d of snap.docs) {
        const data = d.data();
        const desdeDate = new Date(data.desde + 'T00:00:00');
        const hastaDate = new Date(data.hasta + 'T00:00:00');
        if (targetDate >= desdeDate && targetDate <= hastaDate) {
          // Eliminar de Firebase
          await deleteDoc(doc(db, 'licencias_personal', d.id));
        }
      }
      
      const personObj = personalList.find(p => p.id === userId);
      await logAudit('Falta eliminada', `${personObj?.nombre || userId} en fecha ${fechaPlanilla}`);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la falta.');
    }
  };

  const downloadPDF = () => {
    if (personalList.length === 0) {
      alert('No hay personal registrado para generar la planilla.');
      return;
    }

    const doc = new jsPDF();

    // Agregar Logo institucional
    try {
      doc.addImage(logoImg, 'PNG', 14, 6, 67.3, 16);
    } catch (e) {
      console.warn('Logo image could not be loaded into PDF:', e);
    }

    // Cabecera del PDF
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PLANILLA DE ASISTENCIA', 14, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    // 196 es el margen derecho estándar en un doc A4 de jsPDF (con 14 de margen izquierdo)
    doc.text(`Fecha: ${formatDateAR(fechaPlanilla)}`, 196, 30, { align: 'right' });

    // Preparar filas de la tabla con todo el personal (personalList ya viene ordenado por nombre/apellido)
    const bodyRows = personalList.map((p, idx) => {
      const isTurnoTarde = !!turnoTarde[p.id];
      return [
        idx + 1,
        p.nombre || p.email,
        p.legajo,
        isTurnoTarde ? 'TURNO TARDE' : '', // Si está en turno tarde poner TURNO TARDE, si no vacío
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [['Nro.', 'Apellido y Nombre', 'Legajo', 'Firma / Observación']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 62, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 89 }
      }
    });

    // Sección de Turno Tarde después de la tabla principal
    const tardePeople = personalList.filter(p => !!turnoTarde[p.id]);
    if (tardePeople.length > 0) {
      let startY = (doc as any).lastAutoTable?.finalY || 150;
      startY += 10;

      // Verificar si cabe en la página actual o crear una nueva
      if (startY + (tardePeople.length * 12) + 25 > 280) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 78, 140);
      doc.text('TURNO TARDE - REGISTRO DE FIRMAS', 14, startY);

      const tardeRows = tardePeople.map((p, idx) => [
        idx + 1,
        p.nombre || p.email,
        p.legajo,
        '' // Espacio libre para la firma física del Turno Tarde
      ]);

      autoTable(doc, {
        startY: startY + 4,
        head: [['Nro.', 'Apellido y Nombre', 'Legajo', 'Firma (Turno Tarde)']],
        body: tardeRows,
        theme: 'grid',
        headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 62, fontStyle: 'bold' },
          2: { cellWidth: 26 },
          3: { cellWidth: 89 }
        }
      });
    }

    const fileName = `AP_${fechaPlanilla}.pdf`;
    doc.save(fileName);
    logAudit('Planilla de personal impresa', `Fecha: ${fechaPlanilla} - ${personalList.length} personas`);
  };

  const [auditoria, setAuditoria] = useState<any[]>([]);

  const loadAuditoria = async () => {
    try {
      const q = query(collection(db, 'auditoria'), orderBy('fecha', 'desc'), limit(200));
      const snap = await getDocs(q);
      setAuditoria(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error leyendo auditoría:', err);
    }
  };

  useEffect(() => {
    loadAuditoria();
  }, []);

  const formatFecha = (f: any) => {
    if (!f) return '—';
    if (typeof f === 'string') return new Date(f).toLocaleString('es-AR');
    if (f.toDate) return f.toDate().toLocaleString('es-AR');
    return '—';
  };

  const [historialUser, setHistorialUser] = useState<any>(null);
  const [historialList, setHistorialList] = useState<any[]>([]);

  const handleVerHistorial = async (person: any) => {
    try {
      const q = query(
        collection(db, 'licencias_personal'),
        where('userId', '==', person.id)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Ordenar por fecha 'desde' más reciente
      list.sort((a: any, b: any) => (b.desde || '').localeCompare(a.desde || ''));
      setHistorialList(list);
      setHistorialUser(person);
    } catch (err) {
      console.error('Error cargando historial:', err);
      alert('Error al cargar el historial.');
    }
  };

  const handleEliminarHistorialFalta = async (faltaId: string) => {
    if (!confirm('¿Desea eliminar este registro de falta del historial permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'licencias_personal', faltaId));
      setHistorialList(prev => prev.filter(item => item.id !== faltaId));
      // Forzar recarga del mapa diario
      setFechaPlanilla(prev => prev);
      alert('Registro eliminado.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar.');
    }
  };

  return (
    <div>
      <h2 className="section-title">
        <Users size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Asistencia de Personal
      </h2>

      <div className="details-box" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, width: '180px', flexShrink: 0 }}>
            <label style={{ fontWeight: 600 }}>Fecha de Asistencia</label>
            <input
              type="date"
              className="form-control"
              value={fechaPlanilla}
              onChange={e => setFechaPlanilla(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            style={{ margin: 0, height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '165px', flexShrink: 0 }}
            onClick={downloadPDF}
            disabled={personalList.length === 0}
          >
            <Printer size={16} /> Imprimir Planilla
          </button>
          <button
            className="btn-secondary"
            style={{ margin: 0, height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'var(--accent)', color: 'var(--accent)', width: '165px', flexShrink: 0 }}
            onClick={() => setShowFaltaModal(true)}
          >
            <ClipboardCheck size={16} /> Registrar Falta
          </button>
        </div>
      </div>

      <div className="listbox-wrapper" style={{ marginBottom: '30px' }}>
        <table className="listbox-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>N°</th>
              <th>Nombre y Apellido</th>
              <th>Legajo / Email</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Turno Tarde</th>
              <th>Razón de Inasistencia (Opcional)</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Historial</th>
            </tr>
          </thead>
          <tbody>
            {personalList.map((p, idx) => {
              return (
                <tr key={p.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                  <td data-label="Nombre" style={{ fontWeight: 600 }}>{p.nombre || '—'}</td>
                  <td data-label="Legajo / Email">
                    <div style={{ fontSize: '0.85rem' }}>Legajo: {p.legajo || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.email}</div>
                  </td>
                  <td data-label="Turno Tarde" style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!turnoTarde[p.id]}
                      onChange={e => setTurnoTarde(prev => ({ ...prev, [p.id]: e.target.checked }))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      title="Marcar si esta persona asiste en Turno Tarde"
                    />
                  </td>
                  <td data-label="Observaciones" style={{ fontWeight: 500, color: motivosSeleccionados[p.id] ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {motivosSeleccionados[p.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Ausente: {motivosSeleccionados[p.id]}</span>
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }} 
                          onClick={() => handleQuitarFalta(p.id)}
                          title="Quitar falta"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Presente / Firma manual</span>
                    )}
                  </td>
                  <td data-label="Historial" style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 8px', minHeight: '28px', fontSize: '0.75rem', margin: 0 }}
                      onClick={() => handleVerHistorial(p)}
                      title="Ver Historial de Faltas y Licencias"
                    >
                      <History size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {personalList.length === 0 && (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay personal registrado.
          </p>
        )}
      </div>

      {/* Modal Registrar Falta */}
      {showFaltaModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, overflowY: 'auto', paddingTop: '40px', paddingBottom: '40px' }} onClick={() => setShowFaltaModal(false)}>
          <div className="modal-card" style={{ maxWidth: '680px', width: '90%', background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', marginBottom: '20px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Registrar Falta Detallada</h3>
              <button className="modal-close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowFaltaModal(false)}>×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Campos principales en una línea lado a lado */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Seleccionar Empleado *</label>
                  <select 
                    className="form-control" 
                    value={faltaForm.userId}
                    onChange={e => setFaltaForm(prev => ({ ...prev, userId: e.target.value }))}
                  >
                    <option value="">-- Seleccionar Empleado --</option>
                    {personalList.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre || p.email}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Motivo de la Inasistencia *</label>
                  <select 
                    className="form-control" 
                    value={faltaForm.motivo}
                    onChange={e => setFaltaForm(prev => ({ ...prev, motivo: e.target.value }))}
                  >
                    <option value="">-- Seleccionar Motivo --</option>
                    {MOTIVOS_FALTA.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Razón Particular: Mostrar Fecha única */}
              {faltaForm.motivo === 'Razones particulares' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Fecha de la Falta *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={faltaForm.fechaParticular}
                    onChange={e => setFaltaForm(prev => ({ ...prev, fechaParticular: e.target.value }))}
                  />
                </div>
              )}

              {/* Licencia o Artículos: Mostrar Rango y días en una sola fila */}
              {faltaForm.motivo && faltaForm.motivo !== 'Razones particulares' && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Desde *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={faltaForm.desde}
                      onChange={e => handleDesdeChange(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Hasta *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={faltaForm.hasta}
                      onChange={e => handleHastaChange(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: '1 1 100px' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cantidad de días *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="1"
                      value={faltaForm.dias}
                      onChange={e => setFaltaForm(prev => ({ ...prev, dias: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ margin: 0 }} onClick={() => setShowFaltaModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{ margin: 0 }} onClick={handleConfirmFalta}>Confirmar Falta</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Historial de Faltas */}
      {historialUser && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, overflowY: 'auto', paddingTop: '40px', paddingBottom: '40px' }} onClick={() => setHistorialUser(null)}>
          <div className="modal-card" style={{ maxWidth: '780px', width: '95%', background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', marginBottom: '20px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Historial de Licencias e Inasistencias</h3>
              <button className="modal-close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setHistorialUser(null)}>×</button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              Empleado: <strong>{historialUser.nombre || historialUser.email}</strong> (Legajo: {historialUser.legajo})
            </div>

            {(() => {
              const resumenMotivos = historialList.reduce((acc: Record<string, number>, item: any) => {
                const m = item.motivo || 'Otros';
                const count = Number(item.dias) || 1;
                acc[m] = (acc[m] || 0) + count;
                return acc;
              }, {});
              const totalDiasInasistencias = Object.values(resumenMotivos).reduce((a, b) => a + b, 0);

              return (
                <div style={{ marginBottom: '18px', padding: '14px 16px', background: 'rgba(30, 78, 140, 0.06)', borderRadius: '8px', border: '1px solid rgba(30, 78, 140, 0.2)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', fontSize: '0.95rem' }}>
                    Total Inasistencias Acumuladas: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{totalDiasInasistencias} día{totalDiasInasistencias !== 1 ? 's' : ''}</span>
                  </div>
                  {Object.keys(resumenMotivos).length > 0 ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {Object.entries(resumenMotivos).map(([motivo, total]) => (
                        <div key={motivo} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{motivo}:</strong>{' '}
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{total}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sin inasistencias registradas.</span>
                  )}
                </div>
              );
            })()}

            <div className="listbox-wrapper" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="listbox-table">
                <thead>
                  <tr>
                    <th>Motivo / Artículo</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Días</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historialList.map(item => (
                    <tr key={item.id}>
                      <td data-label="Motivo" style={{ fontWeight: 600 }}>{item.motivo}</td>
                      <td data-label="Desde">{formatDateAR(item.desde)}</td>
                      <td data-label="Hasta">{formatDateAR(item.hasta)}</td>
                      <td data-label="Días" style={{ textAlign: 'center' }}>{item.dias}</td>
                      <td data-label="Acción" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-danger"
                          style={{ padding: '4px 8px', minHeight: '28px', fontSize: '0.75rem', margin: 0 }}
                          onClick={() => handleEliminarHistorialFalta(item.id)}
                          title="Eliminar falta del registro histórico"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historialList.length === 0 && (
                <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No se encontraron inasistencias registradas históricamente para este empleado.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" style={{ margin: 0 }} onClick={() => setHistorialUser(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
