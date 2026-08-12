const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Excel File path
const excelPath = path.join(__dirname, 'SIGA2026.xlsm');
const backupPath = path.join(__dirname, 'siga_data_backup.json');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

console.log('--- STARTING EXCEL PARSING ---');

if (!fs.existsSync(excelPath)) {
    console.error(`Error: Excel file not found at ${excelPath}`);
    process.exit(1);
}

const workbook = XLSX.readFile(excelPath);

// Helper function to convert Excel date serial to Date object
function excelDateToJSDate(serial) {
    if (!serial) return null;
    // Excel serial dates: 1 is Jan 1, 1900. 25569 is Jan 1, 1970
    if (typeof serial !== 'number') return serial;
    try {
        const utc_days  = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        
        // Add fractional day for time
        const fractional_day = serial - Math.floor(serial) + 0.0000001;
        let total_seconds = Math.floor(86400 * fractional_day);
        const seconds = total_seconds % 60;
        total_seconds -= seconds;
        const hours = Math.floor(total_seconds / 3600);
        const minutes = Math.floor(total_seconds / 60) % 60;
        
        // Return UTC offset corrected local date
        const localDate = new Date(
            date_info.getUTCFullYear(),
            date_info.getUTCMonth(),
            date_info.getUTCDate(),
            hours,
            minutes,
            seconds
        );
        return localDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } catch (e) {
        return null;
    }
}

// 1. Parse Alumnos
console.log('Parsing "alumnos" sheet...');
const sheetAlumnos = workbook.Sheets['alumnos'];
const rawAlumnos = XLSX.utils.sheet_to_json(sheetAlumnos);
const alumnos = rawAlumnos.map(row => {
    // Collect Media channels
    const medios = [];
    if (row['Medio1']) medios.push(row['Medio1']);
    if (row['Medio2']) medios.push(row['Medio2']);
    if (row['Medio3']) medios.push(row['Medio3']);
    if (row['Medio4']) medios.push(row['Medio4']);
    if (row['Medio5']) medios.push(row['Medio5']);
    if (row['Medio6']) medios.push(row['Medio6']);

    return {
        dni: row['DNI'] ? Number(row['DNI']) : null,
        apellido: row['APELLIDO'] ? String(row['APELLIDO']).trim() : '',
        nombre: row['NOMBRE'] ? String(row['NOMBRE']).trim() : '',
        fechaNac: excelDateToJSDate(row['FechaNac']),
        edad: row['Edad'] ? Math.round(Number(row['Edad'])) : null,
        telPart: row['TelPart'] ? String(row['TelPart']).trim() : '',
        nivelEstudio: row['Nivel Estudio'] ? String(row['Nivel Estudio']).trim() : 'Sin dato',
        titulo: row['Título'] ? String(row['Título']).trim() : '',
        unidadAcademica: row['Unidad Académica'] ? String(row['Unidad Académica']).trim() : 'Sin dato',
        area: row['Area'] ? String(row['Area']).trim() : '',
        cargoFuncion: row['Cargo/Funcion'] ? String(row['Cargo/Funcion']).trim() : '',
        personas: row['Personas'] ? Number(row['Personas']) : null,
        email: row['Email'] ? String(row['Email']).trim().toLowerCase() : '',
        telLab: row['TelLab'] ? String(row['TelLab']).trim() : '',
        interno: row['Interno'] ? String(row['Interno']).trim() : '',
        medios: medios
    };
}).filter(a => a.dni);

// 2. Parse Cursos
console.log('Parsing "Cursos" sheet...');
const sheetCursos = workbook.Sheets['Cursos'];
const rawCursos = XLSX.utils.sheet_to_json(sheetCursos);
const cursos = rawCursos.map(row => {
    return {
        idCurso: row['Id-Curso'] ? Number(row['Id-Curso']) : null,
        curso: row['Curso'] ? String(row['Curso']).trim() : '',
        programa: row['Programa'] ? String(row['Programa']).trim() : '',
        cargaHoraria: row['Carga horaria\r\nhs reloj'] ? String(row['Carga horaria\r\nhs reloj']).trim() : '',
        plan: row['Plan del curso'] ? String(row['Plan del curso']).trim() : '',
        idDocente: row['Id_Docente'] ? Number(row['Id_Docente']) : null,
        expediente: row['Expdte'] ? String(row['Expdte']).trim() : '',
        fechaPresentacion: excelDateToJSDate(row['Fecha \r\npresentación']),
        resolucion: row['Resolucion'] ? String(row['Resolucion']).trim() : '',
        fechaNotificacion: excelDateToJSDate(row['Fecha de \r\nnotificación'])
    };
}).filter(c => c.idCurso);

// 3. Parse Docentes
console.log('Parsing "Docentes" sheet...');
const sheetDocentes = workbook.Sheets['Docentes'];
const rawDocentes = XLSX.utils.sheet_to_json(sheetDocentes);
const docentes = rawDocentes.map(row => {
    return {
        idDocente: row['Id-docente'] ? Number(row['Id-docente']) : null,
        dni: row['DNI'] ? Number(row['DNI']) : null,
        apellido: row['Apellido'] ? String(row['Apellido']).trim() : '',
        nombre: row['Nombre'] ? String(row['Nombre']).trim() : '',
        email: row['Email'] ? String(row['Email']).trim().toLowerCase() : '',
        celular: row['Celular'] ? String(row['Celular']).trim() : ''
    };
}).filter(d => d.idDocente);

// 4. Parse Fechas
console.log('Parsing "Fechas" sheet...');
const sheetFechas = workbook.Sheets['Fechas'];
const rawFechas = XLSX.utils.sheet_to_json(sheetFechas);
const fechas = rawFechas.map(row => {
    return {
        idCurso: row['Id-Curso'] ? Number(row['Id-Curso']) : null,
        curso: row['Curso'] ? String(row['Curso']).trim() : '',
        inicio: excelDateToJSDate(row['Inicio']),
        certificado: excelDateToJSDate(row['Certificado'])
    };
}).filter(f => f.idCurso && f.inicio);

// 5. Parse Facultades
console.log('Parsing "fac" sheet...');
const sheetFac = workbook.Sheets['fac'];
const rawFac = XLSX.utils.sheet_to_json(sheetFac);
const facultades = rawFac.map(row => {
    return {
        idFac: row['Id_Fac'] ? Number(row['Id_Fac']) : null,
        facultad: row['Facultad'] ? String(row['Facultad']).trim() : ''
    };
}).filter(f => f.idFac);

// 6. Parse Inscripciones (Merge AxC & AxC26)
console.log('Parsing "AxC" and "AxC26" sheets for registrations...');
const sheetAxC = workbook.Sheets['AxC'];
const rawAxC = XLSX.utils.sheet_to_json(sheetAxC);

const sheetAxC26 = workbook.Sheets['AxC26'];
const rawAxC26 = XLSX.utils.sheet_to_json(sheetAxC26);

const inscripcionesMap = new Map();

// Load AxC registrations
rawAxC.forEach(row => {
    const dni = row['DNI'] ? Number(row['DNI']) : null;
    const curso = row['Curso'] ? String(row['Curso']).trim() : '';
    const fechaInicio = excelDateToJSDate(row['Fecha inicio']);
    if (!dni || !curso || !fechaInicio) return;

    const key = `${dni}_${curso}_${fechaInicio}`;
    inscripcionesMap.set(key, {
        dni: dni,
        apellido: row['Apellido'] ? String(row['Apellido']).trim() : '',
        nombre: row['Nombre'] ? String(row['Nombre']).trim() : '',
        curso: curso,
        fechaInicio: fechaInicio,
        resultado: 'Cursando', // Default for older records
        ua: row['UA'] ? Number(row['UA']) : 999, // default to Sin dato
        email: row['Email'] ? String(row['Email']).trim().toLowerCase() : ''
    });
});

// Load/Overwrites with AxC26 registrations which are more detailed
rawAxC26.forEach(row => {
    const dni = row['DNI'] ? Number(row['DNI']) : null;
    const curso = row['Curso'] ? String(row['Curso']).trim() : '';
    const fechaInicio = excelDateToJSDate(row['Fecha inicio']);
    if (!dni || !curso || !fechaInicio) return;

    const key = `${dni}_${curso}_${fechaInicio}`;
    inscripcionesMap.set(key, {
        dni: dni,
        apellido: row['Apellido'] ? String(row['Apellido']).trim() : '',
        nombre: row['Nombre'] ? String(row['Nombre']).trim() : '',
        curso: curso,
        fechaInicio: fechaInicio,
        resultado: row['Resultado'] ? String(row['Resultado']).trim() : 'Cursando',
        ua: row['UA'] ? Number(row['UA']) : 999,
        email: row['Email'] ? String(row['Email']).trim().toLowerCase() : ''
    });
});

const inscripciones = Array.from(inscripcionesMap.values());

const backupData = {
    alumnos,
    cursos,
    docentes,
    fechas,
    facultades,
    inscripciones
};

console.log(`Summary of parsed data:
- Alumnos: ${alumnos.length}
- Cursos: ${cursos.length}
- Docentes: ${docentes.length}
- Fechas: ${fechas.length}
- Facultades: ${facultades.length}
- Inscripciones: ${inscripciones.length}`);

// Write JSON backup
fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
console.log(`Saved local JSON backup to: ${backupPath}`);

// Try uploading to Firebase Firestore if serviceAccountKey.json is present
if (fs.existsSync(serviceAccountPath)) {
    console.log('Firebase Service Account Key found! Starting Firestore upload...');
    const { initializeApp, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    
    initializeApp({
        credential: cert(serviceAccountPath)
    });
    
    const db = getFirestore();
    
    async function uploadCollection(collectionName, items, idField) {
        console.log(`Uploading ${items.length} items to collection "${collectionName}"...`);
        const batchSize = 400;
        let batch = db.batch();
        let count = 0;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let docRef;
            if (idField && item[idField]) {
                docRef = db.collection(collectionName).doc(String(item[idField]));
            } else {
                docRef = db.collection(collectionName).doc(); // auto ID
            }
            
            batch.set(docRef, item);
            count++;
            
            if (count >= batchSize) {
                await batch.commit();
                console.log(`  Uploaded ${i + 1}/${items.length} items...`);
                batch = db.batch();
                count = 0;
            }
        }
        
        if (count > 0) {
            await batch.commit();
        }
        console.log(`Successfully uploaded collection "${collectionName}"!`);
    }
    
    async function main() {
        try {
            // Upload small collections first
            await uploadCollection('facultades', facultades, 'idFac');
            await uploadCollection('docentes', docentes, 'idDocente');
            await uploadCollection('cursos', cursos, 'idCurso');
            await uploadCollection('fechas', fechas, null); // auto-ID
            
            // Upload large collections
            await uploadCollection('alumnos', alumnos, 'dni');
            await uploadCollection('inscripciones', inscripciones, null); // auto-ID
            
            console.log('--- ALL FIRESTORE UPLOADS COMPLETED SUCCESSFULLY ---');
            process.exit(0);
        } catch (err) {
            console.error('Error during Firestore upload:', err);
            process.exit(1);
        }
    }
    
    main();
} else {
    console.log(`
========================================================================
WARNING: "serviceAccountKey.json" was not found in the root directory.
VBA data was parsed and saved to local file: siga_data_backup.json

To upload this backup to your live Firestore database:
1. Go to Firebase Console -> Project Settings -> Service Accounts.
2. Click "Generate new private key".
3. Save the downloaded file as "serviceAccountKey.json" in this directory:
   d:\\1_Centro\\2026\\serviceAccountKey.json
4. Run this script again: node import_to_firestore.js
========================================================================
`);
}
