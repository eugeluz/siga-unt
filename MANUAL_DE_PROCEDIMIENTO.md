# MANUAL DE PROCEDIMIENTO Y OPERACIÓN
## SIGA 2026 — Sistema de Gestión Académica
**Centro de Capacitación y Formación - Universidad Nacional de Tucumán (UNT)**

---

### 📋 ÍNDICE DE CONTENIDOS
1. [Introducción y Alcance](#1-introducción-y-alcance)
2. [Acceso al Sistema y Roles](#2-acceso-al-sistema-y-roles)
3. [Portal Público de Inscripciones (Landing Page)](#3-portal-público-de-inscripciones-landing-page)
4. [Panel de Control (Dashboard)](#4-panel-de-control-dashboard)
5. [Gestión de Alumnos](#5-gestión-de-alumnos)
6. [Gestión de Cursos y Programas](#6-gestión-de-cursos-y-programas)
7. [Gestión de Fechas y Visibilidad Pública](#7-gestión-de-fechas-y-visibilidad-pública)
8. [Inscripciones Administrativas](#8-inscripciones-administrativas)
9. [Toma de Asistencia y Planilla de Cursos](#9-toma-de-asistencia-y-planilla-de-cursos)
10. [Control de Asistencia y Licencias del Personal](#10-control-de-asistencia-y-licencias-del-personal)
11. [Reportes por Dependencia / Facultad](#11-reportes-por-dependencia--facultad)
12. [Historial Académico y Emisión de Certificados](#12-historial-académico-y-emisión-de-certificados)
13. [Gestión de Usuarios del Sistema y Auditoría](#13-gestión-de-usuarios-del-sistema-y-auditoría)
14. [Manual Técnico: Publicación y Despliegue (Firebase / GitHub)](#14-manual-técnico-publicación-y-despliegue-firebase--github)

---

### 1. INTRODUCCIÓN Y ALCANCE

El **Sistema de Gestión Académica (SIGA 2026)** es la plataforma oficial centralizada para la administración de la oferta académica, inscripciones, asistencias, historial de capacitación y control de personal del Centro de Capacitación de la UNT.

**Objetivos Principales:**
* Reemplazar las planillas manuales de Excel por un sistema web moderno, seguro y multiusuario.
* Permitir la auto-inscripción pública y ágil de los alumnos.
* Gestionar en tiempo real el legajo académico de alumnos y nodocentes.
* Automatizar la generación de planillas de asistencia, certificados e informes institucionales en PDF y Excel.

---

### 2. ACCESO AL SISTEMA Y ROLES

El sistema cuenta con dos entornos de acceso:

1. **Entorno Público (Alumnos / Interesados):**
   * Disponible en la portada web principal.
   * No requiere clave de acceso.
   * Permite consultar cursos vigentes, descargar sus programas en PDF y registrar la inscripción pública.

2. **Entorno Administrativo / Panel de Gestión:**
   * Se accede mediante el botón **"Iniciar Sesión"** en la esquina superior derecha.
   * Requiere credenciales de usuario registrado (Email y Contraseña).
   * Los permisos se gestionan desde el módulo de *Usuarios*.

---

### 3. PORTAL PÚBLICO DE INSCRIPCIONES (LANDING PAGE)

#### Procedimiento para la Inscripción de Alumnos:
1. El alumno ingresa a la portada del sistema.
2. Visualiza las tarjetas de los **Cursos Disponibles** (solo se muestran cursos con fechas activas y visibles).
3. Si el curso cuenta con programa cargado, el alumno puede hacer clic en **"Ver Programa (PDF)"** para descargar los contenidos.
4. Al presionar **"Inscribite Ahora"** en una tarjeta o el botón superior de inscripción:
   * **Búsqueda por DNI:** Si ingresa su DNI y el alumno ya ha realizado cursos anteriormente, el sistema autocompleta todos sus datos personales.
   * **Carga de Datos:** Si es un alumno nuevo, completa: Apellido, Nombre, Fecha de Nacimiento, Teléfono Particular, Email, Nivel de Estudios, Título, Facultad/Dependencia, Área, Cargo, Personas a Cargo, Teléfono Laboral e Interno.
   * **Selección de Curso:** Elige el Curso y la Fecha de Inicio correspondiente.
   * **Encuesta de Medios:** Selecciona cómo se enteró de la capacitación.
5. Al hacer clic en **"Confirmar Inscripción"**, los datos se almacenan en la base de datos central en tiempo real.

---

### 4. PANEL DE CONTROL (DASHBOARD)

El panel inicial del administrador ofrece una vista sintética de la gestión académica:

* **Tarjetas de Métricas:** Muestran la cantidad total de Cursos de Formación, Facultades/Dependencias registradas y Alumnos Aprobados.
* **Gráfico Interactivo de Inscriptos (Donut Chart):** Permite pasar el cursor para auditar el porcentaje y cantidad exacta de alumnos según su estado (*Cursando*, *Aprobado*, *Desaprobado*, etc.).
* **Top 5 Cursos con Mayor Demanda:** Gráfico de barras horizontales con los cursos que registran mayor volumen de inscriptos.

---

### 5. GESTIÓN DE ALUMNOS

Módulo ubicado en la pestaña **Alumnos**:

#### Procedimiento de Registro y Edición:
1. **Búsqueda Rápida por DNI:** En la caja superior blanca, ingrese el DNI y presione **"Buscar DNI"**. Si existe, cargará la ficha para modificar sus datos; si no existe, preparará el formulario para dar el alta.
2. **Nuevo Alumno:** Presione el botón **"+ Nuevo Alumno"** para limpiar el formulario e ingresar un legajo nuevo.
3. **Carga de Campos Obligatorios:** Complete DNI, Apellido y Nombre. El resto de los campos son opcionales pero recomendados para la emisión de estadísticas institucional.
4. **Guardar:** Presione **"Guardar Alumno"**.

#### Importación y Exportación Masiva:
* **Importar Excel:** Presione el botón **"Importar"** (ícono de flecha descendente) para subir planillas `.xlsx` con listados masivos de alumnos.
* **Exportar Excel:** Presione **"Exportar"** (ícono de flecha saliente) para descargar todo el padrón de alumnos en formato `.xlsx`.

---

### 6. GESTIÓN DE CURSOS Y PROGRAMAS

Módulo ubicado en la pestaña **Cursos**:

#### Crear o Modificar un Curso:
1. Para crear un nuevo curso, presione **"+ Nuevo Curso"**.
2. **Selector de Programa:** Seleccione un programa existente de la lista desplegable o escriba un nombre de programa nuevo (ej. *Formación Nodocente 2026*).
3. **Nombre del Curso:** Ingrese la denominación oficial de la capacitación.
4. **Subir PDF del Plan del Curso:** Haga clic en el botón **"Subir PDF del Plan"** para adjuntar el programa analítico en formato PDF (tamaño máximo recomendado: 3 MB). Una vez subido, aparecerá la opción **"[ Ver PDF ]"** para verificar el documento.
5. **Guardar:** Presione el botón celeste institucional **"Guardar Curso"**.

---

### 7. GESTIÓN DE FECHAS Y VISIBILIDAD PÚBLICA

Módulo ubicado en la pestaña **Fechas**:

#### Procedimiento para Registrar Fechas de Cursos:
1. En la franja superior horizontal:
   * Filtre opcionalmente por **Programa**.
   * Seleccione el **Curso**.
   * Ingrese la **Fecha de Inicio** y la **Fecha de Certificado**.
2. Presione **"+ Registrar Fecha"**.

#### Control de Visibilidad en la Portada Pública (Ojo de Publicación):
En la tabla del listado de fechas registradas, cada fila posee en la columna **Acciones** el botón de visibilidad:
* 👁️ **Ojo Verde (Activado):** Indica que la fecha del curso es **Visible** en la página pública de inscripción.
* 👁️‍🗨️ **Ojo Rojo (Desactivado):** Al hacer clic, cambia el estado a **Oculto**, impidiendo que los alumnos se inscriban a esa fecha desde la portada pública.

---

### 8. INSCRIPCIONES ADMINISTRATIVAS

Módulo ubicado en la pestaña **Inscripciones**:

* Permite matricular manualmente a un alumno registrado en una fecha de curso activa.
* **Cambio de Estado Académico:** Seleccione a un alumno y actualice su condición:
  * `Cursando`
  * `Aprobado`
  * `Desaprobado`
  * `Cancelado`
* **Exportar:** Descargue el padrón de inscriptos del curso seleccionado a Excel mediante el botón **"Exportar"**.

---

### 9. TOMA DE ASISTENCIA Y PLANILLA DE CURSOS

Módulo ubicado en la pestaña **Asistencia**:

#### Procedimiento de Control de Clases:
1. Seleccione el **Curso** y la **Fecha de Inicio**.
2. El listado de alumnos se ordenará automáticamente de forma alfabética **(A-Z por Apellido y Nombre)**.
3. Ingrese la **Fecha de Clase** mediante el selector de calendario.
4. Marque los casilleros de asistencia correspondiente a cada alumno.
5. **Imprimir Planilla en PDF:** Haga clic en **"Imprimir Planilla PDF"**. El sistema generará un documento institucional oficial con el logo del Centro, encabezado separado de curso y fechas, preparado para firmas físicas.
6. **Exportar a CSV:** Use el botón **"Exportar CSV"** con ícono saliente para descargar las asistencias a hoja de cálculo.

---

### 10. CONTROL DE ASISTENCIA Y LICENCIAS DEL PERSONAL

Módulo ubicado en la pestaña **Personal**:

#### Planilla Diaria y Firmas del Personal:
* Seleccione la fecha de trabajo.
* Marque el casillero de **Turno Tarde** para aquellos empleados que asistan en dicho horario.
* **Imprimir Planilla PDF:** Al presionar **"Imprimir Planilla"**, se emite la planilla oficial con espacio para firmas físicas y la sección especial para el Turno Tarde.
  * *Nota de Privacidad:* Por normativa de confidencialidad, **los motivos específicos de las licencias o faltas NUNCA se imprimen en la planilla de asistencia en papel**, garantizando la privacidad del personal.

#### Registro de Licencias e Inasistencias:
1. Presione **"Registrar Falta"**.
2. Seleccione al empleado y el **Motivo** (*Razones particulares*, *Lic. Enfermedad*, *Vacaciones*, *Paro*, etc.).
3. Para licencias por rango, ingrese las fechas **Desde** y **Hasta**. El sistema calculará automáticamente la cantidad de días corridos.
4. Presione **"Confirmar Falta"**.
5. **Historial de Inasistencias:** Haga clic en el botón **"Ver Historial"** en la fila del empleado para auditar el total de días acumulados por motivo y eliminar faltas cargadas por error.

---

### 11. REPORTES POR DEPENDENCIA / FACULTAD

Módulo ubicado en la pestaña **Facultades**:

* Permite auditar y filtrar el impacto del Centro de Capacitación en cada Unidad Académica o Facultad de la UNT.
* **Filtros:** Seleccione la Facultad deseada para listar todos los nodocentes y alumnos capacitados pertenecientes a esa área.
* **Exportación:** Emita el informe en PDF (**"Imprimir Reporte PDF"**) o exporte los datos a Excel (**"Exportar CSV"**).

---

### 12. HISTORIAL ACADÉMICO Y EMISIÓN DE CERTIFICADOS

Módulo ubicado en la pestaña **Historial Alumnos**:

1. Ingrese el DNI o Apellido del alumno en el buscador.
2. Visualice la trayectoria completa de cursos realizados, fechas y calificaciones obtenidas.
3. **Emisión de Certificado:** Presione **"Imprimir Certificado PDF"** para generar la constancia oficial firmada institucionalmente con los cursos aprobados por el estudiante.

---

### 13. GESTIÓN DE USUARIOS DEL SISTEMA Y AUDITORÍA

Módulo ubicado en la pestaña **Usuarios**:

#### Alta de Usuarios Administradores / Operadores:
* En la franja superior compacta, complete: **Legajo**, **Nombre y Apellido**, **Email**, **Categoría** y **Contraseña**.
* Presione **"Crear Usuario"**.

#### Control de Permisos y Auditoría:
* En la tabla de usuarios registrados, active o desactive usuarios según su permanencia.
* Consulte el **Registro de Auditoría** en la parte inferior para inspeccionar la trazabilidad de acciones (altas de inscriptos, faltas registradas, planillas impresas, etc.) con fecha, hora y usuario ejecutor.

---

### 14. MANUAL TÉCNICO: PUBLICACIÓN Y DESPLIEGUE (FIREBASE / GITHUB)

Para el administrador del sistema informático o encargado de desarrollo, los comandos para compilar y desplegar actualizaciones son los siguientes:

#### A. Publicar Cambios en Firebase (Servidor de Producción):
Abra la consola de comandos de PowerShell en la carpeta raíz del proyecto (`SIGA-web`) y ejecute secuencialmente:

```bash
pnpm build
firebase deploy
```
*Una vez finalizado, la aplicación quedará actualizada en la web.*

#### B. Guardar Versión en el Repositorio GitHub:
Para resguardar los cambios en la nube de GitHub, ejecute las siguientes líneas una por una:

```bash
git add .
git commit -m "Actualización de sistema SIGA 2026"
git push -f origin main
```

> **IMPORTANTE:** El comando `git add .` lleva obligatoriamente un espacio y un punto al final.

---
*Manual elaborado para la Universidad Nacional de Tucumán - SIGA 2026.*
