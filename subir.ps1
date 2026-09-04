param(
    [string]$msg = "feat: actualizacion"
)

$ErrorActionPreference = "Stop"

Write-Host "`n>>> 1/3: Guardando en Git y subiendo a GitHub..." -ForegroundColor Cyan
git add .
$changes = git status --porcelain
if ($changes) {
    git commit -m $msg
    git push origin main
} else {
    Write-Host "No hay cambios de codigo pendientes. Asegurando push a origin/main..." -ForegroundColor Yellow
    git push origin main
}

Write-Host "`n>>> 2/3: Compilando proyecto..." -ForegroundColor Cyan
pnpm build

Write-Host "`n>>> 3/3: Desplegando a Firebase..." -ForegroundColor Cyan
firebase deploy

Write-Host "`n>>> ¡Todo completado con exito!" -ForegroundColor Green
