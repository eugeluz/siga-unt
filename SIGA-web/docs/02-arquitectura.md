# Arquitectura — SIGA 2026

## ¿Qué es SIGA 2026?

SIGA 2026 es un sistema web que reemplaza los archivos de Excel con macros que se usaban antes para gestionar alumnos, cursos e inscripciones. En lugar de tener todo en un archivo que una sola persona podía usar a la vez, ahora funciona como una página web donde varios usuarios pueden acceder al mismo tiempo desde cualquier computadora o celular.

---

## La idea general

Imaginá que antes tenías un cuaderno Excel guardado en una computadora. Para hacer algo tenías que estar en esa máquina, abrir el archivo, y esperar que nadie más lo estuviera usando.

Ahora los datos están en **la nube** (Google Firebase). Esto significa que:

- **No se pierde nada** si se rompe la computadora
- **Varias personas** pueden usar el sistema al mismo tiempo
- **Se accede desde cualquier lado** con internet
- **No hay que instalar nada**, solo abrir el navegador

---

## Cómo se conectan las piezas

```
  TUS DATOS (Excel original)
         │
         ▼
  ┌─────────────────┐
  │  Script de carga │  ──  Un programa pasa los datos del Excel a la nube
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   Firebase      │  ──  La nube de Google donde viven los datos
  │   (la nube)     │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Página web     │  ──  La interfaz que ves en el navegador
  │  (SIGA 2026)    │
  └─────────────────┘
```

---

## Las partes del sistema

### 1. La página web (lo que ves)

Es una página moderna, rápida, que se ve bien tanto en computadora como en celular. Tiene un menú lateral con seis secciones:

| Sección               | ¿Para qué sirve?                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Inicio**       | Muestra un resumen: cuántos cursos, facultades y docentes hay cargados               |
| **Alumnos**      | Permite dar de alta, modificar y buscar alumnos. También importar listas desde Excel |
| **Inscripción** | Para inscribir a un alumno en un curso de capacitación                               |
| **Asistencia**   | Controlar asistencia y cargar resultados (aprobado, desaprobado, abandonó, etc.)     |
| **Historial**    | Consultar todo lo que cursó un alumno ingresando su DNI                              |
| **Facultades**   | Filtrar alumnos por facultad o dependencia y descargar informe                        |

### 2. La nube (donde se guarda la información)

Los datos se organizan en **seis carpetas** (Google las llama "colecciones"):

| Carpeta                 | Guarda...                                                      |
| ----------------------- | -------------------------------------------------------------- |
| **alumnos**       | Datos personales de cada alumno (DNI, nombre, teléfono, etc.) |
| **cursos**        | El catálogo de cursos de capacitación disponibles            |
| **docentes**      | Quiénes son los docentes coordinadores                        |
| **fechas**        | Cuándo empieza cada curso                                     |
| **facultades**    | Lista de facultades o dependencias                             |
| **inscripciones** | Quién está anotado en qué curso y cómo le fue              |

### 3. El puente entre el Excel y la nube

Hay un **programa especial** (`import_to_firestore.js`) que se encarga de leer el archivo Excel original (SIGA2026.xlsm), separar cada hoja en su carpeta correspondiente y subir todo a la nube. Esto solo hace falta una vez para la carga inicial o cuando se quiere actualizar la base de datos completa.

---

## Cómo funciona el sistema paso a paso

### Ingreso al sistema

1. Abrís la página web
2. Te aparece una pantalla de **inicio de sesión**
3. Ingresás con tu correo electrónico y contraseña
4. Una vez adentro, ves el panel principal con los datos

### Una vez adentro

- Los números que ves en **Inicio** (cantidad de cursos, etc.) se actualizan solos a medida que cambia la información
- Cada sección del menú es independiente: podés pasar de Alumnos a Inscripción sin perder lo que estabas haciendo

### Para cargar datos nuevos

Si tenés una planilla Excel con alumnos, podés:

1. Ir a la sección **Alumnos**
2. Hacer clic en "Importar"
3. Seleccionar el archivo
4. Elegir si son alumnos o inscripciones
5. El sistema lo procesa y lo guarda automáticamente en la nube

---

## Seguridad

No cualquiera puede entrar al sistema. Solo los usuarios que tengan una cuenta (correo y contraseña) pueden acceder. Toda la comunicación entre la página y la nube está encriptada.

Los datos sensibles (API keys, credenciales) nunca están en el código de la página: se configuran como variables de entorno en un archivo `.env` que no se sube al repositorio.

---

## Anexo Técnico

### Diagrama de Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                        Cliente (Browser)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    index.html                                │ │
│  │                    src/main.tsx                              │ │
│  │                    ReactDOM.createRoot                       │ │
│  └───────────────────────┬──────────────────────────────────────┘ │
│                          │                                        │
│  ┌───────────────────────▼──────────────────────────────────────┐ │
│  │                    App.tsx                                    │ │
│  │                                                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │ │
│  │  │Firebase  │  │Reference │  │  Tab     │  │   Lazy       │ │ │
│  │  │ Auth     │──│  Data    │──│Navigator │──│ Subcomponents│ │ │
│  │  │(useEffect)│  │Listener  │  │  (state) │  │  (Suspense)  │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│              ┌───────────┼───────────┬───────────────┐           │
│              ▼           ▼           ▼               ▼           │
│  ┌──────────────┐ ┌─────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ DashboardHome│ │StudentMgmt  │ │Enrollment  │ │Attendance  │ │
│  │ (stats)      │ │(CRUD alum.) │ │Tab (inscr.)│ │Tab (asis.) │ │
│  └──────────────┘ └─────────────┘ └────────────┘ └────────────┘ │
│                                    ┌────────────┐ ┌────────────┐ │
│                                    │StudentHist │ │FacultiesTab│ │
│                                    │Tab (consul)│ │ (filtro)   │ │
│                                    └────────────┘ └────────────┘ │
│                          │                                        │
│                    ┌─────▼──────┐                                 │
│                    │FormField   │  (DRY: reusable input/select)   │
│                    └─────┬──────┘                                 │
│                    ┌─────▼──────┐                                 │
│                    │ImportModal │  (Excel/CSV → Firestore)        │
│                    └────────────┘                                 │
└──────────────────────────────────────────────────────────────────┘
         │                                    ▲
         │ Firebase Auth                      │ Firebase Auth
         │ (signInWithEmailAndPassword)       │ (onAuthStateChanged)
         ▼                                    │
┌──────────────────────────────────────────────────────────────────┐
│                     Firebase (Google Cloud)                      │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │  Auth      │  │  Firestore │  │  Hosting   │  │ Analytics  │ │
│  │ (email/pwd)│  │  (NoSQL)   │  │  (CDN)     │  │ (optional) │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                      │                                            │
│                ┌─────┴──────────────────┐                        │
│                │   Firestore Collections │                        │
│                │                         │                        │
│                │  ┌──────────┐           │                        │
│                │  │ alumnos  │ (key: dni)│                        │
│                │  ├──────────┤           │                        │
│                │  │ cursos   │ (key: id) │                        │
│                │  ├──────────┤           │                        │
│                │  │ docentes │ (key: id) │                        │
│                │  ├──────────┤           │                        │
│                │  │ fechas   │ (auto-id) │                        │
│                │  ├──────────┤           │                        │
│                │  │ facultads│ (key: id) │                        │
│                │  ├──────────┤           │                        │
│                │  │inscripc. │ (auto-id) │                        │
│                │  └──────────┘           │                        │
│                └─────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
  ┌───────────────────────┐
  │  SIGA2026.xlsm (Excel)│
  │  (datos originales)   │
  └──────────┬────────────┘
             │ node import_to_firestore.js
             ▼
  ┌──────────────────────────────────────┐
  │  Firebase Admin SDK                  │
  │  (serviceAccountKey.json)            │
  │                                      │
  │  Parse sheets: alumnos, Cursos,     │
  │  Docentes, Fechas, fac, AxC, AxC26  │
  └──────────┬───────────────────────────┘
             │ batch writes (400 docs/batch)
             ▼
  ┌──────────────────────────────────────┐
  │  Firestore (6 colecciones)           │
  └──────────┬───────────────────────────┘
             │ onSnapshot (real-time listener)
             ▼
  ┌──────────────────────────────────────┐
  │  App.tsx                             │
  │  (actualiza estado global: cursos,   │
  │   docentes, fechas, facultades)      │
  └──────────┬───────────────────────────┘
             │ props
             ▼
  ┌──────────────────────────────────────┐
  │  Componentes de tab                  │
  │  (lectura/escritura directa a        │
  │   Firestore según operación)         │
  └──────────────────────────────────────┘
```

### Capas de la Aplicación

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION                          │
│  App.tsx (layout + navegación + auth)                   │
│  Componentes (tabs con UI y estado local)              │
│  index.css (tema oscuro, responsive)                    │
├─────────────────────────────────────────────────────────┤
│                      LOGIC                               │
│  Estados locales en cada componente                     │
│  useEffect para listeners Firestore                     │
│  Validaciones en formularios (DNI, edad, campos req.)   │
│  FormField: abstracción input/select reutilizable       │
├─────────────────────────────────────────────────────────┤
│                     DATA ACCESS                          │
│  src/firebase.ts — Singleton Firebase init             │
│  Firestore directo desde cada componente (onSnapshot,   │
│  getDocs, setDoc, addDoc, updateDoc)                    │
│  src/utils/csv.ts — Export CSV centralizado             │
├─────────────────────────────────────────────────────────┤
│                   EXTERNAL SERVICES                      │
│  Firebase Auth (email/password)                         │
│  Firestore (NoSQL)                                      │
│  Firebase Hosting (SPA con rewrites)                    │
│  Firebase Analytics                                     │
└─────────────────────────────────────────────────────────┘
```

### Colecciones Firestore

| Colección        | Document ID            | Propósito                               |
| ----------------- | ---------------------- | ---------------------------------------- |
| `alumnos`       | `dni` (string)       | Datos personales de cada alumno          |
| `cursos`        | `idCurso` (number)   | Catálogo de cursos de capacitación     |
| `docentes`      | `idDocente` (number) | Docentes coordinadores                   |
| `fechas`        | auto-ID                | Fechas de inicio por curso               |
| `facultades`    | `idFac` (number)     | Facultades/dependencias                  |
| `inscripciones` | auto-ID                | Registro de inscripciones con resultados |

#### Esquema de documentos

**alumnos**

```json
{
  "dni": 12345678,
  "apellido": "GARCIA",
  "nombre": "JUAN",
  "fechaNac": "1990-05-15",
  "edad": 36,
  "telPart": "123456789",
  "nivelEstudio": "Universitario completo",
  "titulo": "Licenciatura",
  "unidadAcademica": "Facultad de Ingeniería",
  "area": "Sistemas",
  "cargoFuncion": "Analista",
  "personas": 5,
  "email": "juan@example.com",
  "telLab": "987654321",
  "interno": "123",
  "medios": ["Mail", "Teléfono"]
}
```

**inscripciones**

```json
{
  "dni": 12345678,
  "apellido": "GARCIA",
  "nombre": "JUAN",
  "curso": "Capacitación en Gestión",
  "fechaInicio": "2026-03-01",
  "resultado": "Aprobado",
  "email": "juan@example.com",
  "cargoFuncion": "Analista",
  "unidadAcademica": "Facultad de Ingeniería",
  "ua": 5,
  "idCurso": 3
}
```

**cursos**

```json
{
  "idCurso": 3,
  "curso": "Gestión Administrativa",
  "programa": "Contenido...",
  "cargaHoraria": "40 hs",
  "plan": "Plan 2026",
  "idDocente": 2,
  "expediente": "EXP-2026-123",
  "fechaPresentacion": "2026-01-15",
  "resolucion": "RES-2026-45",
  "fechaNotificacion": "2026-02-01"
}
```

### Navegación y Estados

```
                    ┌──────────────────┐
                    │   App.tsx        │
                    │                  │
                    │  authLoading?   │
                    │     ┌─ true ──► spinner │
                    │     └─ false           │
                    │        │               │
                    │   user? │              │
                    │  ┌─ null ──► Login     │
                    │  └─ User ──► Layout    │
                    │              │         │
                    │     activeTab │        │
                    │        ▼              │
                    │  ┌──────────────┐     │
                    │  │ Inicio       │     │
                    │  │ Alumnos      │     │
                    │  │ Inscripciones│     │
                    │  │ Asistencia   │     │
                    │  │ Historial    │     │
                    │  │ Facultades   │     │
                    │  └──────────────┘     │
                    └──────────────────────┘
```

### Reglas de Seguridad Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Importación de Datos (Excel → Firestore)

```
SIGA2026.xlsm
  │
  ├── alumnos (Hoja1)   ───► collection "alumnos"     (key: dni)
  ├── Cursos            ───► collection "cursos"      (key: idCurso)
  ├── Docentes          ───► collection "docentes"    (key: idDocente)
  ├── Fechas            ───► collection "fechas"      (auto-id)
  ├── fac               ───► collection "facultades"  (key: idFac)
  ├── AxC               ───► collection "inscripciones" (auto-id)
  └── AxC26             ───► (merge con AxC, sobrescribe duplicados)
```

### Componentes y Props

```
App.tsx
│
├── DashboardHome
│     props: cursosCount, facultadesCount, docentesCount
│
├── StudentManagement
│     props: facultades, activeTab
│     children: FormField, ImportModal
│
├── EnrollmentTab
│     props: cursos, fechas
│
├── AttendanceTab
│     props: cursos, fechas
│     utils: downloadCSV
│
├── StudentHistoryTab
│     props: fechas, cursos
│
└── FacultiesTab
      props: facultades
      utils: downloadCSV
```

### Flujo de Autenticación

```
                        ┌──────────────┐
                        │  Login Form  │
                        │  (email/pwd) │
                        └──────┬───────┘
                               │ signInWithEmailAndPassword
                               ▼
                        ┌──────────────┐
                        │ Firebase Auth│
                        └──────┬───────┘
                               │ onAuthStateChanged
                               ▼
                        ┌──────────────┐
                        │   App.tsx    │
                        │  setUser()   │
                        └──────┬───────┘
                               │ user != null
                               ▼
                        ┌──────────────────┐
                        │ Inicia listeners │
                        │ Firestore (4)    │
                        └──────────────────┘
```

### Manejo de Estado

| Estado                                   | Ubicación        | Tipo                |
| ---------------------------------------- | ----------------- | ------------------- |
| `user`                                 | App.tsx           | Firebase User       |
| `activeTab`                            | App.tsx           | Enum 6 tabs         |
| `cursos, docentes, fechas, facultades` | App.tsx           | Real-time Firestore |
| `studentList`                          | StudentManagement | Fetch on mount      |
| `studentForm`                          | StudentManagement | Form state          |
| `alumnosAsistencia`                    | AttendanceTab     | Query result        |
| `historialAlumno`                      | StudentHistoryTab | Query result        |
| `parsedData`                           | ImportModal       | Excel parse result  |

No hay estado global (Context/Redux/Zustand). Los datos de referencia viajan por props desde App.tsx. Los estados de cada tab son locales.