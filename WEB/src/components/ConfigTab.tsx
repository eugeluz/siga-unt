import React, { useState } from 'react';
import { collection, getDocs, writeBatch, setDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { Settings, Trash2, Download, Database, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { ImportModal } from './ImportModal';
import { useModal } from './ModalProvider';
import { matchCurso } from '../utils/inscripciones';

interface ConfigTabProps {
  currentUserEmail?: string | null;
  onRefreshData?: () => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({ currentUserEmail, onRefreshData }) => {
  const { confirm, alert } = useModal();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'alumnos' | 'inscripciones' | 'cursos' | 'fechas'>('alumnos');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Verificar si el usuario es eugenia.gonzalez@webmail.unt.edu.ar
  const isAuthorized = (currentUserEmail || '').toLowerCase() === 'eugenia.gonzalez@webmail.unt.edu.ar';

  const handleVaciarColeccion = async (
    collectionName: string, 
    labelSingular: string, 
    labelPlural: string
  ) => {
    const confirm1 = await confirm({
      title: 'Atención: Acción irreversible',
      message: `¿Está seguro de que desea ELIMINAR TODOS los registros de ${labelPlural.toUpperCase()}?\n\nEsta acción borrará por completo la base de datos de ${labelPlural} y no se puede deshacer.`,
      variant: 'warning',
      confirmText: 'Sí, continuar',
      cancelText: 'Cancelar',
    });
    if (!confirm1) return;

    const confirm2 = await confirm({
      title: 'Confirmación final de seguridad',
      message: `¿Confirma que desea vaciar la tabla de ${labelPlural}?\n\nSe eliminarán todos los registros existentes de forma permanente.`,
      variant: 'danger',
      confirmText: 'Sí, vaciar tabla',
      cancelText: 'Cancelar',
    });
    if (!confirm2) return;

    setLoadingAction(`Vaciando ${labelPlural}...`);
    try {
      const snap = await getDocs(collection(db, collectionName));
      let batch = writeBatch(db);
      let count = 0;

      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }

      await logAudit(`Vaciamiento de ${labelPlural}`, `Se eliminaron ${count} registros de ${labelPlural}`);
      await alert({
        title: 'Operación completada',
        message: `Se han eliminado los ${count} registros de ${labelPlural} con éxito.`,
        variant: 'success',
        confirmText: 'Entendido',
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(`Error al vaciar ${collectionName}:`, err);
      await alert({
        title: 'Error',
        message: `No se pudieron eliminar los registros de ${labelPlural}. Intente nuevamente.`,
        variant: 'danger',
        confirmText: 'Entendido',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const openImport = (type: 'alumnos' | 'inscripciones' | 'cursos' | 'fechas') => {
    setImportType(type);
    setShowImportModal(true);
  };

  // Migración única al modelo normalizado:
  // inscripciones = { dni, idCurso, fechaId, resultado } + snapshot apellido/nombre
  // solo si el dni no está en el padrón + asistencias. Limpia los campos legacy
  // desnormalizados (curso, fechaInicio, email, unidadAcademica, etc.), completa
  // resoluciones faltantes en cursos y fusiona duplicados (misma clave).
  const handleNormalizarInscripciones = async () => {
    const ok = await confirm({
      title: 'Normalizar tabla de inscriptos',
      message: 'Se convertirá cada inscripción a { DNI, curso, fecha, condición } por referencias:\n\n• Los DNI que no estén en el padrón se dan de alta en Alumnos (merge, sin pisar datos).\n• Programa/Curso/Carga/Resolución quedan en Cursos (se completa la resolución faltante).\n• La fecha queda en Fechas (se crea si falta).\n• Se conservan asistencias y condición; se fusionan duplicados.\n• Se ELIMINAN los campos duplicados legacy de cada inscripción.\n\n¿Continuar?',
      variant: 'warning',
      confirmText: 'Sí, normalizar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    setLoadingAction('Normalizando inscriptos...');
    try {
      const [inscSnap, cursosSnap, fechasSnap, alumnosSnap] = await Promise.all([
        getDocs(collection(db, 'inscripciones')),
        getDocs(collection(db, 'cursos')),
        getDocs(collection(db, 'fechas')),
        getDocs(collection(db, 'alumnos'))
      ]);
      const alumnoSet = new Set(
        alumnosSnap.docs.map(d => String((d.data() as any)?.dni))
      );
      const cursosArr: any[] = cursosSnap.docs.map(d => ({ ref: d.ref, ...(d.data() as any) }));
      const cursosById = new Map<string, any>();
      cursosArr.forEach(c => cursosById.set(String(c.idCurso), c));
      let maxIdCurso = cursosArr.reduce((m, c) => Math.max(m, Number(c.idCurso) || 0), 0);
      const fechasArr: any[] = fechasSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const rankResultado = (r: string) => {
        const n = String(r || '').toLowerCase();
        if (n.includes('aprob')) return 4;
        if (n.includes('desaprob')) return 3;
        if (n.includes('abandon')) return 2;
        if (n.includes('cursan')) return 1;
        return 0;
      };

      const grupos = new Map<string, {
        keepRef: any;
        dni: number;
        idCurso: number;
        fechaId: string;
        resultado: string;
        apellido: string;
        nombre: string;
        asistencias: Record<string, boolean>;
        dupRefs: any[];
      }>();
      let omitidos = 0;
      let cursosTocados = 0;
      let fechasCreadas = 0;
      let cursosCreados = 0;

      for (const d of inscSnap.docs) {
        const r: any = d.data();
        const dniNum = Number(r.dni);
        if (!dniNum) { omitidos++; continue; }

        // 1) Curso por id o nombre (legacy); se crea mínimo si no existe
        let cursoObj = (r.idCurso !== undefined && r.idCurso !== null && String(r.idCurso).trim() !== '')
          ? cursosById.get(String(r.idCurso))
          : undefined;
        if (!cursoObj && r.curso) cursoObj = matchCurso(cursosArr, { nombre: r.curso });
        if (!cursoObj) {
          if (!r.curso) { omitidos++; continue; }
          maxIdCurso += 1;
          const nuevo: any = {
            idCurso: maxIdCurso,
            curso: String(r.curso).trim(),
            nombreCompleto: String(r.curso).trim(),
            programa: '',
            cargaHoraria: '',
            resolucion: r.resolucion ? String(r.resolucion).trim() : '',
            showOnLanding: true
          };
          const ref = doc(db, 'cursos', String(maxIdCurso));
          await setDoc(ref, nuevo);
          cursoObj = { ref, ...nuevo };
          cursosArr.push(cursoObj);
          cursosById.set(String(maxIdCurso), cursoObj);
          cursosCreados++;
        }
        // Completar resolución faltante del curso con la legacy de la inscripción
        if ((!cursoObj.resolucion || String(cursoObj.resolucion).trim() === '') && r.resolucion) {
          await setDoc(cursoObj.ref, { resolucion: String(r.resolucion).trim() }, { merge: true });
          cursoObj.resolucion = String(r.resolucion).trim();
          cursosTocados++;
        }
        const idCursoNum = Number(cursoObj.idCurso);

        // 2) Fecha por docId o (idCurso + inicio); se crea si falta
        let fechaObj = (r.fechaId && fechasArr.find(f => String(f.id) === String(r.fechaId))) || undefined;
        const inicioLegacy = r.fechaInicio ? String(r.fechaInicio) : '';
        if (!fechaObj && inicioLegacy) {
          fechaObj = fechasArr.find(f =>
            String(f.idCurso) === String(idCursoNum) && String(f.inicio || '') === inicioLegacy
          );
        }
        if (!fechaObj) {
          if (!inicioLegacy) { omitidos++; continue; }
          const ref = await addDoc(collection(db, 'fechas'), {
            idCurso: idCursoNum,
            curso: cursoObj.nombreCompleto || cursoObj.curso,
            inicio: inicioLegacy,
            certificado: '',
            cantidadClases: 4
          });
          fechaObj = { id: ref.id, idCurso: idCursoNum, inicio: inicioLegacy };
          fechasArr.push(fechaObj);
          fechasCreadas++;
        }

        // 3) Agrupar por clave normalizada y fusionar
        const key = `${dniNum}|${idCursoNum}|${fechaObj.id}`;
        let g = grupos.get(key);
        if (!g) {
          g = {
            keepRef: d.ref, dni: dniNum, idCurso: idCursoNum, fechaId: fechaObj.id,
            resultado: r.resultado || 'Cursando', apellido: '', nombre: '',
            asistencias: {}, dupRefs: []
          };
          grupos.set(key, g);
        } else {
          g.dupRefs.push(d.ref);
          if (rankResultado(r.resultado) > rankResultado(g.resultado)) g.resultado = r.resultado;
        }
        const a = r.asistencias || {};
        Object.keys(a).forEach(k => {
          if (a[k]) g!.asistencias[k] = true;
          else if (!(k in g!.asistencias)) g!.asistencias[k] = false;
        });
        if (!alumnoSet.has(String(dniNum))) {
          if (!g.apellido && r.apellido) g.apellido = r.apellido;
          if (!g.nombre && r.nombre) g.nombre = r.nombre;
        }
      }

      // 4) Escribir payloads limpios (overwrite) + altas de padrón + borrar duplicados
      let batch = writeBatch(db);
      let ops = 0;
      let escritos = 0;
      let duplicados = 0;
      let alumnosCreados = 0;
      const flush = async () => {
        if (ops > 0) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      };
      for (const g of grupos.values()) {
        const payload: any = {
          dni: g.dni,
          idCurso: g.idCurso,
          fechaId: g.fechaId,
          resultado: g.resultado || 'Cursando'
        };
        // Alta en el padrón si el dni no existe (merge, sin pisar datos)
        if (!alumnoSet.has(String(g.dni))) {
          const alta: any = { dni: g.dni };
          if (g.apellido) alta.apellido = g.apellido;
          if (g.nombre) alta.nombre = g.nombre;
          batch.set(doc(db, 'alumnos', String(g.dni)), alta, { merge: true });
          ops++;
          alumnoSet.add(String(g.dni));
          alumnosCreados++;
        }
        if (Object.keys(g.asistencias).length > 0) payload.asistencias = g.asistencias;
        batch.set(g.keepRef, payload);
        ops++; escritos++;
        for (const dup of g.dupRefs) { batch.delete(dup); ops++; duplicados++; }
        if (ops >= 400) await flush();
      }
      await flush();

      const msg = `Normalización completada: ${escritos} inscripciones normalizadas, ${duplicados} duplicados fusionados, ${alumnosCreados} alumnos dados de alta, ${cursosCreados} cursos creados, ${cursosTocados} cursos con resolución completada, ${fechasCreadas} fechas creadas${omitidos > 0 ? `, ${omitidos} omitidos (sin DNI, curso o fecha)` : ''}.`;
      await logAudit('Normalización de inscriptos', msg);
      await alert({ title: 'Normalización completada', message: msg, variant: 'success', confirmText: 'Entendido' });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error normalizando inscripciones:', err);
      await alert({ title: 'Error', message: 'No se pudo normalizar la tabla de inscriptos. Intente nuevamente.', variant: 'danger', confirmText: 'Entendido' });
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '30px', borderRadius: '16px', color: 'var(--danger)' }}>
          <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem' }}>Acceso Restringido</h3>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Esta sección de administración y configuración de tablas es exclusiva para la cuenta <strong>eugenia.gonzalez@webmail.unt.edu.ar</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={26} color="#8B5CF6" /> Configuración y Administración de Tablas
          </h2>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Panel de control exclusivo para la gestión integral de la base de datos de SIGA-web.
          </p>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '6px 14px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#8B5CF6', fontWeight: 600 }}>
          <ShieldCheck size={16} /> Administradora: eugenia.gonzalez@webmail.unt.edu.ar
        </div>
      </div>

      {loadingAction && (
        <div style={{ padding: '16px', background: 'rgba(37, 154, 214, 0.1)', border: '1px solid var(--accent)', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--accent)' }}></div>
          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{loadingAction}</span>
        </div>
      )}

      {/* Grid de Secciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        
        {/* Bloque 1: Carga e Importación Individual */}
        <div className="details-box" style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-card)', padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.15rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={20} color="var(--primary)" /> Importar / Cargar Tablas (Excel / CSV)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
            Selecciona la tabla que deseas cargar o actualizar individualmente mediante un archivo Excel (.xlsx) o CSV.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('alumnos')}
            >
              <Download size={16} color="var(--primary)" /> Cargar Alumnos
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('inscripciones')}
            >
              <Download size={16} color="var(--success)" /> Cargar Inscritos
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('cursos')}
            >
              <Download size={16} color="#06B6D4" /> Cargar Cursos
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('fechas')}
            >
              <Download size={16} color="#F59E0B" /> Cargar Fechas
            </button>
          </div>
        </div>

        {/* Bloque 2: Vaciamiento / Limpieza de Tablas */}
        <div className="details-box" style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.15rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} color="var(--danger)" /> Vaciar Tablas (Borrado Completo)
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
            Elimina en lotes todos los registros de cada tabla individualmente para permitir una recarga limpia.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              className="btn-danger"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => handleVaciarColeccion('alumnos', 'alumno', 'alumnos')}
            >
              <Trash2 size={16} /> Vaciar Alumnos
            </button>

            <button
              className="btn-danger"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => handleVaciarColeccion('inscripciones', 'inscripción', 'inscritos')}
            >
              <Trash2 size={16} /> Vaciar Inscritos
            </button>

            <button
              className="btn-danger"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => handleVaciarColeccion('cursos', 'curso', 'cursos')}
            >
              <Trash2 size={16} /> Vaciar Cursos
            </button>

            <button
              className="btn-danger"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => handleVaciarColeccion('fechas', 'fecha', 'fechas')}
            >
              <Trash2 size={16} /> Vaciar Fechas
            </button>
          </div>
        </div>

      </div>

      {/* Bloque 3: Normalización al modelo por referencias (operación única) */}
      <div className="details-box" style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '24px', marginTop: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.15rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} color="#8B5CF6" /> Normalizar Inscriptos (modelo por referencias)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Convierte cada inscripción a <strong>DNI + curso + fecha + condición</strong> por referencias.
          Los DNI ausentes se dan de alta en Alumnos, los datos del curso quedan en Cursos
          y la fecha en Fechas; se conservan asistencias y condición, se fusionan duplicados
          y se eliminan los campos duplicados legacy. Ejecutar una sola vez después de ordenar las tablas.
        </p>
        <button
          className="btn-secondary"
          style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0, width: '100%' }}
          onClick={handleNormalizarInscripciones}
          disabled={loadingAction !== null}
        >
          <RefreshCw size={16} /> Normalizar tabla de inscriptos
        </button>
      </div>

      {showImportModal && (
        <ImportModal
          defaultType={importType}
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
};
