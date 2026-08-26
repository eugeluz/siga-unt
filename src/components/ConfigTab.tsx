import React, { useState } from 'react';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { logAudit } from '../utils/audit';
import { Settings, Trash2, Upload, Database, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { ImportModal } from './ImportModal';
import { useModal } from './ModalProvider';

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
            <Upload size={20} color="var(--primary)" /> Importar / Cargar Tablas (Excel / CSV)
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
              <Upload size={16} color="var(--primary)" /> Cargar Alumnos
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('inscripciones')}
            >
              <Upload size={16} color="var(--success)" /> Cargar Inscritos
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('cursos')}
            >
              <Upload size={16} color="#06B6D4" /> Cargar Cursos
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', height: '46px', margin: 0 }}
              onClick={() => openImport('fechas')}
            >
              <Upload size={16} color="#F59E0B" /> Cargar Fechas
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
