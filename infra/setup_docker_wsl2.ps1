# ── Self-Elevating Windows Virtualization & WSL2 Setup Script ──

# Check if current session has Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Quyen Admin la bat buoc! Dang mo cua so UAC ycau quyen Administrator..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " KLTN 2026 - Kich hoat moi truong ao hoa WSL2 cho Docker    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Enable Virtual Machine Platform feature
Write-Host "`n[1/4] Kich hoat tinh nang Virtual Machine Platform..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 2. Enable Windows Subsystem for Linux (WSL) feature
Write-Host "`n[2/4] Kich hoat tinh nang Microsoft-Windows-Subsystem-Linux..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 3. Update WSL Linux Kernel & Set WSL2 Default
Write-Host "`n[3/4] Cap nhat WSL Linux Kernel & dat WSL2 lam mac dinh..." -ForegroundColor Yellow
wsl --update
wsl --set-default-version 2

# 4. Check status
Write-Host "`n[4/4] Kiem tra trang thai WSL..." -ForegroundColor Green
wsl --status

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " DA HOAN THANH KICH HOAT TINH NANG AO HOA!                 " -ForegroundColor Green
Write-Host " Vui long KHOI DONG LAI MAY TINH (Restart Windows) de      " -ForegroundColor Yellow
Write-Host " hoan tat cai dat truoc khi mo Docker Desktop.             " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Read-Host -Prompt "Nhan Enter de thoat"
