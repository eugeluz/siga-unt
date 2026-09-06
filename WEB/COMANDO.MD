# Comandos de Despliegue y Git

### 🚀 Subir todo automáticamente (Git + Firebase)
En una sola línea hace: `git add` + `git commit` + `git push` + `pnpm build` + `firebase deploy`:

```bash
pnpm subir
```
*Opcional con mensaje personalizado:*
```powershell
.\subir.ps1 "feat: descripcion del cambio"
```

---

### Solo desplegar a Firebase:
```bash
pnpm deploy
```

---

### Solo subir a GitHub:
```bash
git add .
git commit -m "feat: descripcion del cambio"
git push origin main
```