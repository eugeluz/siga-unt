import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { setDoc, doc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Upload, Database, AlertTriangle } from 'lucide-react';

import { excelDateToJSDate } from '../utils/date';
import { useModal } from './ModalProvider';
import { toTitleCase } from '../utils/text';

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  defaultType?: 'alumnos' | 'inscripciones' | 'cursos' | 'fechas';
}

/**
 * ImportModal component that handles reading local Excel/CSV files, parsing them,
 * and loading them into Firestore in batch operations.
 */
export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportComplete, defaultType = 'alumnos' }) => {
  const { alert } = useModal();
  const [importType, setImportType] = useState<'alumnos' | 'inscripciones' | 'cursos' | 'fechas'>(defaultType);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [isImporting, setIsImporting] = useState(false);

  // Sheet names and workbook state
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          
          const ws = wb.Sheets[firstSheet];
          const rawJson = XLSX.utils.sheet_to_json(ws);
          setParsedData(rawJson);
        }
      } catch (err) {
        console.error(err);
        alert({ title: 'Error al leer archivo', message: 'Error al leer el archivo. Asegúrese de que sea un archivo de Excel o CSV válido.', variant: 'danger' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const ws = workbook.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(ws);
      setParsedData(rawJson);
    }
  };

  // Normalizador de claves: elimina tildes, espacios extras y caracteres especiales
  const normalizeKey = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[^a-z0-9]/g, '');     // deja solo letras y números

  const getRowVal = (row: any, aliases: string[]) => {
    if (!row) return undefined;
    const rawKeys = Object.keys(row);
    // 1. Coincidencia exacta insensible a mayúsculas
    for (const alias of aliases) {
      const trimmedAlias = alias.toLowerCase().trim();
      for (const key of rawKeys) {
        if (key.toLowerCase().trim() === trimmedAlias) {
          const val = row[key];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return val;
          }
        }
      }
    }
    // 2. Coincidencia normalizada sin tildes ni símbolos
    const rowNormalized: Record<string, any> = {};
    rawKeys.forEach(k => {
      rowNormalized[normalizeKey(k)] = row[k];
    });
    for (const alias of aliases) {
      const norm = normalizeKey(alias);
      if (rowNormalized[norm] !== undefined && rowNormalized[norm] !== null && String(rowNormalized[norm]).trim() !== '') {
        return rowNormalized[norm];
      }
    }
    return undefined;
  };

  const executeImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedData.length, status: 'Iniciando importación...' });

    let count = 0;
    try {
      for (const row of parsedData) {
        count++;
        const getVal = (aliases: string[]) => getRowVal(row, aliases);

        const rawDni = getVal(['dni', 'documento', 'nro doc', 'nro de documento', 'cedula', 'identificacion', 'doc']);
        const dniVal = Number(String(rawDni || '').replace(/\D/g, ''));

        if (importType === 'alumnos') {
          if (!dniVal) continue;
          
          const studentData: any = {
            dni: dniVal
          };

          const setIfPresent = (aliases: string[], targetKey: string, transform?: (val: any) => any) => {
            const val = getVal(aliases);
            if (val !== undefined) {
              studentData[targetKey] = transform ? transform(val) : val;
            }
          };

          setIfPresent(['apellido', 'apellidos', 'surname', 'last name'], 'apellido', (v) => toTitleCase(String(v).trim()));
          setIfPresent(['nombre', 'nombres', 'name', 'first name'], 'nombre', (v) => toTitleCase(String(v).trim()));
          setIfPresent(['e-mail', 'email', 'correo', 'mail', 'correo electronico', 'e mail', 'direccion de correo'], 'email', (v) => String(v).toLowerCase().trim());
          setIfPresent(['telefono celular', 'tel part', 'celular', 'telefono', 'telpart', 'tel', 'whatsapp', 'movil', 'telefono particular', 'tel particular'], 'telPart', (v) => String(v).trim());
          setIfPresent(['fecha de nacimiento', 'fecha nac', 'nacimiento', 'fechanac', 'fec nac', 'fecha nacimiento'], 'fechaNac', (v) => excelDateToJSDate(v));
          setIfPresent(['estudios', 'nivel estudio', 'nivelestudio', 'nivel de estudios', 'estudio', 'nivel academico'], 'nivelEstudio', (v) => String(v).trim());
          setIfPresent(['titulo obtenido', 'titulo', 'profesion', 'carrera'], 'titulo', (v) => String(v).trim());
          
          // Unidad Académica / Dependencia
          setIfPresent([
            'unidad academica / dependencia',
            'unidad academica/dependencia',
            'unidad académica / dependencia',
            'unidad académica/dependencia',
            'unidad academica',
            'unidad académica',
            'facultad / dependencia',
            'facultad',
            'dependencia'
          ], 'unidadAcademica', (v) => String(v).trim());

          // Dirección u Oficina
          setIfPresent([
            'direccion u oficina',
            'dirección u oficina',
            'direccion/oficina',
            'direccion o oficina',
            'direccion',
            'dirección',
            'oficina',
            'direccion oficina'
          ], 'direccionOficina', (v) => String(v).trim());

          // Área de trabajo
          setIfPresent([
            'area de trabajo',
            'área de trabajo',
            'area laboral',
            'sector de trabajo',
            'area',
            'área',
            'sector',
            'departamento',
            'seccion'
          ], 'area', (v) => String(v).trim());

          setIfPresent(['cargo o funcion', 'cargo / funcion', 'cargo/funcion', 'cargo', 'funcion', 'cargofuncion', 'puesto'], 'cargoFuncion', (v) => String(v).trim());
          setIfPresent(['personas a cargo', 'personas', 'personal', 'personal a cargo'], 'personas', (v) => Number(v) || 0);
          setIfPresent(['telefono laboral', 'tel lab', 'tellab', 'tel trabajo', 'laboral', 'tel oficina'], 'telLab', (v) => String(v).trim());
          setIfPresent(['interno', 'int', 'nro interno', 'numero interno'], 'interno', (v) => String(v).trim());

          await setDoc(doc(db, 'alumnos', String(dniVal)), studentData, { merge: true });
        } else if (importType === 'inscripciones') {
          const insData = {
            dni: dniVal,
            apellido: toTitleCase(String(getVal(['apellido', 'apellidos', 'surname', 'last name']) || '').trim()),
            nombre: toTitleCase(String(getVal(['nombre', 'nombres', 'name', 'first name']) || '').trim()),
            curso: String(getVal(['curso', 'nombre curso', 'capacitacion', 'taller', 'seminario']) || '').trim(),
            fechaInicio: excelDateToJSDate(getVal(['fecha inicio', 'fecha', 'inicio', 'fechainicio', 'fecha de inicio']) || ''),
            resultado: String(getVal(['resultado', 'estado', 'condicion', 'situacion']) || 'Cursando').trim(),
            email: String(getVal(['email', 'correo', 'mail', 'e-mail', 'correo electronico', 'e mail']) || '').toLowerCase().trim(),
            cargoFuncion: String(getVal(['cargo', 'funcion', 'cargofuncion', 'cargo / funcion', 'cargo/funcion', 'puesto']) || ''),
            unidadAcademica: String(getVal([
              'unidad academica', 'unidad academica / dependencia', 'unidad academica/dependencia', 'unidad academica o dependencia',
              'facultad', 'dependencia', 'unidadacademica', 'unidad', 'lugar de trabajo', 'facultad / dependencia', 'ua'
            ]) || ''),
            area: String(getVal([
              'area', 'area de trabajo', 'areadetrabajo', 'sector', 'departamento', 'seccion', 'area laboral'
            ]) || ''),
            ua: String(getVal(['ua', 'idcurso']) || '')
          };

          if (insData.dni && insData.curso && insData.fechaInicio) {
            const q = query(
              collection(db, 'inscripciones'),
              where('dni', '==', insData.dni),
              where('curso', '==', insData.curso),
              where('fechaInicio', '==', insData.fechaInicio)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const docId = snap.docs[0].id;
              await setDoc(doc(db, 'inscripciones', docId), insData, { merge: true });
            } else {
              await addDoc(collection(db, 'inscripciones'), insData);
            }
          } else {
            await addDoc(collection(db, 'inscripciones'), insData);
          }
        } else if (importType === 'cursos') {
          const idCursoVal = Number(getVal(['idcurso', 'id', 'id_curso']) || count);
          const cursoData: any = {
            idCurso: idCursoVal,
            curso: String(getVal(['curso', 'nombre', 'nombre curso', 'nombre corto']) || '').trim(),
            nombreCompleto: String(getVal(['nombre completo', 'nombrecompleto', 'nombre largo', 'titulo completo', 'nombre curso completo']) || '').trim(),
            programa: String(getVal(['programa', 'area']) || '').trim(),
            cargaHoraria: String(getVal(['cargahoraria', 'carga horaria', 'horas', 'hs', 'cantidad de clases', 'cantidad clases', 'cant clases', 'cantidadclases', 'clases', 'numero de clases', 'nro clases']) || '').trim(),
            resolucion: String(getVal(['resolucion', 'resolución', 'res']) || '').trim(),
            showOnLanding: true
          };
          if (cursoData.curso) {
            await setDoc(doc(db, 'cursos', String(idCursoVal)), cursoData, { merge: true });
          }
        } else if (importType === 'fechas') {
          const idCursoVal = Number(getVal(['idcurso', 'id', 'id_curso']) || 0);
          const fechaData = {
            idCurso: idCursoVal,
            curso: String(getVal(['curso', 'nombre']) || '').trim(),
            inicio: excelDateToJSDate(getVal(['inicio', 'fechainicio', 'fecha inicio', 'fecha']) || ''),
            certificado: excelDateToJSDate(getVal(['certificado', 'fechacertificado', 'fecha certificado']) || '')
          };
          if (fechaData.inicio) {
            await addDoc(collection(db, 'fechas'), fechaData);
          }
        }

        setImportProgress({
          current: count,
          total: parsedData.length,
          status: `Procesando fila ${count} de ${parsedData.length}...`
        });
      }

      await alert({ title: 'Importación completada', message: `Importación completada con éxito. Se procesaron ${count} registros.`, variant: 'success' });
      onImportComplete();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      await alert({ title: 'Error en importación', message: `Error durante la importación en la fila ${count}: ${message}`, variant: 'danger' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} color="var(--accent)" /> Importar desde Excel / CSV
            </span>
          </h3>
          <button className="modal-close" onClick={() => {
            if (!isImporting) {
              onClose();
            }
          }}>×</button>
        </div>

        <div className="form-group">
          <label>Tipo de Datos a Importar</label>
          <select 
            className="form-control"
            value={importType}
            onChange={e => setImportType(e.target.value as any)}
            disabled={isImporting}
          >
            <option value="alumnos">Alumnos (Alta/Modificación)</option>
            <option value="inscripciones">Inscripciones a Cursos</option>
            <option value="cursos">Cursos (Catálogo)</option>
            <option value="fechas">Fechas de Cursos</option>
          </select>
        </div>

        <div className="form-group">
          <label>Seleccionar Archivo (Excel o CSV)</label>
          <input 
            type="file" 
            className="form-control" 
            accept=".xlsx, .xls, .xlsm, .csv" 
            onChange={handleImportFileChange}
            disabled={isImporting}
          />
        </div>

        {sheetNames.length > 1 && (
          <div className="form-group">
            <label>Seleccionar Hoja de Excel (Pestaña)</label>
            <select 
              className="form-control"
              value={selectedSheet}
              onChange={e => handleSheetChange(e.target.value)}
              disabled={isImporting}
            >
              {sheetNames.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {selectedSheet && parsedData.length === 0 && (
          <p style={{ color: 'var(--danger-text)', fontSize: '0.9rem', textAlign: 'center', marginTop: '15px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <AlertTriangle size={16} /> La hoja "{selectedSheet}" no contiene registros válidos en formato de tabla o está vacía. Selecciona otra pestaña en la lista superior.
          </p>
        )}

        {parsedData.length > 0 && (
          <div>
            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              <strong>Vista Previa (Primeras 5 filas):</strong> {parsedData.length} registros cargados en memoria.
            </p>
            <div className="preview-table-wrapper">
              <table className="listbox-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {Object.keys(parsedData[0]).map((k, idx) => (
                      <th key={idx}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {Object.values(row).map((v: any, valIdx) => (
                        <td key={valIdx}>{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen de Mapeo Detectado */}
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--card-bg, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
              <strong>Detección automática de columnas (1ª fila de prueba):</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '8px' }}>
                <div><strong>DNI:</strong> {String(getRowVal(parsedData[0], ['dni', 'documento']) || '❌ No detectado')}</div>
                <div><strong>Apellido:</strong> {String(getRowVal(parsedData[0], ['apellido']) || '❌ No detectado')}</div>
                <div><strong>Nombre:</strong> {String(getRowVal(parsedData[0], ['nombre']) || '❌ No detectado')}</div>
                <div><strong>Email:</strong> {String(getRowVal(parsedData[0], ['email', 'e-mail', 'correo']) || '—')}</div>
                <div><strong>Unidad Académica / Dep.:</strong> <span style={{ color: 'var(--primary, #3b82f6)', fontWeight: 600 }}>{String(getRowVal(parsedData[0], ['unidad academica / dependencia', 'unidad academica', 'facultad']) || '❌ No detectado')}</span></div>
                <div><strong>Área de trabajo:</strong> <span style={{ color: '#10b981', fontWeight: 600 }}>{String(getRowVal(parsedData[0], ['area de trabajo', 'area']) || '❌ No detectado')}</span></div>
                <div><strong>Cargo/Función:</strong> {String(getRowVal(parsedData[0], ['cargo o funcion', 'cargo']) || '—')}</div>
              </div>
            </div>

            {!isImporting ? (
              <button 
                className="btn-primary" 
                style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                onClick={executeImport}
              >
                <Database size={16} /> Iniciar Importación a Firestore
              </button>
            ) : (
              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
                  {importProgress.status}
                </p>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
