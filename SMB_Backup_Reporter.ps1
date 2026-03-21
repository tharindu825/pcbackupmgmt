<#
.SYNOPSIS
  SMB_Backup_Reporter.ps1 - Automated Backup Logger for Hasleo / SMB shares
  
.DESCRIPTION
  This script checks an SMB share or backup drive for recently modified files 
  to verify if Windows 10/11 PCs have successfully backed up (e.g., using Hasleo).
  It then reports successes to the PC Backup Management System API.
  Intended to be run daily via Task Scheduler on your Storage Server (192.168.1.116).

.SETUP
  1. Set $ServerIP to point to your Ubuntu Docker server.
  2. Configure $PCBackupPaths to map the "PC Name" on the dashboard to its Full SMB Path.
#>

$ServerIP = "192.168.1.8"
$ServerPort = "8787"

# ── Configuration ────────────────────────────────────────────────────────

# Map the exact 'PC Name' as seen in your web dashboard to its full Backup Share Path
$PCBackupPaths = @{
    "CTP2403" = "\\192.168.1.116\PCBackups\CTP2403\CTP2403\CTP2403_FULLBackup"
    "DESKTOP-ACCOUNTS-01" = "\\192.168.1.116\PCBackups\DESKTOP-ACCOUNTS-01"
    "WORKSTATION-DESIGN-01" = "\\192.168.1.116\PCBackups\WORKSTATION-DESIGN-01"
    # Add your other Windows 10/11 PCs and their paths here...
}

# ──────────────────────────────────────────────────────────────────────────

Write-Host "Checking SMB backup shares..."

foreach ($pcName in $PCBackupPaths.Keys) {
    $folderPath = $PCBackupPaths[$pcName]
    
    if (Test-Path $folderPath) {
        # Find the most recently modified file in the PC's backup folder
        $latestFile = Get-ChildItem -Path $folderPath -File -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($latestFile) {
            $lastWrite = $latestFile.LastWriteTime
            
            # If the file was modified in the last 48 hours, the backup succeeded!
            if ($lastWrite -ge (Get-Date).AddHours(-48)) {
                
                # Format size as human readable MB/GB
                $sizeMb = [math]::Round($latestFile.Length / 1MB, 2)
                $sizeStr = if ($sizeMb -gt 1024) { "$([math]::Round($sizeMb / 1024, 2)) GB" } else { "$sizeMb MB" }

                $payload = @{
                    pcName = $pcName
                    backupDate = $lastWrite.ToString("yyyy-MM-dd")
                    backupType = "Full"
                    method = "Hasleo Free Backup (SMB)"
                    size = $sizeStr
                    notes = "Automated file check. Latest file: $($latestFile.Name)"
                }
                
                $json = $payload | ConvertTo-Json
                try {
                    $response = Invoke-RestMethod -Uri "http://${ServerIP}:${ServerPort}/api/auto-log" -Method Post -Body $json -ContentType "application/json"
                    Write-Host "[OK] $pcName logged successfully ($sizeStr)."
                } catch {
                    Write-Host "[ERROR] Failed to send log for $pcName to API."
                }
            } else {
                Write-Host "[OVERDUE] $pcName hasn't backed up recently. Last file: $lastWrite"
            }
        } else {
            Write-Host "[EMPTY] No backup files found for $pcName in $folderPath"
        }
    } else {
        Write-Host "[MISSING] Backup folder not found: $folderPath"
    }
}

Write-Host "Done."
Write-Host ""
Read-Host "Press Enter to close this window..."
