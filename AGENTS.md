# AGENTS.md — SIGA-web

## Stack & Entrypoints
- Vite 8 + React 19 + TypeScript 7 (`strict`, `bundler`, `react-jsx`, `include: ["src"]`) + Firebase 12.
- `src/main.tsx` → `ModalProvider` → `App.tsx`. `App.tsx` is the sole orchestrator: auth, theme, and all Firestore listeners.
- `src/firebase.ts` singletons `auth`/`db` with `browserLocalPersistence` + `persistentLocalCache(multipleTab)`. Do not re-init.
- No global state (no Context/Redux/Zustand except `ModalProvider`). Reference data flows via props from `App.tsx`.

## Commands (use `pnpm`, not `npm`)
- `pnpm install` — install (lockfile is `pnpm-lock.yaml`).
- `pnpm dev` — Vite dev server (`vite`).
- `pnpm build` — **must** be `tsc && vite build`. `tsc` fails on type errors; fix before Vite.
- `firebase deploy` — deploys `dist/` as SPA (`firebase.json` Hosting rewrites `** → /index.html`). Requires `pnpm build` first.
- No tests: `pnpm test` is placeholder. No lint/format script. `tsc` is the only verifier.
- Windows: `pnpm build` works; `pnpm build; firebase deploy` from `COMANDO.MD` fails in PowerShell — run separately.

## Env & Firebase (required before any Firestore work)
- Copy `.env.example` → `.env` with `VITE_FIREBASE_*` (project `siga-unt`). Missing `.env` → build succeeds but runtime Auth/Firestore fails silently.
- `serviceAccountKey.json` (gitignored) required for `node import_to_firestore.js` (reads `SIGA2026.xlsm` sheets: `alumnos`, `Cursos`, `Docentes`, `Fechas`, `fac`, `AxC`/`AxC26`). Batch writes 400/batch.
- `firestore.rules`: `cursos`/`fechas`/`noticias` public read, `alumnos`/`inscripciones` public create+read but auth-only delete/update, `docentes`/`facultades` auth-only. `usuarios/{uid}` stores `{nombre, activo}` — `activo===false` forces `signOut` + modal (`App.tsx:127`).

## Architecture & Data Flow
- `App.tsx` listeners (all `onSnapshot`): `cursos` (`docId: id`), `docentes`/`facultades` (with `MOCK_*` fallback if empty), `fechas`, `alumnos` (sorted by `apellido`), `inscripciones`. Public mode (`!user`) only fetches `cursos`+`fechas` via `getDocs`.
- Props drilling: `StudentManagement` gets `facultades, alumnos, cursos, fechas`; `EnrollmentTab`/`AttendanceTab` get `cursos, fechas` (+ `facultades, alumnos` for title-case/UA lists).
- Lazy tabs via `React.lazy`+`Suspense` (`DashboardHome`, `StudentManagement`, etc.). Changes to a tab need `pnpm build` to verify chunking.
- Theme: `data-theme` on `<html>`, persisted `siga-theme` in `localStorage`, FOUC guard in `index.html`.

## Firestore Conventions (do not change IDs)
- `alumnos` docId = `String(dni)` (enforces DNI uniqueness). `saveStudent` does `getDoc` + local `alumnos.some` check before `setDoc`; `alta` blocks if exists.
- `cursos` docId = `String(idCurso)` (auto `getNextId()` = max+1, hidden from UI). Fields: `curso` (short), `nombreCompleto`, `programa`, `cargaHoraria` (now means “Cantidad de clases”), `resolucion`, `plan`, `docenteNombre`, `idDocente`.
- `docentes` docId = `String(idDocente)`; `CoursesTab.handleSave` auto-creates docente if `docenteNombre` typed free-text (parses `apellido, nombre`, Title Cases, `max(idDocente)+1`).
- `fechas` auto-ID with `idCurso`, `curso`, `inicio`, `certificado`, `cantidadClases`.
- Never use `alert()`/`confirm()` — use `useModal()` from `src/components/ModalProvider.tsx` (`confirm({title,message,variant})` → `Promise<boolean>`, `alert({title,message,variant})` → `Promise<void>`). Provider is mounted in `main.tsx`.

## UI/Domain Gotchas (hard-earned)
- **Unidad Académica** uses fixed 33-item list (incl. `Sin dato` first) in `StudentManagement.tsx:49` + `EnrollmentTab.tsx:58` — do not derive from Firestore alone. Label is `Secr. de Rectorado/Unidad Académica` (`Celular` not `Teléfono Particular`).
- **Dirección u Oficina** (`direccionOficina`) sits after `Secr. de Rectorado/Unidad Académica` and before `Área`; placeholder `Ej: Centro de Capacitación`. Export includes it between `unidadAcademica` and `area`.
- **Cargo / Función** is a select with 7 fixed values (`Administrativo/a`, `Profesor`, `JTP/Aux. Docente`, `Técnico/Profesional`, `Mantenimiento`, `Producción`, `Servicios Grales.`) — `cargoOptions` memo includes legacy value if not in list.
- **Title Case**: names (`apellido`, `nombre`) use `src/utils/text.ts:toTitleCase` on save/import (not `toUpperCase`). Inputs no longer auto-uppercase; do not reintroduce.
- **Carga horaria → Cantidad de clases**: field `cargaHoraria` kept for back-compat; label/placeholder changed, import aliases now include `cantidad de clases`/`clases`.
- **Cursos form order**: Row1 `Programa` → `Nombre completo` → `Nombre corto`; Row2 `Cantidad de clases` → `Docente Coordinador` → `Resolución`. `Modificar Curso` dropdown shows `Programa — Nombre corto` (no `ID`, no `nombre largo`).
- **Student form reset**: `handleNewStudent` clears `searchFeedback` (moved above definition); `Limpiar Formulario` must clear badge `✓ Apellido, Nombre`.

## Verification
- After any tab/form change: `pnpm build` (not `vite` alone) to catch `tsc` errors.
- Manual smoke: login → check `facultadesOptions` datalist, `Dirección u Oficina` order, `Cargo` select, `Modificar Curso` dropdown without ID, create alumno with duplicate DNI → expect modal `DNI duplicado`.
- No CI — `firebase-tools` 15.x is the deploy path; `dist/` is hosting public dir.
