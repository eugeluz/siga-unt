# PENDIENTE — Normalizar tabla `inscriptos`

> Recordatorio de trabajo (retomar desde casa).

## Objetivo

Dejar `inscripciones` como tabla de **vínculos**, sin datos duplicados:

- `inscripciones`: solo `{ dni, idCurso, fechaId, resultado }`
  (+ `asistencias`; `apellido`/`nombre` únicamente como respaldo si el DNI
  no está en el padrón).
- `cursos`: `id_curso` + resto de la información
  (programa, nombre corto/largo, carga horaria, resolución, plan, docente…).
- `fechas`: `id_fecha | id_curso | fecha`
  (+ certificado, cantidadClases, fechasClases…).

## Regla de unicidad en `fechas`

- El **curso puede repetirse** (un curso tiene muchas fechas).
- El **par curso/fecha debe existir una sola vez**: no puede haber dos
  documentos con el mismo (`idCurso`, `inicio`).
- Deduplicar normalizando formatos primero (serial / latino / ISO → canónico)
  para no duplicar por formato.

## Tareas

1. [ ] Migración única de legacy (`curso`/`fechaInicio` embebidos) → (`idCurso`/`fechaId`).
2. [ ] Deduplicar `fechas` por par (`idCurso`, `inicio`); quedarse con la referenciada.
3. [ ] Fusionar `cursos` gemelos (mismo nombre + programa) y revincular.
4. [ ] `displayInscripcion` (join) como única vía de lectura en historial,
       reportes, exportación y constancias.
5. [ ] Exportación de inscriptos en 4 columnas (DNI, Curso, Fecha de inicio,
       Condición) resueltas por join; re-subida por Lote Histórico.
6. [ ] Verificar constancias (asistencia/aprobación) con `fechaInicio` resuelta.
7. [ ] Vaciar y recargar `inscriptos` por tandas validando el cartel
       (altas / actualizadas / omitidas / filtradas).

## Estado actual (07/09/2026)

- Historial y landing ya resuelven `fechaInicio` vía `fechaId` con fallback legacy.
- Exportación en 4 columnas con joins implementada.
- Lote x Curso aplica el Paso 1 a todas las filas; Histórico filtra por Paso 1.
- Constancias con encabezado (logo + título) y aprobación en PDF.
- La copia `WEB/` anticipa el modelo normalizado (`utils/inscripciones.ts`);
  falta portarlo/terminarlo en el `src/` canónico que se despliega.
