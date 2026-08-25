import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { setDoc, doc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Upload, Database, AlertTriangle } from 'lucide-react';

import { excelDateToJSDate } from '../utils/date';

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
        alert('Error al leer el archivo. Asegúrese de que sea un archivo de Excel o CSV válido.');
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

  const executeImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedData.length, status: 'Iniciando importación...' });

    let count = 0;
    try {
      for (const row of parsedData) {
        count++;
        const rowLower: any = {};
        Object.keys(row).forEach(k => {
          rowLower[k.toLowerCase().trim()] = row[k];
        });

        const dniVal = Number(rowLower['dni'] || rowLower['documento'] || rowLower['nro doc'] || rowLower['nro de documento'] || 0);

        if (importType === 'alumnos') {
          if (!dniVal) continue;
          
          // Construct student data dynamically using only present spreadsheet columns to preserve other DB fields
          const studentData: any = {
            dni: dniVal
          };

          const setIfPresent = (keys: string[], targetKey: string, transform?: (val: any) => any) => {
            for (const key of keys) {
              if (rowLower[key] !== undefined) {
                studentData[targetKey] = transform ? transform(rowLower[key]) : rowLower[key];
                break;
              }
            }
          };

          setIfPresent(['apellido', 'apellidos'], 'apellido', (v) => String(v).toUpperCase().trim());
          setIfPresent(['nombre', 'nombres'], 'nombre', (v) => String(v).toUpperCase().trim());
          setIfPresent(['fecha nac', 'nacimiento', 'fechanac'], 'fechaNac', (v) => excelDateToJSDate(v));
          setIfPresent(['edad'], 'edad', (v) => Number(v) || 0);
          setIfPresent(['tel part', 'telefono', 'telpart'], 'telPart', (v) => String(v).trim());
          setIfPresent(['nivel estudio', 'estudios', 'nivelestudio'], 'nivelEstudio', (v) => String(v).trim());
          setIfPresent(['titulo'], 'titulo', (v) => String(v).trim());
          setIfPresent(['unidad academica', 'facultad', 'dependencia', 'unidadacademica'], 'unidadAcademica', (v) => String(v).trim());
          setIfPresent(['direccion u oficina', 'direccion', 'oficina', 'direccionoficina'], 'direccionOficina', (v) => String(v).trim());
          setIfPresent(['area'], 'area', (v) => String(v).trim());
          setIfPresent(['cargo', 'funcion', 'cargofuncion'], 'cargoFuncion', (v) => String(v).trim());
          setIfPresent(['personas'], 'personas', (v) => Number(v) || 0);
          setIfPresent(['email', 'correo'], 'email', (v) => String(v).toLowerCase().trim());
          setIfPresent(['tel lab', 'tellab'], 'telLab', (v) => String(v).trim());
          setIfPresent(['interno'], 'interno', (v) => String(v).trim());

          await setDoc(doc(db, 'alumnos', String(dniVal)), studentData, { merge: true });
        } else if (importType === 'inscripciones') {
          const insData = {
            dni: dniVal,
            apellido: String(rowLower['apellido'] || '').toUpperCase().trim(),
            nombre: String(rowLower['nombre'] || '').toUpperCase().trim(),
            curso: String(rowLower['curso'] || '').trim(),
            fechaInicio: excelDateToJSDate(rowLower['fecha inicio'] || rowLower['fecha'] || ''),
            resultado: String(rowLower['resultado'] || rowLower['estado'] || 'Cursando').trim(),
            email: String(rowLower['email'] || '').toLowerCase().trim(),
            cargoFuncion: String(rowLower['cargo'] || ''),
            unidadAcademica: String(rowLower['unidad academica'] || rowLower['facultad'] || ''),
            ua: String(rowLower['ua'] || '')
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
          const idCursoVal = Number(rowLower['idcurso'] || rowLower['id'] || rowLower['id_curso'] || count);
          const cursoData: any = {
            idCurso: idCursoVal,
            curso: String(rowLower['curso'] || rowLower['nombre'] || '').trim(),
            programa: String(rowLower['programa'] || '').trim(),
            cargaHoraria: String(rowLower['cargahoraria'] || rowLower['carga horaria'] || rowLower['horas'] || '').trim(),
            resolucion: String(rowLower['resolucion'] || rowLower['resolución'] || '').trim(),
            showOnLanding: true
          };
          if (cursoData.curso) {
            await setDoc(doc(db, 'cursos', String(idCursoVal)), cursoData, { merge: true });
          }
        } else if (importType === 'fechas') {
          const idCursoVal = Number(rowLower['idcurso'] || rowLower['id'] || rowLower['id_curso'] || 0);
          const fechaData = {
            idCurso: idCursoVal,
            curso: String(rowLower['curso'] || '').trim(),
            inicio: excelDateToJSDate(rowLower['inicio'] || rowLower['fechainicio'] || rowLower['fecha inicio'] || ''),
            certificado: excelDateToJSDate(rowLower['certificado'] || rowLower['fechacertificado'] || rowLower['fecha certificado'] || '')
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

      alert(`Importación completada con éxito. Se procesaron ${count} registros.`);
      onImportComplete();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error durante la importación en la fila ${count}: ${message}`);
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
