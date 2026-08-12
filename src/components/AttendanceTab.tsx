import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { logAudit } from '../utils/audit';
import { downloadCSV } from '../utils/csv';
import { downloadExcel } from '../utils/excel';
import { formatDateAR } from '../utils/dateAR';
import { Download, Search, FileSpreadsheet, Calendar, UserCheck, ArrowUpDown, Trash2, FileText, Printer, Upload, Eye, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../img/logoCentro.png';

interface AttendanceTabProps {
  cursos: any[];
  fechas: any[];
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ cursos, fechas }) => {
  const [asistenciaCurso, setAsistenciaCurso] = useState('');
  const [asistenciaFecha, setAsistenciaFecha] = useState('');
  const [asistenciaPrograma, setAsistenciaPrograma] = useState('');
  const [fechaClase, setFechaClase] = useState('');
  const [asistenciaFechasFiltradas, setAsistenciaFechasFiltradas] = useState<any[]>([]);
  const [alumnosAsistencia, setAlumnosAsistencia] = useState<any[]>([]);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [loadingCompleto, setLoadingCompleto] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Informes PDF de docentes
  const [informes, setInformes] = useState<any[]>([]);
  const [informeView, setInformeView] = useState<any>(null);

  useEffect(() => {
    if (!asistenciaCurso || !asistenciaFecha) {
      setInformes([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, 'informes'),
        where('curso', '==', asistenciaCurso),
        where('fechaInicio', '==', asistenciaFecha)
      ),
      (snap) => {
        setInformes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Error leyendo informes:', err)
    );
    return unsub;
  }, [asistenciaCurso, asistenciaFecha]);

  const handleUploadInforme = async (file: File) => {
    if (!asistenciaCurso || !asistenciaFecha) {
      alert('Primero seleccione el curso y la fecha de inicio.');
      return;
    }
    if (file.type !== 'application/pdf') {
      alert('Por favor seleccione un archivo en formato PDF.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('El archivo PDF es demasiado grande. Seleccione un archivo menor a 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      try {
        const user = auth.currentUser;
        await addDoc(collection(db, 'informes'), {
          curso: asistenciaCurso,
          fechaInicio: asistenciaFecha,
          fileName: file.name,
          dataUrl: base64,
          uploadedBy: user?.email || '',
          uploadedByName: user?.displayName || user?.email || '',
          uploadedAt: new Date().toISOString()
        });
        await logAudit('Informe subido', `${asistenciaCurso} (${asistenciaFecha}) — ${file.name}`);
        alert('Informe del docente subido con éxito.');
      } catch (err) {
        console.error(err);
        alert('Error al subir el informe.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteInforme = async (info: any) => {
    if (!confirm(`¿Eliminar el informe "${info.fileName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'informes', info.id));
      await logAudit('Informe eliminado', `${asistenciaCurso} (${asistenciaFecha}) — ${info.fileName}`);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el informe.');
    }
  };

  const formatoFechaHora = (s: string) => {
    if (!s) return '—';
    try { return new Date(s).toLocaleString('es-AR'); } catch { return s; }
  };

  useEffect(() => {
    if (asistenciaCurso) {
      const courseObj = cursos.find(c => c.curso === asistenciaCurso);
      if (courseObj) {
        const filtered = fechas.filter(f => f.idCurso === courseObj.idCurso);
        setAsistenciaFechasFiltradas(filtered);
        if (filtered.length > 0) {
          setAsistenciaFecha(filtered[0].inicio || '');
        } else {
          setAsistenciaFecha('');
        }
      }
    } else {
      setAsistenciaFechasFiltradas([]);
      setAsistenciaFecha('');
    }
  }, [asistenciaCurso, cursos, fechas]);

  const searchAsistencia = async () => {
    if (!asistenciaCurso || !asistenciaFecha) return;
    setLoadingAsistencia(true);
    try {
      console.log('Querying inscripciones for:', { curso: asistenciaCurso, fechaInicio: asistenciaFecha });
      const q = query(
        collection(db, 'inscripciones'),
        where('curso', '==', asistenciaCurso),
        where('fechaInicio', '==', asistenciaFecha)
      );
      const snap = await getDocs(q);
      let list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      // Si ya se puso la fecha de Certificado (en FECHAS), pasarlos a Desaprobados si no están Aprobados
      const currentFechaObj = asistenciaFechasFiltradas.find(f => f.inicio === asistenciaFecha);
      if (currentFechaObj && currentFechaObj.certificado && currentFechaObj.certificado.trim() !== '') {
        const batch = writeBatch(db);
        let hasUpdates = false;

        list = list.map((alumno: any) => {
          if (alumno.resultado !== 'Aprobado' && alumno.resultado !== 'Desaprobado') {
            hasUpdates = true;
            batch.update(doc(db, 'inscripciones', alumno.id), { resultado: 'Desaprobado' });
            return { ...alumno, resultado: 'Desaprobado' };
          }
          return alumno;
        });

        if (hasUpdates) {
          await batch.commit();
        }
      }

      setAlumnosAsistencia(list);
    } catch (err) {
      console.error('Error fetching inscriptions:', err);
      if (err instanceof Error && (err as any).code === 'failed-precondition') {
        alert('Error: Falta un índice compuesto en Firestore. Revise la consola para más detalles.');
      } else {
        alert('Error al buscar alumnos.');
      }
    } finally {
      setLoadingAsistencia(false);
    }
  };

  const handleDeleteStudent = async (regId: string, nombreAlumno: string) => {
    if (!confirm(`¿Eliminar a ${nombreAlumno} de esta planilla de asistencia?`)) return;
    try {
      await deleteDoc(doc(db, 'inscripciones', regId));
      setAlumnosAsistencia(prev => prev.filter(a => a.id !== regId));
      alert('Alumno eliminado de la planilla con éxito.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar alumno de la planilla.');
    }
  };

  // Ordenar lista automáticamente por Apellido (A-Z)
  const sortedAlumnos = [...alumnosAsistencia].sort((a, b) => {
    const apA = (a.apellido || '').toLowerCase();
    const apB = (b.apellido || '').toLowerCase();
    if (apA < apB) return -1;
    if (apA > apB) return 1;
    const nomA = (a.nombre || '').toLowerCase();
    const nomB = (b.nombre || '').toLowerCase();
    if (nomA < nomB) return -1;
    if (nomA > nomB) return 1;
    return 0;
  });

  const downloadPlanilla = () => {
    if (sortedAlumnos.length === 0) return;

    const exportData = sortedAlumnos.map(a => ({
      apellido: a.apellido || '',
      nombre: a.nombre || '',
      dni: a.dni || '',
      firma: ''
    }));

    downloadCSV(
      exportData,
      ['Apellido', 'Nombre', 'DNI', 'Firma'],
      ['apellido', 'nombre', 'dni', 'firma'],
      `planilla_asistencia_${asistenciaCurso.replace(/\s+/g, '_')}_${asistenciaFecha}.csv`
    );
  };

  const downloadCompleto = async () => {
    if (sortedAlumnos.length === 0) return;
    setLoadingCompleto(true);
    try {
      const data = sortedAlumnos.map(a => ({
        apellido: a.apellido || '',
        nombre: a.nombre || '',
        dni: a.dni || '',
        firma: ''
      }));

      downloadExcel(
        data,
        ['Apellido', 'Nombre', 'DNI', 'Firma'],
        ['apellido', 'nombre', 'dni', 'firma'],
        `planilla_asistencia_${asistenciaCurso.replace(/\s+/g, '_')}_${asistenciaFecha}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert('Error al generar reporte completo.');
    } finally {
      setLoadingCompleto(false);
    }
  };

  // Exportar Planilla en PDF lista para imprimir
  const downloadPDF = () => {
    if (sortedAlumnos.length === 0) return;

    const doc = new jsPDF();

    // Agregar Logo institucional (67.3mm ancho x 16mm alto)
    try {
      doc.addImage(logoImg, 'PNG', 14, 6, 67.3, 16);
    } catch (e) {
      console.error('Error al agregar logo al PDF', e);
    }

    const marginX = 92;

    // Encabezado principal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('PLANILLA DE ASISTENCIA', marginX, 11.5);

    // Información del Curso
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(asistenciaCurso, marginX, 17.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Fecha Inicio: ${formatDateAR(asistenciaFecha)}`, marginX, 25.5);

    // Fecha de la Clase alineada a la derecha
    const fechaClaseText = fechaClase ? `Fecha de Clase: ${formatDateAR(fechaClase)}` : 'Fecha de Clase: ____________';
    doc.text(fechaClaseText, 196, 25.5, { align: 'right' });

    doc.setDrawColor(30, 78, 140);
    doc.setLineWidth(0.5);
    doc.line(14, 30.5, 196, 30.5);

    const tableColumn = ['N°', 'Apellido', 'Nombre', 'DNI', 'Firma (Asistencia)'];
    const tableRows = sortedAlumnos.map((item, index) => [
      index + 1,
      item.apellido || '',
      item.nombre || '',
      item.dni || '',
      '' // Columna vacía para la firma física
    ]);

    autoTable(doc, {
      startY: 34.5,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 78, 140], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 3.5 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 42 },
        3: { cellWidth: 30 },
        4: { cellWidth: 56 }
      }
    });

    const fileName = `planilla_asistencia_${asistenciaCurso.replace(/\s+/g, '_')}_${asistenciaFecha}.pdf`;
    doc.save(fileName);
  };

  const currentFechaObj = asistenciaFechasFiltradas.find(f => f.inicio === asistenciaFecha);

  return (
    <div>
      <h2 className="section-title">Planilla de Asistencia e Informe del Capacitador</h2>

      <div className="details-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '16px' }}>
        <div className="form-group">
          <label>Programa</label>
          <select className="form-control" value={asistenciaPrograma} onChange={e => { setAsistenciaPrograma(e.target.value); setAsistenciaCurso(''); setAsistenciaFecha(''); setAlumnosAsistencia([]); }}>
            <option value="">-- Todos los programas --</option>
            {[...new Set(cursos.map(c => c.programa?.trim() || 'Otros'))].sort().map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Seleccionar Curso</label>
          <select
            className="form-control"
            value={asistenciaCurso}
            onChange={e => setAsistenciaCurso(e.target.value)}
          >
            <option value="">-- Seleccione un Curso --</option>
            {cursos.filter(c => !asistenciaPrograma || (c.programa?.trim() || 'Otros') === asistenciaPrograma).map(c => (
              <option key={c.idCurso} value={c.curso}>{c.curso}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Fecha Inicio</label>
          <select
            className="form-control"
            value={asistenciaFecha}
            onChange={e => setAsistenciaFecha(e.target.value)}
            disabled={!asistenciaCurso}
          >
            <option value="">-- Seleccione Fecha --</option>
            {asistenciaFechasFiltradas.map((f, i) => (
              <option key={i} value={f.inicio}>{f.inicio}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button className="btn-primary" style={{ margin: 0, width: '165px', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={searchAsistencia}>
          <FileText size={16} /> Generar Planilla
        </button>
        {alumnosAsistencia.length > 0 && (
          <>
            <button
              className="btn-secondary"
              style={{ margin: 0, width: '165px', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={downloadPDF}
              title="Descargar Planilla en PDF para Imprimir"
            >
              <Printer size={16} /> Imprimir PDF
            </button>
            <button
              className="btn-secondary"
              style={{ margin: 0, width: '165px', padding: '10px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={downloadPlanilla}
              title="Exportar archivo CSV"
            >
              <Upload size={16} /> Exportar CSV
            </button>
          </>
        )}

        <label
          className="btn-secondary"
          style={{
            margin: 0,
            height: '42px',
            width: '165px',
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            borderColor: informes.length > 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.4)',
            background: informes.length > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.05)',
            color: informes.length > 0 ? 'var(--success)' : 'rgba(239, 68, 68, 0.85)'
          }}
        >
          <FileText size={16} color={informes.length > 0 ? 'var(--success)' : 'rgba(239, 68, 68, 0.85)'} />
          Informe Docente
          <input
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            disabled={!asistenciaCurso || !asistenciaFecha}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUploadInforme(file);
              e.target.value = '';
            }}
          />
        </label>

        {informes.map(info => (
          <div key={info.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={info.fileName}>
              {info.fileName}
            </span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0 6px', margin: 0, minHeight: '28px', minWidth: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setInformeView(info)}
              title="Ver informe PDF"
            >
              <Eye size={13} />
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ padding: '0 6px', margin: 0, minHeight: '28px', minWidth: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => handleDeleteInforme(info)}
              title="Eliminar informe"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal ver informe */}
      {informeView && (
        <div className="modal-overlay" onClick={() => setInformeView(null)}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                Informe del Docente
              </h3>
              <button className="modal-close" onClick={() => setInformeView(null)}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {informeView.fileName} — {asistenciaCurso} ({asistenciaFecha})
              </span>
              <a
                href={informeView.dataUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={informeView.fileName || 'Informe_docente.pdf'}
                className="btn-secondary"
                style={{ margin: 0, textDecoration: 'none', height: '40px' }}
              >
                <Download size={15} /> Descargar
              </a>
            </div>
            <iframe
              src={informeView.dataUrl}
              title="Vista previa del informe PDF"
              style={{ width: '100%', height: '65vh', border: '1px solid var(--border-card)', borderRadius: '8px', background: '#fff' }}
            />
          </div>
        </div>
      )}

      {loadingAsistencia && <div className="spinner"></div>}

      {sortedAlumnos.length > 0 && !loadingAsistencia && (
        <div style={{ marginTop: '20px' }}>
          <div className="details-box" style={{ marginBottom: '15px', background: 'rgba(30, 78, 140, 0.08)', border: '1px solid rgba(30, 78, 140, 0.3)', padding: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {asistenciaCurso}
              </h3>
              <div style={{ margin: '14px 0 0 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <span><strong>Fecha de Inicio:</strong> {formatDateAR(asistenciaFecha)}</span>

                  {currentFechaObj?.certificado ? (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      | Certificado: {formatDateAR(currentFechaObj.certificado)}
                    </span>
                  ) : null}
                </div>

                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Fecha de Clase: {fechaClase ? formatDateAR(fechaClase) : '______'}
                  </span>
                  <label title="Abrir calendario para elegir fecha de la clase" style={{ margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                    <Calendar size={18} color="var(--primary)" />
                    <input
                      type="date"
                      value={fechaClase}
                      onChange={e => setFechaClase(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                  </label>
                </span>
              </div>
            </div>
          </div>

          <div className="listbox-wrapper">
            <table className="listbox-table">
              <thead>
                <tr>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Apellido {sortOrder === 'asc' ? '▲' : '▼'}
                    </div>
                  </th>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Firma (Asistencia)</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedAlumnos.map(item => (
                  <tr key={item.id}>
                    <td data-label="Apellido" style={{ fontWeight: 600 }}>{item.apellido}</td>
                    <td data-label="Nombre">{item.nombre}</td>
                    <td data-label="DNI">{item.dni}</td>
                    <td data-label="Firma" style={{ minWidth: '160px' }}>
                      <span style={{ display: 'inline-block', width: '100%', borderBottom: '1px dashed var(--text-muted)', height: '24px' }}></span>
                    </td>
                    <td data-label="Acciones" style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ padding: '4px 8px', margin: 0, minHeight: '32px', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteStudent(item.id, `${item.apellido}, ${item.nombre}`)}
                        title="Eliminar de la planilla"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {alumnosAsistencia.length === 0 && !loadingAsistencia && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
          No hay inscriptos registrados para este curso en la fecha seleccionada.
        </p>
      )}
    </div>
  );
};


