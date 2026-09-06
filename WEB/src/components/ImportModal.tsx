import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { setDoc, doc, collection, addDoc, query, where, getDocs, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Download, Database, AlertTriangle } from 'lucide-react';

import { excelDateToJSDate } from '../utils/date';
import { useModal } from './ModalProvider';
import { toTitleCase } from '../utils/text';
import { normalizeResultado } from '../utils/inscripciones';

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
  const { alert, confirm } = useModal();
  const [importType, setImportType] = useState<'alumnos' | 'inscripciones' | 'cursos' | 'fechas'>(defaultType);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [isImporting, setIsImporting] = useState(false);
  // Reemplazar tabla: al terminar, elimina los registros que no vinieron en el archivo
  const [replaceAll, setReplaceAll] = useState(false);

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

  // Interpreta la columna "Visible en principal" del Excel exportado (Sí/No, true/false, 1/0)
  const parseVisible = (val: unknown): boolean | undefined => {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const norm = String(val).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['si', 's', 'true', '1', 'verdadero', 'visible', 'x', 'mostrar'].includes(norm)) return true;
    if (['no', 'n', 'false', '0', 'falso', 'oculto', 'ocultar'].includes(norm)) return false;
    return undefined;
  };

  const executeImport = async () => {
    if (parsedData.length === 0) return;
    if (replaceAll) {
      const ok = await confirm({
        title: 'Reemplazar tabla completa',
        message: `Al finalizar, se ELIMINARÁN todos los registros de ${importType} que no estén en este archivo.\n\nEsta acción no se puede deshacer. ¿Continuar?`,
        variant: 'danger',
        confirmText: 'Sí, reemplazar',
        cancelText: 'Cancelar',
      });
      if (!ok) return;
    }
    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedData.length, status: 'Iniciando importación...' });

    let count = 0;
    const stats = { created: 0, updated: 0, dupsRemoved: 0, cursosUpdated: 0, cursosCreated: 0, alumnosCreados: 0, deleted: 0 };
    // IDs tocados por el archivo (para el modo reemplazo)
    const touchedIds = new Set<string>();
    // Cache de existencia en el padrón para no releer DNIs repetidos del lote
    const padronCache = new Map<string, boolean>();
    try {
      // Cargar cursos existentes para verificar coincidencias, evitar duplicados y sincronizar resoluciones
      const cursosSnap = await getDocs(collection(db, 'cursos'));
      const cachedCursos: Array<{
        id: string; // docId
        idCurso: number;
        curso: string;
        nombreCompleto?: string;
        resolucion?: string;
        [key: string]: any;
      }> = cursosSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // Docentes existentes (para resolver el Docente Coordinador al importar cursos)
      let cachedDocentes: any[] = [];
      if (importType === 'cursos') {
        const docSnap = await getDocs(collection(db, 'docentes'));
        cachedDocentes = docSnap.docs.map(d => d.data());
      }

      // Fechas existentes (para resolver el fechaId al importar inscripciones)
      let cachedFechas: any[] = [];
      if (importType === 'inscripciones') {
        const fSnap = await getDocs(collection(db, 'fechas'));
        cachedFechas = fSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      }

      const matchDocente = (idVal?: number, nameVal?: string) => {
        if (idVal) {
          const byId = cachedDocentes.find(d => Number(d.idDocente) === Number(idVal));
          if (byId) return byId;
        }
        const raw = (nameVal || '').trim();
        if (raw) {
          const norm = normalizeKey(raw);
          const byName = cachedDocentes.find(d => {
            const variants = [
              `${d.apellido || ''}, ${d.nombre || ''}`,
              `${d.apellido || ''} ${d.nombre || ''}`,
              `${d.nombre || ''} ${d.apellido || ''}`
            ];
            return variants.some(v => v.trim().toLowerCase() === raw.toLowerCase() || (normalizeKey(v) !== '' && normalizeKey(v) === norm));
          });
          if (byName) return byName;
        }
        return undefined;
      };

      // Busca el docente por ID o nombre; si no existe y hay nombre, lo da de alta
      const ensureDocente = async (idVal?: number, nameVal?: string) => {
        const found = matchDocente(idVal, nameVal);
        if (found) return found;
        const raw = (nameVal || '').trim();
        if (!raw) return undefined;
        let apellido = '';
        let nombre = '';
        if (raw.includes(',')) {
          const parts = raw.split(',').map(s => s.trim());
          apellido = parts[0] || '';
          nombre = parts[1] || '';
        } else {
          const parts = raw.split(/\s+/).filter(Boolean);
          apellido = parts[0] || '';
          nombre = parts.slice(1).join(' ');
        }
        const maxId = cachedDocentes.length > 0 ? Math.max(...cachedDocentes.map(d => Number(d.idDocente) || 0)) : 0;
        const newId = (idVal && idVal > maxId) ? idVal : (maxId + 1);
        const newDoc = {
          idDocente: newId,
          apellido: toTitleCase(apellido),
          nombre: toTitleCase(nombre),
          email: '',
          celular: ''
        };
        await setDoc(doc(db, 'docentes', String(newId)), newDoc);
        cachedDocentes.push(newDoc);
        return newDoc;
      };

      const matchCurso = (nameOrId: { idCurso?: number; nombre?: string }) => {
        if (nameOrId.idCurso) {
          const byId = cachedCursos.find(c => Number(c.idCurso) === Number(nameOrId.idCurso));
          if (byId) return byId;
        }
        if (nameOrId.nombre) {
          const raw = nameOrId.nombre.trim();
          const norm = normalizeKey(raw);
          if (!norm) return undefined;

          // 1. Coincidencia exacta insensible a mayúsculas
          const exact = cachedCursos.find(c =>
            (c.curso && c.curso.trim().toLowerCase() === raw.toLowerCase()) ||
            (c.nombreCompleto && c.nombreCompleto.trim().toLowerCase() === raw.toLowerCase())
          );
          if (exact) return exact;

          // 2. Coincidencia normalizada sin tildes ni símbolos
          const normMatch = cachedCursos.find(c => {
            const cNorm = normalizeKey(c.curso || '');
            const ncNorm = normalizeKey(c.nombreCompleto || '');
            return (cNorm && cNorm === norm) || (ncNorm && ncNorm === norm);
          });
          if (normMatch) return normMatch;
        }
        return undefined;
      };

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
          touchedIds.add(String(dniVal));
        } else if (importType === 'inscripciones') {
          if (!dniVal) continue;
          const rawCurso = String(getVal(['curso', 'nombre curso', 'capacitacion', 'taller', 'seminario']) || '').trim();
          const rawRes = String(getVal([
            'resolucion', 'resolución', 'res', 'nro resolucion', 'nro resolución',
            'numero resolucion', 'resolucion nro', 'resolucion n', 'resolucion del curso',
            'resolución del curso', 'res.', 'res. nro', 'expediente', 'expdte'
          ]) || '').trim();
          const rawIdCurso = getVal(['idcurso', 'id_curso', 'id curso', 'id']);
          const idCursoVal = rawIdCurso ? Number(rawIdCurso) : undefined;
          const fechaInicioVal = excelDateToJSDate(getVal(['fecha inicio', 'fecha', 'inicio', 'fechainicio', 'fecha de inicio']) || '');

          // Sincronización con tabla Cursos (normalizado: programa/nombre/carga/resolución
          // viven en el curso, no en la inscripción).
          // Si el curso ya existe, NO crear uno nuevo: actualizarle la resolución del lote.
          let matchedCurso = matchCurso({ idCurso: idCursoVal, nombre: rawCurso });
          if (rawCurso) {
            if (matchedCurso) {
              if (rawRes && matchedCurso.resolucion !== rawRes) {
                await setDoc(doc(db, 'cursos', matchedCurso.id), { resolucion: rawRes }, { merge: true });
                matchedCurso.resolucion = rawRes;
                stats.cursosUpdated++;
              }
            } else {
              // Si el curso no existía, se crea para no perder la referencia
              const maxId = cachedCursos.length > 0 ? Math.max(...cachedCursos.map(c => Number(c.idCurso) || 0), 0) : 0;
              const newId = idCursoVal || (maxId + 1);
              const newCursoObj = {
                idCurso: newId,
                curso: rawCurso,
                nombreCompleto: rawCurso,
                programa: '',
                cargaHoraria: '',
                resolucion: rawRes,
                showOnLanding: true
              };
              await setDoc(doc(db, 'cursos', String(newId)), newCursoObj);
              matchedCurso = { id: String(newId), ...newCursoObj };
              cachedCursos.push(matchedCurso);
              stats.cursosCreated++;
            }
          }
          if (!matchedCurso) continue;

          // Resolver (o crear) el documento de `fechas` para obtener su docId.
          let fechaIdVal: string | undefined;
          if (fechaInicioVal) {
            const foundFecha = cachedFechas.find(f =>
              String(f.idCurso) === String(matchedCurso.idCurso) && String(f.inicio || '') === String(fechaInicioVal)
            );
            if (foundFecha) {
              fechaIdVal = foundFecha.id;
            } else {
              const ref = await addDoc(collection(db, 'fechas'), {
                idCurso: matchedCurso.idCurso,
                curso: matchedCurso.nombreCompleto || matchedCurso.curso,
                inicio: fechaInicioVal,
                certificado: '',
                cantidadClases: 4
              });
              fechaIdVal = ref.id;
              cachedFechas.push({ id: ref.id, idCurso: matchedCurso.idCurso, inicio: fechaInicioVal });
            }
          }
          if (!fechaIdVal) continue;

          // Inscripción normalizada: solo referencias + condición.
          // Alta en el padrón si el DNI no existe (merge, sin pisar datos).
          // Solo si el alta falla, apellido/nombre quedan como respaldo aquí.
          const apellidoRow = toTitleCase(String(getVal(['apellido', 'apellidos', 'surname', 'last name']) || '').trim());
          const nombreRow = toTitleCase(String(getVal(['nombre', 'nombres', 'name', 'first name']) || '').trim());
          let altaOk = true;
          try {
            let existe = padronCache.get(String(dniVal));
            if (existe === undefined) {
              const aSnap = await getDoc(doc(db, 'alumnos', String(dniVal)));
              existe = aSnap.exists();
              padronCache.set(String(dniVal), existe);
            }
            if (!existe) {
              const alta: any = { dni: dniVal };
              if (apellidoRow) alta.apellido = apellidoRow;
              if (nombreRow) alta.nombre = nombreRow;
              await setDoc(doc(db, 'alumnos', String(dniVal)), alta, { merge: true });
              padronCache.set(String(dniVal), true);
              stats.alumnosCreados++;
            }
          } catch {
            altaOk = false;
          }
          const insData: any = {
            dni: dniVal,
            idCurso: matchedCurso.idCurso,
            fechaId: fechaIdVal,
            resultado: normalizeResultado(getVal(['resultado', 'estado', 'condicion', 'situacion', 'condición', 'situación']))
          };
          if (!altaOk) {
            if (apellidoRow) insData.apellido = apellidoRow;
            if (nombreRow) insData.nombre = nombreRow;
          }

          // Dedupe por DNI (sin índice compuesto): filtrar en memoria por clave
          // normalizada (idCurso + fechaId) con fallback legacy (curso + fechaInicio).
          const qDni = query(collection(db, 'inscripciones'), where('dni', '==', dniVal));
          const snapDni = await getDocs(qDni);
          const cursoNombreDoc = matchedCurso.nombreCompleto || matchedCurso.curso;
          const matches = snapDni.docs.filter(s => {
            const r: any = s.data();
            return (String(r.idCurso ?? '') === String(matchedCurso.idCurso) && String(r.fechaId ?? '') === String(fechaIdVal)) ||
              ((r.curso || '') === rawCurso && (r.fechaInicio || '') === fechaInicioVal) ||
              ((r.curso || '') === cursoNombreDoc && (r.fechaInicio || '') === fechaInicioVal);
          });
          if (matches.length > 0) {
            // Pisar con overwrite (limpia campos legacy) conservando asistencias
            const prevData: any = matches[0].data();
            if (prevData.asistencias && Object.keys(prevData.asistencias).length > 0) {
              insData.asistencias = prevData.asistencias;
            }
            await setDoc(doc(db, 'inscripciones', matches[0].id), insData);
            touchedIds.add(matches[0].id);
            stats.updated++;
            for (const extra of matches.slice(1)) {
              await deleteDoc(extra.ref);
              stats.dupsRemoved++;
            }
          } else {
            const newRef = await addDoc(collection(db, 'inscripciones'), insData);
            touchedIds.add(newRef.id);
            stats.created++;
          }
        } else if (importType === 'cursos') {
          const rawIdCurso = getVal(['idcurso', 'id', 'id_curso', 'id curso']);
          const idCursoVal = rawIdCurso ? Number(rawIdCurso) : undefined;
          const cursoNombre = String(getVal(['curso', 'nombre', 'nombre curso', 'nombre del curso', 'nombre corto']) || '').trim();
          const nombreCompleto = String(getVal(['nombre completo', 'nombrecompleto', 'nombre largo', 'titulo completo', 'nombre curso completo']) || cursoNombre).trim();
          const resolucionVal = String(getVal([
            'resolucion', 'resolución', 'res', 'nro resolucion', 'nro resolución',
            'numero resolucion', 'resolucion nro', 'resolucion n', 'resolucion del curso',
            'resolución del curso', 'res.', 'res. nro', 'expediente', 'expdte'
          ]) || '').trim();
          const rawIdDoc = getVal(['id docente', 'iddocente', 'id_docente']);
          const idDocVal = rawIdDoc ? Number(rawIdDoc) : undefined;
          const rawDocName = String(getVal(['docente coordinador', 'docente', 'capacitador', 'capacitador/a', 'docente a cargo']) || '').trim();
          const visibleVal = parseVisible(getVal(['visible en principal', 'visible', 'mostrar', 'showonlanding', 'publicado']));

          const targetName = cursoNombre || nombreCompleto;
          if (targetName) {
            const existing = matchCurso({ idCurso: idCursoVal, nombre: targetName });
            // Resolver docente solo si la fila trae dato (evita altas innecesarias)
            const docFound = (idDocVal || rawDocName) ? await ensureDocente(idDocVal, rawDocName) : undefined;
            const docenteData: any = {};
            if (docFound) {
              docenteData.idDocente = docFound.idDocente;
              docenteData.docenteNombre = `${docFound.apellido}, ${docFound.nombre}`;
            }
            if (existing) {
              // Si el curso ya existe: NO CREAR UNO NUEVO, actualizar la resolución y datos del lote
              const updateData: any = {};
              if (resolucionVal) updateData.resolucion = resolucionVal;
              const prog = String(getVal(['programa', 'area']) || '').trim();
              if (prog) updateData.programa = prog;
              const carga = String(getVal(['cargahoraria', 'carga horaria', 'horas', 'hs', 'cantidad de clases', 'cantidad clases', 'cant clases', 'cantidadclases', 'clases', 'numero de clases', 'nro clases']) || '').trim();
              if (carga) updateData.cargaHoraria = carga;
              if (nombreCompleto && nombreCompleto !== existing.nombreCompleto) {
                updateData.nombreCompleto = nombreCompleto;
              }
              Object.assign(updateData, docenteData);
              if (visibleVal !== undefined) updateData.showOnLanding = visibleVal;

              if (Object.keys(updateData).length > 0) {
                await setDoc(doc(db, 'cursos', existing.id), updateData, { merge: true });
                if (resolucionVal) existing.resolucion = resolucionVal;
                stats.cursosUpdated++;
              }
              touchedIds.add(existing.id);
            } else {
              // Si el curso no existe, crearlo asignando nuevo ID único
              const maxId = cachedCursos.length > 0 ? Math.max(...cachedCursos.map(c => Number(c.idCurso) || 0), 0) : 0;
              const newId = idCursoVal || (maxId + 1);
              const cursoData: any = {
                idCurso: newId,
                curso: cursoNombre || nombreCompleto,
                nombreCompleto: nombreCompleto || cursoNombre,
                programa: String(getVal(['programa', 'area']) || '').trim(),
                cargaHoraria: String(getVal(['cargahoraria', 'carga horaria', 'horas', 'hs', 'cantidad de clases', 'cantidad clases', 'cant clases', 'cantidadclases', 'clases', 'numero de clases', 'nro clases']) || '').trim(),
                resolucion: resolucionVal,
                idDocente: docenteData.idDocente ?? null,
                docenteNombre: docenteData.docenteNombre || '',
                showOnLanding: visibleVal !== undefined ? visibleVal : true
              };
              await setDoc(doc(db, 'cursos', String(newId)), cursoData, { merge: true });
              touchedIds.add(String(newId));
              cachedCursos.push({ id: String(newId), ...cursoData });
              stats.cursosCreated++;
            }
          }
        } else if (importType === 'fechas') {
          const idCursoVal = Number(getVal(['idcurso', 'id', 'id_curso', 'id curso']) || 0);
          const cursoName = String(getVal(['curso', 'nombre', 'nombre del curso']) || '').trim();
          const inicioVal = excelDateToJSDate(getVal(['inicio', 'fechainicio', 'fecha inicio', 'fecha de inicio', 'fecha']) || '');
          const certVal = excelDateToJSDate(getVal(['certificado', 'fechacertificado', 'fecha certificado', 'fecha de certificado']) || '');
          const cantVal = getVal(['cant. clases', 'cantidad de clases', 'cantidad clases', 'cant clases', 'clases', 'cantidadclases']);
          const urlVal = String(getVal(['url inscripción', 'url inscripcion', 'url formulario', 'url', 'link formulario', 'inscripcionurl']) || '').trim();
          const visibleVal = parseVisible(getVal(['visible en principal', 'visible', 'mostrar', 'showonlanding']));
          if (inicioVal) {
            const fechaData: any = {
              idCurso: idCursoVal,
              curso: cursoName,
              inicio: inicioVal,
              certificado: certVal || ''
            };
            if (cantVal !== undefined) {
              const n = Number(cantVal);
              if (n > 0) fechaData.cantidadClases = n;
            }
            if (urlVal) fechaData.inscripcionUrl = urlVal;
            if (visibleVal !== undefined) fechaData.showOnLanding = visibleVal;
            // Sin duplicar: si ya existe la fecha (mismo curso + inicio), se actualiza
            const q = query(
              collection(db, 'fechas'),
              where('idCurso', '==', idCursoVal),
              where('inicio', '==', inicioVal)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              await setDoc(doc(db, 'fechas', snap.docs[0].id), fechaData, { merge: true });
              touchedIds.add(snap.docs[0].id);
              stats.updated++;
            } else {
              const newFechaRef = await addDoc(collection(db, 'fechas'), {
                cantidadClases: 4,
                showOnLanding: true,
                ...fechaData
              });
              touchedIds.add(newFechaRef.id);
              stats.created++;
            }
          }
        }

        setImportProgress({
          current: count,
          total: parsedData.length,
          status: `Procesando fila ${count} de ${parsedData.length}...`
        });
      }

      // Modo reemplazo: eliminar los registros que no vinieron en el archivo.
      // Seguridad: si ninguna fila tocó la tabla (archivo vacío o todo omitido),
      // no se borra nada.
      if (replaceAll && touchedIds.size > 0) {
        setImportProgress({ current: count, total: count, status: 'Eliminando registros que no están en el archivo...' });
        const collName = importType === 'alumnos' ? 'alumnos'
          : importType === 'inscripciones' ? 'inscripciones'
          : importType === 'cursos' ? 'cursos' : 'fechas';
        const allSnap = await getDocs(collection(db, collName));
        let batch = writeBatch(db);
        let ops = 0;
        for (const d of allSnap.docs) {
          if (!touchedIds.has(d.id)) {
            batch.delete(d.ref);
            ops++;
            stats.deleted++;
            if (ops % 400 === 0) {
              await batch.commit();
              batch = writeBatch(db);
            }
          }
        }
        await batch.commit();
      }

      let doneMsg = `Importación completada con éxito. Se procesaron ${count} registros.`;
      if (importType === 'inscripciones') {
        doneMsg = `Importación completada con éxito. Se procesaron ${count} registros: ${stats.created} altas, ${stats.updated} actualizados (coincidencia DNI + Curso + Fecha), ${stats.dupsRemoved} duplicados eliminados, ${stats.alumnosCreados} alumnos dados de alta en el padrón.`;
        if (stats.cursosUpdated > 0 || stats.cursosCreated > 0) {
          doneMsg += `\n\nCursos: ${stats.cursosUpdated} actualizados con resolución${stats.cursosCreated > 0 ? `, ${stats.cursosCreated} nuevos dados de alta` : ''}.`;
        }
      } else if (importType === 'cursos') {
        doneMsg = `Importación de cursos completada con éxito: ${stats.cursosUpdated} cursos existentes actualizados con resolución (sin duplicar)${stats.cursosCreated > 0 ? `, ${stats.cursosCreated} cursos nuevos creados` : ''}.`;
      } else if (importType === 'fechas') {
        doneMsg = `Importación de fechas completada con éxito. Se procesaron ${count} registros: ${stats.created} altas, ${stats.updated} actualizados (coincidencia Curso + Fecha de inicio, sin duplicar).`;
      }
      if (replaceAll) {
        doneMsg += `\n\nModo reemplazo: se eliminaron ${stats.deleted} registros que no estaban en el archivo.`;
      }
      await alert({ title: 'Importación completada', message: doneMsg, variant: 'success' });
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
              <Download size={18} color="var(--accent)" /> Importar desde Excel / CSV
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
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.06)', fontSize: '0.82rem', cursor: 'pointer', lineHeight: 1.4 }}>
                  <input
                    type="checkbox"
                    checked={replaceAll}
                    onChange={e => setReplaceAll(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#dc2626', flexShrink: 0 }}
                  />
                  <span><strong>Reemplazar tabla completa:</strong> eliminar los registros de {importType} que no estén en este archivo.</span>
                </label>
                <button
                  className="btn-primary"
                  style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={executeImport}
                >
                  <Database size={16} /> Iniciar Importación a Firestore
                </button>
              </>
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
