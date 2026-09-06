import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { DatabaseBackup, Download } from 'lucide-react';
import { useModal } from './ModalProvider';
import { logAudit } from '../utils/audit';
import {
  buildCursosExportRows,
  buildFechasExportRows,
  CURSOS_EXPORT_HEADERS,
  CURSOS_EXPORT_KEYS,
  FECHAS_EXPORT_HEADERS,
  FECHAS_EXPORT_KEYS,
} from '../utils/exportCursosFechas';
import { displayInscripcion } from '../utils/inscripciones';

interface BackupCardProps {
  alumnos: any[];
  inscripciones: any[];
  cursos: any[];
  fechas: any[];
  docentes: any[];
}

const LAST_BACKUP_KEY = 'siga-last-backup';

/** Convierte filas a un .xlsx en memoria (para guardar dentro del ZIP). */
const sheetToXlsxBuffer = (rows: any[], headers: string[], keys: string[]) => {
  const mapped = rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h] = row[keys[i]] ?? '';
    });
    return obj;
  });
  const ws = mapped.length > 0
    ? XLSX.utils.json_to_sheet(mapped)
    : XLSX.utils.aoa_to_sheet([headers]);
  ws['!cols'] = headers.map(h => ({
    wch: Math.max(h.length, ...mapped.map(r => String(r[h] || '').length)) + 2
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
};

const formatBackupDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

/**
 * Backup completo del sistema en un solo clic: genera un ZIP con un Excel
 * por colección (alumnos, inscriptos, cursos, fechas, asistencias, aprobados
 * y docentes) y recuerda la fecha del último backup realizado en este equipo.
 */
export const BackupCard: React.FC<BackupCardProps> = ({
  alumnos,
  inscripciones,
  cursos,
  fechas,
  docentes
}) => {
  const { alert } = useModal();
  const [generating, setGenerating] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_BACKUP_KEY);
    } catch {
      return null;
    }
  });

  const handleBackup = async () => {
    setGenerating(true);
    try {
      const zip = new JSZip();

      // 1. Alumnos (legajo completo)
      const alumnosRows = [...alumnos].sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''));
      zip.file('01_alumnos.xlsx', sheetToXlsxBuffer(
        alumnosRows,
        ['DNI', 'Apellido', 'Nombre', 'E-mail', 'Celular', 'Fecha de nacimiento', 'Edad', 'Estudios', 'Título obtenido', 'Secr. de Rectorado/Unidad Académica', 'Dirección u Oficina', 'Área de trabajo', 'Cargo o Función', 'Personas', 'Teléfono laboral', 'Interno'],
        ['dni', 'apellido', 'nombre', 'email', 'telPart', 'fechaNac', 'edad', 'nivelEstudio', 'titulo', 'unidadAcademica', 'direccionOficina', 'area', 'cargoFuncion', 'personas', 'telLab', 'interno']
      ));

      // Vista resuelta (joins con cursos/fechas/alumnos, con fallback legacy)
      // para las 3 planillas que salen de inscripciones.
      const alumnoMapBk = new Map((alumnos || []).map((s: any) => [String(s?.dni), s]));
      const vistaInscriptos = inscripciones.map((r: any) => ({
        raw: r,
        v: displayInscripcion(r, { cursos, fechas, alumnos: alumnoMapBk })
      }));

      // 2. Inscriptos (lote histórico: 9 columnas, listas para re-subir por Lotes)
      const inscriptosRows = vistaInscriptos.map(({ v }: any) => ({
        dni: v.dni ?? '',
        apellido: v.apellido,
        nombre: v.nombre,
        programa: v.programa,
        curso: v.curso,
        fechaInicio: v.fechaInicio,
        cargaHoraria: v.cargaHoraria,
        resolucion: v.resolucion,
        resultado: v.resultado
      })).sort((a, b) =>
        String(a.curso).localeCompare(String(b.curso)) ||
        String(a.fechaInicio).localeCompare(String(b.fechaInicio)) ||
        String(a.apellido).localeCompare(String(b.apellido)) ||
        String(a.nombre).localeCompare(String(b.nombre))
      );
      zip.file('02_inscriptos.xlsx', sheetToXlsxBuffer(
        inscriptosRows,
        ['DNI', 'Apellido', 'Nombre', 'Programa', 'Curso', 'Fecha de inicio', 'Carga horaria', 'Resolución', 'Condición'],
        ['dni', 'apellido', 'nombre', 'programa', 'curso', 'fechaInicio', 'cargaHoraria', 'resolucion', 'resultado']
      ));

      // 3. Cursos (catálogo)
      const cursosRows = buildCursosExportRows(cursos, docentes);
      zip.file('03_cursos.xlsx', sheetToXlsxBuffer(cursosRows, CURSOS_EXPORT_HEADERS, CURSOS_EXPORT_KEYS));

      // 4. Fechas (ediciones de cada curso)
      const fechasRows = buildFechasExportRows(fechas, cursos);
      zip.file('04_fechas.xlsx', sheetToXlsxBuffer(fechasRows, FECHAS_EXPORT_HEADERS, FECHAS_EXPORT_KEYS));

      // 5. Asistencias (una fila por inscripto con sus clases P/A y %)
      const cantidadDe = (ins: any): number => {
        const f = (ins.fechaId && fechas.find((x: any) => String(x.id) === String(ins.fechaId)))
          || fechas.find((x: any) =>
            String(x.idCurso) === String(ins.idCurso) && (x.inicio || '') === (ins.fechaInicio || '')
          ) || fechas.find((x: any) =>
            (x.curso || '') === (ins.curso || '') && (x.inicio || '') === (ins.fechaInicio || '')
          );
        return f?.cantidadClases ? Number(f.cantidadClases) : 4;
      };
      const maxClases = Math.max(1, ...inscripciones.map(cantidadDe));
      const asistenciasRows = [...vistaInscriptos]
        .sort((a, b) =>
          String(a.v.curso || '').localeCompare(String(b.v.curso || '')) ||
          String(a.v.fechaInicio || '').localeCompare(String(b.v.fechaInicio || '')) ||
          String(a.v.apellido || '').localeCompare(String(b.v.apellido || '')) ||
          String(a.v.nombre || '').localeCompare(String(b.v.nombre || ''))
        )
        .map(({ raw: a, v }: any) => {
          const total = cantidadDe(a);
          let presentes = 0;
          const row: Record<string, any> = {
            apellido: v.apellido,
            nombre: v.nombre,
            dni: v.dni ?? '',
            curso: v.curso,
            fechaInicio: v.fechaInicio
          };
          for (let c = 1; c <= maxClases; c++) {
            if (c <= total) {
              const presente = !!a.asistencias?.[c];
              if (presente) presentes++;
              row[`clase_${c}`] = presente ? 'P' : 'A';
            } else {
              row[`clase_${c}`] = '';
            }
          }
          row.porcentaje = total > 0 ? `${Math.round((presentes / total) * 100)}%` : '0%';
          row.condicion = a.resultado || 'Cursando';
          return row;
        });
      zip.file('05_asistencias.xlsx', sheetToXlsxBuffer(
        asistenciasRows,
        ['Apellido', 'Nombre', 'DNI', 'Curso', 'Fecha de inicio', ...Array.from({ length: maxClases }, (_, i) => `C${i + 1}`), '% Asistencia', 'Condición'],
        ['apellido', 'nombre', 'dni', 'curso', 'fechaInicio', ...Array.from({ length: maxClases }, (_, i) => `clase_${i + 1}`), 'porcentaje', 'condicion']
      ));

      // 6. Aprobados (listo para certificados)
      const aprobadosRows = vistaInscriptos
        .filter(({ raw: a }: any) => {
          const cond = (a.resultado || '').trim().toLowerCase();
          return cond === 'aprobado' || cond === 'aprobada';
        })
        .map(({ v }: any) => ({
          apellido: v.apellido,
          nombre: v.nombre,
          dni: v.dni ?? '',
          email: v.email,
          curso: v.curso,
          fechaInicio: v.fechaInicio,
          condicion: v.resultado || 'Aprobado'
        }))
        .sort((a, b) =>
          String(a.curso).localeCompare(String(b.curso)) ||
          String(a.apellido).localeCompare(String(b.apellido)) ||
          String(a.nombre).localeCompare(String(b.nombre))
        );
      zip.file('06_aprobados.xlsx', sheetToXlsxBuffer(
        aprobadosRows,
        ['Apellido', 'Nombre', 'DNI', 'Email', 'Curso', 'Fecha de inicio', 'Condición'],
        ['apellido', 'nombre', 'dni', 'email', 'curso', 'fechaInicio', 'condicion']
      ));

      // 7. Docentes (necesaria: los cursos referencian al coordinador por ID;
      // sin esta tabla un restore perdería quién dicta cada curso)
      const docentesRows = [...docentes]
        .sort((a, b) => (a.apellido || '').localeCompare(b.apellido || ''))
        .map((d: any) => ({
          idDocente: d.idDocente ?? '',
          apellido: d.apellido || '',
          nombre: d.nombre || '',
          email: d.email || '',
          celular: d.celular || '',
          dni: d.dni ?? ''
        }));
      zip.file('07_docentes.xlsx', sheetToXlsxBuffer(
        docentesRows,
        ['ID Docente', 'Apellido', 'Nombre', 'Email', 'Celular', 'DNI'],
        ['idDocente', 'apellido', 'nombre', 'email', 'celular', 'dni']
      ));

      const now = new Date();
      const stamp = `${now.toISOString().slice(0, 10)}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_siga_${stamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const iso = now.toISOString();
      try {
        localStorage.setItem(LAST_BACKUP_KEY, iso);
      } catch {
        // almacenamiento no disponible: se muestra igual en esta sesión
      }
      setLastBackup(iso);
      await logAudit(
        'Backup completo',
        `ZIP con 7 archivos: ${alumnosRows.length} alumnos, ${inscriptosRows.length} inscriptos, ${cursosRows.length} cursos, ${fechasRows.length} fechas, ${asistenciasRows.length} filas de asistencia, ${aprobadosRows.length} aprobados, ${docentesRows.length} docentes.`
      );
      await alert({
        title: 'Backup completado',
        message: `Se descargó el ZIP con 7 archivos Excel:\n• Alumnos (${alumnosRows.length})\n• Inscriptos (${inscriptosRows.length})\n• Cursos (${cursosRows.length})\n• Fechas (${fechasRows.length})\n• Asistencias (${asistenciasRows.length})\n• Aprobados (${aprobadosRows.length})\n• Docentes (${docentesRows.length})`,
        variant: 'success'
      });
    } catch (err) {
      console.error('Error generando backup:', err);
      await alert({ title: 'Error', message: 'No se pudo generar el backup. Intente nuevamente.', variant: 'danger' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="details-box" style={{ padding: '16px 20px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DatabaseBackup size={28} color="var(--primary)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Backup del sistema</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Descarga alumnos, inscriptos, cursos, fechas, asistencias, aprobados y docentes en un solo ZIP.
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: lastBackup ? 'var(--success)' : 'var(--warning)' }}>
              {lastBackup ? `Último backup: ${formatBackupDate(lastBackup)}` : 'Aún no se realizó ningún backup en este equipo.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          onClick={handleBackup}
          disabled={generating}
          title="Descargar ZIP con 7 archivos Excel (uno por tabla)"
        >
          <Download size={16} /> {generating ? 'Generando...' : 'Backup completo (ZIP)'}
        </button>
      </div>
    </div>
  );
};
