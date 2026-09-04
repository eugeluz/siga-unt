import React, { useState } from 'react';
import { getDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDateAR } from '../utils/dateAR';
import { Search, Award, FileCheck } from 'lucide-react';
import { useModal } from './ModalProvider';
import { generateConstanciaAsistenciaPDF } from '../utils/constanciaPDF';

interface StudentHistoryTabProps {
  alumnos: any[];
  cursos?: any[];
  fechas?: any[];
  defaultDni?: string;
}

export const StudentHistoryTab: React.FC<StudentHistoryTabProps> = ({ alumnos, cursos = [], fechas = [], defaultDni = '' }) => {
  const { alert } = useModal();
  const [consultaDni, setConsultaDni] = useState(defaultDni);
  const [alumnoSelected, setAlumnoSelected] = useState<any>(null);
  const [historialAlumno, setHistorialAlumno] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Auto-search if defaultDni is provided
  React.useEffect(() => {
    if (defaultDni) {
      setConsultaDni(defaultDni);
      searchHistorial(defaultDni);
    }
  }, [defaultDni]);

  const searchHistorial = async (dniToSearch?: string) => {
    const searchVal = dniToSearch || consultaDni;
    if (!searchVal) return;
    setLoadingHistorial(true);
    setAlumnoSelected(null);
    setHistorialAlumno([]);

    try {
      let studentObj = alumnos.find(a => String(a.dni) === searchVal.trim());
      if (!studentObj) {
        // Fetch student directly by DNI (1 single read)
        const snapStud = await getDoc(doc(db, 'alumnos', searchVal.trim()));
        if (snapStud.exists()) studentObj = snapStud.data();
      }

      const qInsc = query(collection(db, 'inscripciones'), where('dni', '==', Number(searchVal)));
      const snapInsc = await getDocs(qInsc);
      let listInsc: any[] = snapInsc.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      if (listInsc.length === 0) {
        const qInscStr = query(collection(db, 'inscripciones'), where('dni', '==', String(searchVal).trim()));
        const snapInscStr = await getDocs(qInscStr);
        listInsc = snapInscStr.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      }

      let cursosList: any[] = cursos;
      let fechasList: any[] = fechas;

      if (cursosList.length === 0 || fechasList.length === 0) {
        const [snapCursos, snapFechas] = await Promise.all([
          getDocs(collection(db, 'cursos')),
          getDocs(collection(db, 'fechas'))
        ]);
        if (cursosList.length === 0) cursosList = snapCursos.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        if (fechasList.length === 0) fechasList = snapFechas.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      }

      const fullHistory = listInsc.map((insc: any) => {
        const cursoObj = cursosList.find(c => String(c.idCurso) === String(insc.idCurso) || (c.nombreCompleto || c.curso) === insc.curso);
        const fechaObj = fechasList.find(f => String(f.idCurso) === String(insc.idCurso) && f.inicio === insc.fechaInicio);

        return {
          ...insc,
          id: insc.id,
          curso: cursoObj?.nombreCompleto || insc.curso,
          resolucion: cursoObj?.resolucion || 'Sin dato',
          certificado: fechaObj?.certificado || '—',
          cantidadClases: fechaObj?.cantidadClases || 4,
          fechasClases: fechaObj?.fechasClases || {},
          asistencias: insc.asistencias || {}
        };
      });

      setHistorialAlumno(fullHistory);

      // Fallback: si no hay ficha en 'alumnos' (inscripción sin padrón),
      // derivar los datos del encabezado desde la primera inscripción
      const firstInsc: any = listInsc[0];
      if (!studentObj && firstInsc) {
        studentObj = {
          apellido: firstInsc.apellido || '',
          nombre: firstInsc.nombre || '',
          dni: firstInsc.dni ?? String(searchVal).trim(),
          email: firstInsc.email || '',
          unidadAcademica: firstInsc.unidadAcademica || '',
        };
      } else if (studentObj && firstInsc) {
        if (!studentObj.email && firstInsc.email) studentObj = { ...studentObj, email: firstInsc.email };
        if (!studentObj.unidadAcademica && firstInsc.unidadAcademica) studentObj = { ...studentObj, unidadAcademica: firstInsc.unidadAcademica };
        if (!studentObj.apellido && firstInsc.apellido) studentObj = { ...studentObj, apellido: firstInsc.apellido };
        if (!studentObj.nombre && firstInsc.nombre) studentObj = { ...studentObj, nombre: firstInsc.nombre };
        if (!studentObj.dni && firstInsc.dni) studentObj = { ...studentObj, dni: firstInsc.dni };
      }
      if (studentObj) {
        setAlumnoSelected(studentObj);
      }
    } catch (err) {
      console.error(err);
      await alert({ title: 'Error', message: 'No se pudo consultar el historial del alumno. Intente nuevamente.', variant: 'danger' });
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleSearchClick = () => {
    searchHistorial();
  };

  const handleEmitirCertificado = async (item: any) => {
    const estado = (item.resultado || 'Cursando').trim().toLowerCase();
    if (!estado.includes('aprob')) {
      await alert({
        title: 'Constancia no disponible',
        message: 'No se puede emitir la constancia: la condición del alumno es Cursando. La constancia de aprobación solo se emite para alumnos Aprobados.',
        variant: 'warning'
      });
      return;
    }

    const studentName = alumnoSelected
      ? `${alumnoSelected.apellido}, ${alumnoSelected.nombre}`
      : 'el alumno';
    await alert({
      title: 'Constancia de Aprobación',
      message: `Emitir de Constancia de Aprobación para ${studentName} en el curso "${item.curso}".\n\n.`,
      variant: 'info'
    });
  };

  const handlePlanillaAsistencia = async (item: any) => {
    try {
      generateConstanciaAsistenciaPDF({
        alumno: {
          nombre: alumnoSelected?.nombre || item.nombre,
          apellido: alumnoSelected?.apellido || item.apellido,
          dni: alumnoSelected?.dni || item.dni || consultaDni
        },
        curso: item.curso,
        fechaInicio: item.fechaInicio,
        cantidadClases: item.cantidadClases || 4,
        fechasClases: item.fechasClases || {},
        asistencias: item.asistencias || {}
      });

      await alert({
        title: 'Constancia de Asistencia generada',
        message: `La constancia de asistencia en PDF para "${item.curso}" se descargó con éxito.`,
        variant: 'success'
      });
    } catch (err) {
      console.error('Error generando constancia:', err);
      await alert({
        title: 'Error',
        message: 'No se pudo generar la constancia de asistencia. Intente nuevamente.',
        variant: 'danger'
      });
    }
  };

  return (
    <div>
      <div className="details-box" style={{ marginBottom: '25px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: '16px', maxWidth: '650px', width: '100%' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <input
              type="number"
              className="form-control"
              placeholder="Ingresar el DNI del alumno..."
              value={consultaDni}
              onChange={e => setConsultaDni(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchClick(); }}
              style={{ width: '100%', height: '44px', fontSize: '0.95rem' }}
            />
          </div>
          <button
            className="btn-primary"
            style={{
              margin: 0,
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              padding: '0 24px',
              fontSize: '0.95rem',
              fontWeight: 600
            }}
            onClick={handleSearchClick}
          >
            <Search size={18} /> Consultar Historial
          </button>
        </div>
      </div>

      {loadingHistorial && <div className="spinner"></div>}

      {alumnoSelected && (
        <div className="details-box" style={{ marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <h3>{alumnoSelected.apellido}, {alumnoSelected.nombre}</h3>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
            <strong>DNI:</strong> {alumnoSelected.dni} | <strong>Email:</strong> {alumnoSelected.email || '—'} | <strong>Sec. Rectorado/UA:</strong> {alumnoSelected.unidadAcademica || '—'}
          </p>
        </div>
      )}

      {historialAlumno.length > 0 && (
        <div className="listbox-wrapper">
          <table className="listbox-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Fecha Inicio</th>
                <th>Fecha Certificado</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center', minWidth: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historialAlumno.map((item, idx) => {
                const cursoNombre = cursos.find(c => String(c.idCurso) === String(item.idCurso))?.nombreCompleto || item.curso;
                const estado = (item.resultado || 'Cursando').trim().toLowerCase();
                const isAprobado = estado.includes('aprob');
                const isCursando = estado.includes('cursan');

                return (
                  <tr key={item.id || idx}>
                    <td data-label="Curso">{cursoNombre}</td>
                    <td data-label="Fecha Inicio">{formatDateAR(item.fechaInicio)}</td>
                    <td data-label="Certificado">{formatDateAR(item.certificado)}</td>
                    <td data-label="Estado">
                      <span className={`badge badge-${(item.resultado || 'cursando').toLowerCase().replace('ó', 'o')}`}>
                        {item.resultado || 'Cursando'}
                      </span>
                    </td>
                    <td data-label="Acciones" style={{ textAlign: 'center' }}>
                      {isAprobado && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              margin: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px'
                            }}
                            onClick={() => handleEmitirCertificado(item)}
                            title="Emitir Constancia de Aprobación"
                            aria-label="Emitir Constancia de Aprobación"
                          >
                            <Award size={17} />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              margin: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px'
                            }}
                            onClick={() => handlePlanillaAsistencia(item)}
                            title="Emitir Constancia de Asistencia"
                            aria-label="Emitir Constancia de Asistencia con fechas asistidas"
                          >
                            <FileCheck size={17} />
                          </button>
                        </div>
                      )}
                      {isCursando && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              margin: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px'
                            }}
                            onClick={() => handlePlanillaAsistencia(item)}
                            title="Emitir Constancia de Asistencia"
                            aria-label="Emitir Constancia de Asistencia con fechas asistidas"
                          >
                            <FileCheck size={17} />
                          </button>
                        </div>
                      )}
                      {!isAprobado && !isCursando && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {historialAlumno.length === 0 && !loadingHistorial && consultaDni && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
          El alumno no registra inscripciones de capacitación.
        </p>
      )}
    </div>
  );
};
