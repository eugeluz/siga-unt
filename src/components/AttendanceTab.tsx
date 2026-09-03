import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, writeBatch, addDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { logAudit } from '../utils/audit';
import { downloadCSV } from '../utils/csv';
import { downloadExcel } from '../utils/excel';
import { formatDateAR } from '../utils/dateAR';
import { Download, Search, FileSpreadsheet, Calendar, UserCheck, ArrowUpDown, Trash2, FileText, Printer, Upload, Eye, X, MessageSquare, AlertCircle, CheckCircle2, HelpCircle, Check, FileCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../img/logoCentro.png';
import { useModal } from './ModalProvider';
import { generateConstanciaAsistenciaPDF } from '../utils/constanciaPDF';

interface AttendanceTabProps {
  cursos: any[];
  fechas: any[];
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ cursos, fechas }) => {
  const { confirm, alert } = useModal();
  const [asistenciaCurso, setAsistenciaCurso] = useState('');
  const [asistenciaFecha, setAsistenciaFecha] = useState('');
  const [asistenciaPrograma, setAsistenciaPrograma] = useState('');
  const [fechaClase, setFechaClase] = useState('');
  const [asistenciaFechasFiltradas, setAsistenciaFechasFiltradas] = useState<any[]>([]);
  const [alumnosAsistencia, setAlumnosAsistencia] = useState<any[]>([]);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [loadingCompleto, setLoadingCompleto] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Control de Clases Dictadas y Fechas de clases (guardadas en el doc de fecha)
  const [clasesDictadas, setClasesDictadas] = useState<Record<number, boolean>>({});
  const [fechasClases, setFechasClases] = useState<Record<number, string>>({});
  const [certificadoFecha, setCertificadoFecha] = useState('');
  const [cursoCerrado, setCursoCerrado] = useState(false);
  const [asistenciaPanel, setAsistenciaPanel] = useState<'generar' | 'cerrar' | null>(null);

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
      await alert({ title: 'Selección incompleta', message: 'Primero seleccione el curso y la fecha de inicio.', variant: 'warning' });
      return;
    }
    if (file.type !== 'application/pdf') {
      await alert({ title: 'Archivo inválido', message: 'Por favor seleccione un archivo en formato PDF.', variant: 'warning' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      await alert({ title: 'Archivo demasiado grande', message: 'El archivo PDF es demasiado grande. Seleccione un archivo menor a 3MB.', variant: 'warning' });
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
        await alert({ title: 'Informe subido', message: 'Informe del docente subido con éxito.', variant: 'success' });
      } catch (err) {
        console.error(err);
        await alert({ title: 'Error', message: 'No se pudo subir el informe. Intente nuevamente.', variant: 'danger' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteInforme = async (info: any) => {
    const confirmed = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar el informe "${info.fileName}"?\n\nEsta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'informes', info.id));
      await logAudit('Informe eliminado', `${asistenciaCurso} (${asistenciaFecha}) — ${info.fileName}`);
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo eliminar el informe. Intente nuevamente.', variant: 'danger' });
    }
  };

  useEffect(() => {
    if (asistenciaCurso) {
      const courseObj = cursos.find(c => (c.nombreCompleto || c.curso) === asistenciaCurso);
      if (courseObj) {
        const filtered = fechas.filter(f => String(f.idCurso) === String(courseObj.idCurso));
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

  const currentFechaObj = asistenciaFechasFiltradas.find(f => f.inicio === asistenciaFecha);
  const totalClases = currentFechaObj?.cantidadClases ? Number(currentFechaObj.cantidadClases) : 4;

  useEffect(() => {
    if (currentFechaObj && currentFechaObj.clasesDictadas) setClasesDictadas(currentFechaObj.clasesDictadas); else setClasesDictadas({});
    if (currentFechaObj && currentFechaObj.fechasClases) setFechasClases(currentFechaObj.fechasClases); else setFechasClases({});
    if (currentFechaObj) { setCertificadoFecha(currentFechaObj.certificado || ''); setCursoCerrado(!!currentFechaObj.cerrado); } else { setCertificadoFecha(''); setCursoCerrado(false); }
  }, [currentFechaObj]);

  const handleCertificadoChange = async (newVal: string) => {
    setCertificadoFecha(newVal);
    if (currentFechaObj?.id) await updateDoc(doc(db, 'fechas', currentFechaObj.id), { certificado: newVal });
  };
  const handleToggleCerrado = async (val: boolean) => {
    setCursoCerrado(val);
    if (currentFechaObj?.id) await updateDoc(doc(db, 'fechas', currentFechaObj.id), { cerrado: val });
    if (val && alumnosAsistencia.length === 0) {
      await searchAsistencia();
    }
  };

  const handleFechaClaseChange = async (numClase: number, newFecha: string) => {
    const nextFechas = { ...fechasClases, [numClase]: newFecha };
    if (!newFecha) {
      delete nextFechas[numClase];
    }
    setFechasClases(nextFechas);

    const isDictada = Boolean(newFecha);
    const nextDictadas = { ...clasesDictadas, [numClase]: isDictada };
    setClasesDictadas(nextDictadas);

    if (currentFechaObj && currentFechaObj.id) {
      try {
        await updateDoc(doc(db, 'fechas', currentFechaObj.id), {
          fechasClases: nextFechas,
          clasesDictadas: nextDictadas
        });
      } catch (e) {
        console.error('Error guardando fecha de clase:', e);
      }
    }
  };

  const handleToggleClaseDictada = async (numClase: number) => {
    const nextState = { ...clasesDictadas, [numClase]: !clasesDictadas[numClase] };
    setClasesDictadas(nextState);

    if (currentFechaObj && currentFechaObj.id) {
      try {
        await updateDoc(doc(db, 'fechas', currentFechaObj.id), {
          clasesDictadas: nextState
        });
      } catch (e) {
        console.error('Error guardando estado de clase dictada:', e);
      }
    }
  };

  const searchAsistencia = async () => {
    if (!asistenciaCurso || !asistenciaFecha) return;
    setLoadingAsistencia(true);
    try {
      console.log('Querying inscripciones for:', { curso: asistenciaCurso, fechaInicio: asistenciaFecha });
      const courseObjForQuery = cursos.find(c => (c.nombreCompleto || c.curso) === asistenciaCurso);
      const q = query(
        collection(db, 'inscripciones'),
        where('curso', '==', asistenciaCurso),
        where('fechaInicio', '==', asistenciaFecha)
      );
      let snap = await getDocs(q);
      if (snap.empty && courseObjForQuery && courseObjForQuery.curso && courseObjForQuery.curso !== asistenciaCurso) {
        const qAlt = query(
          collection(db, 'inscripciones'),
          where('curso', '==', courseObjForQuery.curso),
          where('fechaInicio', '==', asistenciaFecha)
        );
        const snapAlt = await getDocs(qAlt);
        if (!snapAlt.empty) snap = snapAlt;
      }
      let list = await Promise.all(
        snap.docs.map(async docSnap => {
          const data: any = docSnap.data();
          let tel = data.telPart || data.telLab || '';

          // Si no tiene teléfono en inscripción, buscarlo en la colección 'alumnos'
          if (!tel && data.dni) {
            try {
              const alSnap = await getDoc(doc(db, 'alumnos', String(data.dni)));
              if (alSnap.exists()) {
                const alData = alSnap.data();
                tel = alData.telPart || alData.telLab || '';
              }
            } catch (err) {
              // ignore
            }
          }

          return {
            id: docSnap.id,
            ...data,
            telefono: tel,
            asistencias: data.asistencias || {}
          };
        })
      );

      // Si ya se puso la fecha de Certificado (en FECHAS), pasarlos a Desaprobados si no están Aprobados
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
        await alert({ title: 'Error de configuración', message: 'Falta un índice compuesto en Firestore. Revise la consola para más detalles.', variant: 'danger' });
      } else {
        await alert({ title: 'Error', message: 'No se pudieron buscar los alumnos. Intente nuevamente.', variant: 'danger' });
      }
    } finally {
      setLoadingAsistencia(false);
    }
  };

  const handleToggleAlumnoAsistencia = async (alumnoId: string, numClase: number) => {
    const targetAlumno = alumnosAsistencia.find(a => a.id === alumnoId);
    if (!targetAlumno) return;

    const currentAsistencias = targetAlumno.asistencias || {};
    const newAsistencias = {
      ...currentAsistencias,
      [numClase]: !currentAsistencias[numClase]
    };

    // Actualizar estado local
    setAlumnosAsistencia(prev =>
      prev.map(a => a.id === alumnoId ? { ...a, asistencias: newAsistencias } : a)
    );

    // Persistir en Firestore
    try {
      await updateDoc(doc(db, 'inscripciones', alumnoId), {
        asistencias: newAsistencias
      });
    } catch (err) {
      console.error('Error guardando asistencia de alumno:', err);
    }
  };

  const handleDeleteStudent = async (regId: string, nombreAlumno: string) => {
    const confirmed = await confirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar a ${nombreAlumno} de esta planilla de asistencia?\n\nEl alumno será quitado del curso y esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'inscripciones', regId));
      setAlumnosAsistencia(prev => prev.filter(a => a.id !== regId));
      await alert({ title: 'Alumno eliminado', message: 'Alumno eliminado de la planilla con éxito.', variant: 'success' });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo eliminar al alumno de la planilla. Intente nuevamente.', variant: 'danger' });
    }
  };

  const handleResultadoChange = async (regId: string, newResultado: string) => {
    try {
      await updateDoc(doc(db, 'inscripciones', regId), { resultado: newResultado });
      setAlumnosAsistencia(prev => prev.map(a => a.id === regId ? { ...a, resultado: newResultado } : a));
    } catch (err) {
      console.error('Error al actualizar la condición:', err);
      await alert({ title: 'Error', message: 'No se pudo actualizar la condición del alumno. Intente nuevamente.', variant: 'danger' });
    }
  };

  // Calcular inasistencias en clases que fueron dictadas
  const calcularInasistenciasDictadas = (alumno: any) => {
    let inasistencias = 0;
    for (let c = 1; c <= totalClases; c++) {
      const isDictada = Boolean(fechasClases[c] || clasesDictadas[c]);
      if (isDictada) {
        // La clase fue dictada (con fecha o marcada): si el alumno no tiene true en asistencias, es inasistencia
        if (!alumno.asistencias?.[c]) {
          inasistencias++;
        }
      }
    }
    return inasistencias;
  };

  const handleSendWhatsApp = (alumno: any) => {
    let cleanPhone = (alumno.telefono || '').replace(/\D/g, '');
    if (!cleanPhone) {
      const promptPhone = prompt(`El alumno ${alumno.nombre} ${alumno.apellido} no tiene teléfono registrado. Ingrese el número (ej: 3816406055):`);
      if (!promptPhone) return;
      cleanPhone = promptPhone.replace(/\D/g, '');
    }

    // Asegurar prefijo de Argentina si es número local
    let finalPhone = cleanPhone;
    if (finalPhone.length === 10) {
      finalPhone = `549${finalPhone}`;
    } else if (finalPhone.startsWith('54') && !finalPhone.startsWith('549') && finalPhone.length === 12) {
      finalPhone = `549${finalPhone.slice(2)}`;
    }

    const mensaje = encodeURIComponent(
      `Hola ${alumno.nombre || ''}, te escribimos del Centro de Capacitación UNT respecto al curso "${asistenciaCurso}". Notamos que registras 2 inasistencias a las clases y queríamos consultarte por qué dejaste de asistir o si tuviste algún inconveniente.`
    );

    const waUrl = `https://wa.me/${finalPhone}?text=${mensaje}`;
    window.open(waUrl, '_blank');
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

    const exportData = sortedAlumnos.map(a => {
      let presentesCount = 0;
      for (let c = 1; c <= totalClases; c++) {
        if (a.asistencias?.[c]) presentesCount++;
      }
      const porcentaje = totalClases > 0 ? Math.round((presentesCount / totalClases) * 100) : 0;

      const rowObj: any = {
        apellido: a.apellido || '',
        nombre: a.nombre || '',
        dni: a.dni || ''
      };

      for (let c = 1; c <= totalClases; c++) {
        rowObj[`clase_${c}`] = a.asistencias?.[c] ? 'P' : 'A';
      }

      rowObj.porcentaje = `${porcentaje}%`;
      rowObj.condicion = a.resultado || 'Cursando';

      return rowObj;
    });

    const headers = [
      'Apellido',
      'Nombre',
      'DNI',
      ...Array.from({ length: totalClases }, (_, i) => {
        const num = i + 1;
        const f = fechasClases[num];
        return f ? `C${num} (${formatDateAR(f)})` : `C${num}`;
      }),
      '% Asistencia',
      'Condición'
    ];
    const keys = [
      'apellido',
      'nombre',
      'dni',
      ...Array.from({ length: totalClases }, (_, i) => `clase_${i + 1}`),
      'porcentaje',
      'condicion'
    ];

    downloadExcel(
      exportData,
      headers,
      keys,
      `AC_${asistenciaCurso.replace(/\s+/g, '_')}_${asistenciaFecha}.xlsx`
    );
  };

  // Exportar Planilla formato Certificados (solo alumnos Aprobados)
  const downloadPlanillaCertificados = async () => {
    if (!asistenciaCurso || !asistenciaFecha) {
      await alert({ title: 'Selección incompleta', message: 'Primero seleccione el curso y la fecha de inicio.', variant: 'warning' });
      return;
    }
    if (alumnosAsistencia.length === 0) {
      await alert({ title: 'Planilla vacía', message: 'La planilla de asistencia está vacía.', variant: 'info' });
      return;
    }

    // Filtrar solo los alumnos cuya condición sea Aprobado
    const aprobados = alumnosAsistencia.filter(a => {
      const cond = (a.resultado || a.condicion || '').trim().toLowerCase();
      return cond === 'aprobado' || cond === 'aprobada';
    });

    if (aprobados.length === 0) {
      await alert({ title: 'Sin aprobados', message: 'No hay ningún alumno con condición "Aprobado" para exportar.', variant: 'info' });
      return;
    }

    const cursoObj = cursos.find(c => (c.nombreCompleto || c.curso) === asistenciaCurso);
    const nombreCursoExport = cursoObj?.nombreCompleto?.trim() ? cursoObj.nombreCompleto.trim() : asistenciaCurso;
    const rowsWithEmail = await Promise.all(
      aprobados.map(async (a) => {
        let emailVal = a.email || '';
        let apellidoVal = a.apellido || '';
        let nombreVal = a.nombre || '';
        let dniVal = a.dni || '';

        if (!emailVal && dniVal) {
          try {
            const snap = await getDoc(doc(db, 'alumnos', String(dniVal)));
            if (snap.exists()) {
              const sData = snap.data();
              emailVal = sData.email || '';
              if (!apellidoVal) apellidoVal = sData.apellido || '';
              if (!nombreVal) nombreVal = sData.nombre || '';
            }
          } catch (e) {
            // ignore
          }
        }

        return {
          email: emailVal,
          apellido: apellidoVal,
          nombre: nombreVal,
          dni: dniVal,
          curso: nombreCursoExport,
          periodo: '',
          Enviado: ''
        };
      })
    );

    const headers = ['email', 'apellido', 'nombre', 'dni', 'curso', 'periodo', 'Enviado'];
    const keys = ['email', 'apellido', 'nombre', 'dni', 'curso', 'periodo', 'Enviado'];
    const filename = `aprobados_${nombreCursoExport.replace(/[^a-zA-Z0-9]/g, '_')}_${asistenciaFecha}.xlsx`;

    downloadExcel(rowsWithEmail, headers, keys, filename);
    await logAudit('Exportación Aprobados Drive', `${nombreCursoExport} (${asistenciaFecha}) — ${rowsWithEmail.length} alumnos aprobados`);
  };

  // Exportar Planilla en PDF lista para imprimir (formato físico de firmas)
  const downloadPDF = async () => {
    if (sortedAlumnos.length === 0) return;

    if (!fechaClase) {
      await alert({ title: 'Fecha requerida', message: 'Por favor ingrese la "Fecha de Clase" antes de imprimir el PDF.', variant: 'warning' });
      return;
    }

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

    const fileName = `AC_${asistenciaCurso.replace(/\s+/g, '_')}_${asistenciaFecha}.pdf`;
    doc.save(fileName);
  };

  return (
    <div>
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
              <option key={c.idCurso} value={c.nombreCompleto || c.curso}>{c.nombreCompleto || c.curso}</option>
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
              <option key={i} value={f.inicio}>
                {formatDateAR(f.inicio)} ({f.cantidadClases || 4} clases)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button onClick={async () => { const next = asistenciaPanel === 'generar' ? null : 'generar'; setAsistenciaPanel(next); if (next === 'generar') await searchAsistencia(); }} disabled={!asistenciaCurso || !asistenciaFecha} className={asistenciaPanel === 'generar' ? 'btn-primary' : 'btn-secondary'} style={{ flex: '1 1 0', height: '42px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, boxSizing: 'border-box', borderWidth: '1px', margin: 0, transform: 'none', boxShadow: 'none', verticalAlign: 'middle', lineHeight: 1, opacity: (!asistenciaCurso || !asistenciaFecha) ? 0.5 : 1, cursor: (!asistenciaCurso || !asistenciaFecha) ? 'not-allowed' : 'pointer' }}><FileText size={16} /> Generar planilla</button>
        <button onClick={async () => { const next = asistenciaPanel === 'cerrar' ? null : 'cerrar'; setAsistenciaPanel(next); if (next === 'cerrar') await searchAsistencia(); }} disabled={!asistenciaCurso || !asistenciaFecha} className={asistenciaPanel === 'cerrar' ? 'btn-primary' : 'btn-secondary'} style={{ flex: '1 1 0', height: '42px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, boxSizing: 'border-box', borderWidth: '1px', margin: 0, transform: 'none', boxShadow: 'none', verticalAlign: 'middle', lineHeight: 1, opacity: (!asistenciaCurso || !asistenciaFecha) ? 0.5 : 1, cursor: (!asistenciaCurso || !asistenciaFecha) ? 'not-allowed' : 'pointer' }}><Check size={16} /> Cerrar curso</button>
      </div>

      {asistenciaPanel === 'generar' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px', background: 'var(--surface-bg)', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
          {alumnosAsistencia.length > 0 ? (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '38px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#344054', whiteSpace: 'nowrap' }}>Fecha Clase:</span>
                <input
                  type="date"
                  value={fechaClase}
                  onChange={e => setFechaClase(e.target.value)}
                  style={{ height: '28px', padding: '2px 6px', fontSize: '0.8rem', border: 'none', background: 'transparent', cursor: 'pointer', color: fechaClase ? '#344054' : 'transparent', minWidth: fechaClase ? '125px' : '24px', outline: 'none', boxShadow: 'none' }}
                  title="Establezca la fecha de la clase para imprimir la planilla"
                />
              </div>
              <button
                className="btn-secondary"
                onClick={downloadPDF}
                disabled={!fechaClase}
                style={{ margin: 0, height: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap', opacity: !fechaClase ? 0.5 : 1, cursor: !fechaClase ? 'not-allowed' : 'pointer' }}
                title="Descargar Planilla en PDF para Imprimir"
              >
                <Printer size={15} /> Imprimir planilla
              </button>
              <button
                className="btn-secondary"
                onClick={downloadPlanilla}
                style={{ margin: 0, height: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                title="Descargar Planilla de Asistencia en Excel"
              >
                <Upload size={15} /> Exportar Asistencia
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Generando planilla...</span>
          )}
        </div>
      )}

      {asistenciaPanel === 'cerrar' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px', background: 'var(--surface-bg)', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={cursoCerrado} onChange={e => handleToggleCerrado(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#003876' }} />
            Cerrar Curso
          </label>

          <label
            className="btn-secondary"
            style={{ margin: 0, height: '38px', minWidth: '165px', width: '165px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'var(--font-primary)', boxSizing: 'border-box', cursor: 'pointer', whiteSpace: 'nowrap', borderColor: informes.length > 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.4)', background: informes.length > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.05)', color: informes.length > 0 ? 'var(--success)' : 'rgba(239, 68, 68, 0.85)' }}
          >
            <FileText size={15} color={informes.length > 0 ? 'var(--success)' : 'rgba(239, 68, 68, 0.85)'} />
            Informe Docente
            <input
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              disabled={!asistenciaCurso || !asistenciaFecha}
              onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadInforme(file); e.target.value = ''; }}
            />
          </label>

          <button
            className="btn-secondary"
            onClick={downloadPlanilla}
            disabled={sortedAlumnos.length === 0}
            style={{ margin: 0, height: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap', opacity: sortedAlumnos.length === 0 ? 0.5 : 1 }}
            title="Descargar Planilla de Asistencia en Excel"
          >
            <Upload size={15} /> Exportar Asistencia
          </button>

          {cursoCerrado && alumnosAsistencia.length > 0 && (
            <>
              <button
                className="btn-secondary"
                style={{ margin: 0, height: '38px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                onClick={downloadPlanillaCertificados}
                title="Exportar archivo Excel modelo para el script de envío de Certificados en Google Drive"
              >
                <Upload size={15} /> Exportar Aprobados
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '38px', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#344054', whiteSpace: 'nowrap' }}>Fecha Certificado:</span>
                <input
                  type="date"
                  value={certificadoFecha}
                  onChange={e => handleCertificadoChange(e.target.value)}
                  style={{ height: '28px', padding: '2px 6px', fontSize: '0.8rem', border: 'none', background: 'transparent', cursor: 'pointer', color: certificadoFecha ? '#344054' : 'transparent', minWidth: certificadoFecha ? '125px' : '24px', outline: 'none', boxShadow: 'none' }}
                  title="Fecha de certificado del curso"
                />
              </div>
            </>
          )}
                    {informes.map(info => (
            <div key={info.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '3px 8px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={info.fileName}>{info.fileName}</span>
              <button type="button" className="btn-secondary" style={{ padding: '0 6px', margin: 0, minHeight: '26px', minWidth: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setInformeView(info)} title="Ver informe PDF"><Eye size={12} /></button>
              <button type="button" className="btn-danger" style={{ padding: '0 6px', margin: 0, minHeight: '26px', minWidth: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleDeleteInforme(info)} title="Eliminar informe"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

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
          {/* Tabla aparte para registrar fechas de cada clase, ANTES del nombre del curso */}
          <div className="details-box" style={{ marginBottom: '16px', background: 'var(--surface-bg)', border: '1px solid var(--border-card)', padding: '16px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Calendar size={18} /> Fechas de Clases Dictadas ({totalClases} clases)
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Asigná la fecha en la que se dictó cada clase
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="listbox-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr>
                    {Array.from({ length: totalClases }, (_, i) => {
                      const num = i + 1;
                      const f = fechasClases[num];
                      const isD = Boolean(f || clasesDictadas[num]);
                      return (
                        <th key={num} style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.8rem', minWidth: '130px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span>Clase {num}</span>
                            {isD && <Check size={12} color="#10b981" strokeWidth={3} />}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {Array.from({ length: totalClases }, (_, i) => {
                      const num = i + 1;
                      const f = fechasClases[num] || '';
                      const isD = Boolean(f || clasesDictadas[num]);
                      return (
                        <td key={num} style={{ padding: '8px 6px', textAlign: 'center', background: isD ? 'rgba(16, 185, 129, 0.05)' : 'inherit' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <input
                              type="date"
                              value={f}
                              onChange={e => handleFechaClaseChange(num, e.target.value)}
                              style={{
                                height: '28px',
                                fontSize: '0.78rem',
                                padding: '2px 4px',
                                border: isD ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                                borderRadius: '5px',
                                background: 'var(--input-bg, #ffffff)',
                                color: 'var(--text-primary, #1e293b)',
                                cursor: 'pointer',
                                textAlign: 'center',
                                maxWidth: '120px',
                                width: '100%'
                              }}
                              title={f ? `Clase ${num}: ${formatDateAR(f)}` : `Asignar fecha para Clase ${num}`}
                            />
                            {f && (
                              <button
                                type="button"
                                onClick={() => handleFechaClaseChange(num, '')}
                                title={`Quitar fecha de Clase ${num}`}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: '#94a3b8'
                                }}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="details-box" style={{ marginBottom: '15px', background: 'var(--surface-bg)', border: '1px solid var(--border-card)', padding: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {asistenciaCurso}
              </h3>
              <div style={{ margin: '14px 0 0 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <span>Fecha de Inicio: <span style={{ color: 'light-dark(#003876, #E8BC00)', fontWeight: 600 }}>{formatDateAR(asistenciaFecha)}</span></span>
                  <span>Total Clases: <span style={{ color: 'light-dark(#003876, #E8BC00)', fontWeight: 600 }}>{totalClases}</span></span>
                  <span>Total alumnos: <span style={{ color: 'light-dark(#003876, #E8BC00)', fontWeight: 600 }}>{sortedAlumnos.length}</span></span>
                  {(certificadoFecha || currentFechaObj?.certificado) ? (
                    <span>Certificado: <span style={{ color: 'light-dark(#003876, #E8BC00)', fontWeight: 600 }}>{formatDateAR(certificadoFecha || currentFechaObj.certificado)}</span></span>
                  ) : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => alert({ title: 'Fechas de clases', message: 'Registrá la fecha de cada clase en la tabla superior para indicar cuándo fue dictada. Las clases con fecha registrada se consideran dictadas y se cuentan para las inasistencias.', variant: 'info' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Ayuda sobre fechas de clases">
                    <HelpCircle size={16} color="#E8BC00" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="listbox-wrapper" style={{ overflowX: 'auto' }}>
            <table className="listbox-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '150px' }}
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Apellido {sortOrder === 'asc' ? '▲' : '▼'}
                    </div>
                  </th>
                  <th style={{ minWidth: '130px' }}>Nombre</th>
                  <th style={{ minWidth: '95px' }}>DNI</th>

                  {/* Columnas dinámicas de clases compactas como antes */}
                  {Array.from({ length: totalClases }, (_, i) => {
                    const numClase = i + 1;
                    const fechaClase = fechasClases[numClase] || '';
                    const isDictada = Boolean(fechaClase || clasesDictadas[numClase]);
                    return (
                      <th
                        key={numClase}
                        style={{
                          textAlign: 'center',
                          minWidth: '55px',
                          width: '55px',
                          background: '#ffffff',
                          borderLeft: '1px solid var(--border-card)',
                          padding: '6px 4px'
                        }}
                        title={fechaClase ? `Clase ${numClase} (${formatDateAR(fechaClase)})` : `Clase ${numClase}`}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isDictada ? '#059669' : '#334155' }}>
                            C{numClase}
                          </span>
                          {isDictada ? (
                            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>
                              {fechaClase ? formatDateAR(fechaClase).slice(0, 5) : '✓'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>—</span>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  <th style={{ minWidth: '110px', textAlign: 'center' }}>Inasistencias</th>
                  <th style={{ minWidth: '130px' }}>Condición</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedAlumnos.map(item => {
                  const inasistencias = calcularInasistenciasDictadas(item);
                  const alertInasistencias = inasistencias >= 2;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: alertInasistencias ? 'rgba(239, 68, 68, 0.05)' : 'inherit'
                      }}
                    >
                      <td data-label="Apellido" style={{ fontWeight: 600 }}>{item.apellido}</td>
                      <td data-label="Nombre">{item.nombre}</td>
                      <td data-label="DNI">{item.dni}</td>

                      {/* Checkboxes de asistencia para cada clase compactos */}
                      {Array.from({ length: totalClases }, (_, i) => {
                        const numClase = i + 1;
                        const fechaClase = fechasClases[numClase] || '';
                        const isDictada = Boolean(fechaClase || clasesDictadas[numClase]);
                        const isPresente = !!item.asistencias?.[numClase];

                        return (
                          <td
                            key={numClase}
                            style={{
                              textAlign: 'center',
                              width: '55px',
                              borderLeft: '1px solid var(--border-card)',
                              background: isDictada && !isPresente ? 'rgba(239, 68, 68, 0.08)' : (isPresente ? 'rgba(16, 185, 129, 0.06)' : 'inherit')
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isPresente}
                              onChange={() => handleToggleAlumnoAsistencia(item.id, numClase)}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: 'var(--primary)'
                              }}
                              title={fechaClase ? `Marcar asistencia para Clase ${numClase} (${formatDateAR(fechaClase)})` : `Marcar asistencia para Clase ${numClase}`}
                            />
                          </td>
                        );
                      })}

                      <td data-label="Inasistencias" style={{ textAlign: 'center' }}>
                        {alertInasistencias ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 700 }}>
                            <AlertCircle size={15} />
                            <span>{inasistencias}</span>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleSendWhatsApp(item)}
                              style={{
                                margin: 0,
                                padding: '0',
                                width: '28px',
                                height: '28px',
                                minHeight: '28px',
                                minWidth: '28px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                color: '#16a34a',
                                borderColor: 'rgba(22, 163, 74, 0.5)',
                                background: 'rgba(22, 163, 74, 0.12)',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                              title={`Enviar WhatsApp a ${item.nombre} por inasistencias`}
                            >
                              <MessageSquare size={15} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: inasistencias > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-secondary)' }}>
                            {inasistencias}
                          </span>
                        )}
                      </td>

                      <td data-label="Condición">
                        <select
                          className="form-control"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.8rem',
                            height: '30px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            width: 'auto',
                            minWidth: '110px'
                          }}
                          value={item.resultado || item.condicion || 'Cursando'}
                          onChange={(e) => handleResultadoChange(item.id, e.target.value)}
                        >
                          <option value="Cursando">Cursando</option>
                          <option value="Aprobado">Aprobado</option>
                          <option value="Desaprobado">Desaprobado</option>
                          <option value="Abandonó">Abandonó</option>
                        </select>
                      </td>

                      <td data-label="Acciones" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              generateConstanciaAsistenciaPDF({
                                alumno: {
                                  nombre: item.nombre,
                                  apellido: item.apellido,
                                  dni: item.dni
                                },
                                curso: asistenciaCurso,
                                fechaInicio: asistenciaFecha,
                                cantidadClases: totalClases,
                                fechasClases: fechasClases,
                                asistencias: item.asistencias || {}
                              });
                            }}
                            style={{ padding: 0, margin: 0, width: '30px', height: '30px', minHeight: '30px', minWidth: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            title={`Emitir Constancia de Asistencia para ${item.nombre} ${item.apellido}`}
                          >
                            <FileCheck size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-danger"
                            style={{ padding: 0, margin: 0, width: '30px', height: '30px', minHeight: '30px', minWidth: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            onClick={() => handleDeleteStudent(item.id, `${item.apellido}, ${item.nombre}`)}
                            title="Eliminar de la planilla"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
